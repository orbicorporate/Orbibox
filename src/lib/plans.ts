import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type PlanId = "titanio" | "niobio";
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

// Status que contam como "acesso liberado" — trial ativo, pago em dia, ou concedido manualmente.
const ACTIVE_STATUSES = new Set(["trialing", "active", "comped"]);

export interface AccessInfo {
  subscription: Subscription | null;
  plan: Plan | null;
  isActive: boolean;
  isTrialing: boolean;
  hasAiChat: boolean;
  maxBusinesses: number;
  trialEndsAt: string | null;
}

// Sem assinatura = trata como Titânio bloqueado (sem chat, 1 negócio) até o
// onboarding de cobrança rodar. Evita null-checks espalhados pelo app.
const NO_ACCESS: AccessInfo = {
  subscription: null,
  plan: null,
  isActive: false,
  isTrialing: false,
  hasAiChat: false,
  maxBusinesses: 1,
  trialEndsAt: null,
};

export async function getAccessInfo(ownerId: string): Promise<AccessInfo> {
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!subscription) return NO_ACCESS;

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", subscription.plan_id)
    .maybeSingle();

  const isActive = ACTIVE_STATUSES.has(subscription.status);
  const isTrialing = subscription.status === "trialing";

  return {
    subscription,
    plan,
    isActive,
    isTrialing,
    // No teste de 3 dias a pessoa sente o potencial completo (Titânio +
    // Nióbio juntos), independente de qual plano ela selecionou no checkout.
    hasAiChat: isTrialing ? true : isActive && (plan?.has_ai_chat ?? false),
    maxBusinesses: isTrialing ? 999 : isActive ? (plan?.max_businesses ?? 1) : 1,
    trialEndsAt: subscription.trial_ends_at,
  };
}

// Usado na página pública do visitante — ali quem está logado (se alguém
// estiver) não é o dono, então a leitura via RLS normal não enxergaria a
// assinatura do dono. Precisa da service role.
export async function getOwnerHasAiChat(ownerId: string): Promise<boolean> {
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = createServiceClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, plan_id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (!subscription || !ACTIVE_STATUSES.has(subscription.status)) return false;
  if (subscription.status === "trialing") return true; // teste dá acesso completo

  const { data: plan } = await supabase
    .from("plans")
    .select("has_ai_chat")
    .eq("id", subscription.plan_id)
    .maybeSingle();

  return plan?.has_ai_chat ?? false;
}

export async function getAllPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").order("monthly_price_cents");
  return data ?? [];
}
