import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type PlanId = "titanio" | "niobio";
export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

// Status que contam como "acesso liberado", trial ativo, pago em dia, ou concedido manualmente.
const ACTIVE_STATUSES = new Set(["trialing", "active", "comped"]);

export interface AccessInfo {
  subscription: Subscription | null;
  plan: Plan | null;
  isActive: boolean;
  isTrialing: boolean;
  hasAiChat: boolean;
  hasVouchers: boolean;
  maxBusinesses: number;
  trialEndsAt: string | null;
  /** Teste grátis que começou sem cartão (ainda não passou pelo Stripe). */
  testeSemCartao: boolean;
  /** Teste sem cartão que já acabou: hora de mostrar o que o Orbibox fez. */
  testeAcabou: boolean;
  /** Dias inteiros que faltam no teste (0 no último dia). */
  diasRestantes: number | null;
}

// Sem assinatura = trata como Titânio bloqueado (sem chat, 1 negócio) até o
// onboarding de cobrança rodar. Evita null-checks espalhados pelo app.
const NO_ACCESS: AccessInfo = {
  subscription: null,
  plan: null,
  isActive: false,
  isTrialing: false,
  hasAiChat: false,
  hasVouchers: false,
  maxBusinesses: 1,
  trialEndsAt: null,
  testeSemCartao: false,
  testeAcabou: false,
  diasRestantes: null,
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

  const testeSemCartao = subscription.status === "trialing" && !subscription.stripe_subscription_id;
  const fimTeste = subscription.trial_ends_at ? new Date(subscription.trial_ends_at).getTime() : null;
  const agora = Date.now();
  const testeAcabou = testeSemCartao && fimTeste != null && fimTeste < agora;
  const isActive = ACTIVE_STATUSES.has(subscription.status) && !testeAcabou;
  const isTrialing = subscription.status === "trialing" && !testeAcabou;
  const diasRestantes = isTrialing && fimTeste != null ? Math.max(0, Math.floor((fimTeste - agora) / 86400000)) : null;

  return {
    subscription,
    plan,
    isActive,
    isTrialing,
    // No teste grátis a pessoa sente o potencial completo (Titânio +
    // Nióbio juntos), independente de qual plano ela selecionou no checkout.
    hasAiChat: isTrialing ? true : isActive && (plan?.has_ai_chat ?? false),
    hasVouchers: isTrialing ? true : isActive && (plan?.has_vouchers ?? false),
    maxBusinesses: isTrialing ? 999 : isActive ? (plan?.max_businesses ?? 1) : 1,
    trialEndsAt: subscription.trial_ends_at,
    testeSemCartao,
    testeAcabou,
    diasRestantes,
  };
}

// Usado na página pública do visitante, ali quem está logado (se alguém
// estiver) não é o dono, então a leitura via RLS normal não enxergaria a
// assinatura do dono. Precisa da service role.
async function getOwnerFeatureAccess(ownerId: string, feature: "has_ai_chat" | "has_vouchers"): Promise<boolean> {
  // Usa uma função no banco (security definer) via cliente normal, não
  // depende mais da service role key, que estava fazendo o chat sumir na
  // página pública quando a env não carregava direito.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("owner_has_feature", { p_owner_id: ownerId, p_feature: feature });
  if (error) {
    console.error("owner_has_feature error:", error.message);
    return false;
  }
  return data === true;
}

export function getOwnerHasAiChat(ownerId: string): Promise<boolean> {
  return getOwnerFeatureAccess(ownerId, "has_ai_chat");
}

export function getOwnerHasVouchers(ownerId: string): Promise<boolean> {
  return getOwnerFeatureAccess(ownerId, "has_vouchers");
}

// Um administrador convidado está logado com o próprio user_id, não o do
// dono, então checar plano por user_id direto sempre daria "sem acesso"
// pra ele. Resolve pelo dono de verdade do negócio antes de checar.
export async function getAccessInfoForBusiness(businessId: string): Promise<AccessInfo> {
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("owner_id").eq("id", businessId).maybeSingle();
  if (!business) return NO_ACCESS;
  return getAccessInfo(business.owner_id);
}

export async function getAllPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").order("monthly_price_cents");
  return data ?? [];
}
