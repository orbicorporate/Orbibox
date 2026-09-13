import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { BottomNav } from "@/components/mobile/BottomNav";
import { AdminOrbiFloating } from "./AdminOrbiFloating";
import { AppHeader } from "@/components/mobile/AppHeader";
import { getBusinessProgress } from "@/lib/progress";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { ReferralCelebration } from "./ReferralCelebration";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Rede de segurança pra indicação: se a pessoa entrou por um link /r/CODIGO
  // (cookie ainda válido) e ainda não foi registrada, registra agora. A função
  // ignora auto-indicação e duplicados, então é seguro chamar toda vez.
  {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    const ref = jar.get("orbi_ref")?.value;
    if (ref) {
      await supabase.rpc("register_referral", { p_code: ref });
      jar.delete("orbi_ref");
    }
  }

  // Se o e-mail dele bate com um convite de administrador pendente, vincula
  // agora — precisa da service role porque, antes de vinculado, a política de
  // RLS ainda não deixa esse usuário enxergar a própria linha do convite.
  if (user.email) {
    const service = createServiceClient();
    await service
      .from("business_admins")
      .update({ user_id: user.id, accepted_at: new Date().toISOString() })
      .eq("email", user.email.toLowerCase())
      .is("user_id", null);
  }

  let { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, tour_completed_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Não é dono de nenhum negócio, mas pode ter sido convidado como
  // administrador de um — busca pelo vínculo em vez do owner_id.
  if (!business) {
    const { data: membership } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membership) {
      const { data: memberBusiness } = await supabase
        .from("businesses")
        .select("id, name, slug, tour_completed_at")
        .eq("id", membership.business_id)
        .maybeSingle();
      business = memberBusiness;
    }
  }

  if (!business) redirect("/onboarding");

  // Contagem de conversas não vistas — mostrada como bolinha no sino, ao lado
  // do ícone de configurações, em todas as telas do painel (não só no Today).
  const { count: unseenConversas } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("seen_by_owner", false);

  // Notificações não lidas do usuário (ex: prêmio de indicação) — somam no sino.
  const { count: unseenNotifs } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("seen_at", null);

  // Comemoração pendente: a primeira notificação `celebrate` ainda não vista.
  // Vira uma tela cheia de festa quando a pessoa entra no painel.
  const { data: celebrateNotif } = await supabase
    .from("notifications")
    .select("id, title, body")
    .eq("user_id", user.id)
    .eq("celebrate", true)
    .is("seen_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const headerProgress = await getBusinessProgress(business.id);

  // Dados pra Orbi flutuante do painel: plano (define o comportamento) + o que
  // ela precisa pra o teste (nome, cores, produtos, endereço).
  const { getAccessInfoForBusiness } = await import("@/lib/plans");
  const adminAccess = await getAccessInfoForBusiness(business.id);
  const { data: adminAgentCfg } = await supabase.from("agent_configs").select("agent_name, orbi_colors").eq("business_id", business.id).maybeSingle();
  const adminOrbiColors = Array.isArray(adminAgentCfg?.orbi_colors) && adminAgentCfg.orbi_colors.length >= 2 ? (adminAgentCfg.orbi_colors as string[]) : null;
  const { data: adminBiz } = await supabase.from("businesses").select("address").eq("id", business.id).maybeSingle();
  const { data: adminProducts } = await supabase.from("content_items").select("id, title, price, price_type, price_max, image_url, link_kind, target_url").eq("business_id", business.id).eq("status", "published").limit(20);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background-main">
      <AppHeader unseenConversas={(unseenConversas ?? 0) + (unseenNotifs ?? 0)} progressPct={headerProgress.pct} />
      {celebrateNotif && (
        <ReferralCelebration id={celebrateNotif.id} title={celebrateNotif.title} body={celebrateNotif.body ?? ""} />
      )}
      <main className="admin-zoom flex-1 px-6 pb-32 pt-5">{children}</main>
      <BottomNav />
      <AdminOrbiFloating
        businessId={business.id}
        hasAiChat={adminAccess.hasAiChat}
        agentName={adminAgentCfg?.agent_name ?? "Orbi"}
        orbiColors={adminOrbiColors}
        address={adminBiz?.address ?? null}
        products={adminProducts ?? []}
      />
      <Suspense fallback={null}>
        <TourOverlay businessId={business.id} />
      </Suspense>
    </div>
  );
}
