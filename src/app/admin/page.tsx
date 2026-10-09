import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { getBusinessProgress } from "@/lib/progress";
import { getPendingInsights } from "@/lib/insights";
import { proximaData } from "@/lib/datasComemorativas";
import { getAccessInfo } from "@/lib/plans";
import { calcularOportunidade, calcularSemana } from "@/lib/copiloto";
import { HomeView } from "./HomeView";

// Saudação pela hora de Brasília, onde está quem usa o painel.
function saudacaoDoMomento(): string {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  return hora < 5 ? "Boa noite" : hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

export default async function HojePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const { data: business } = await supabase.from("businesses").select("*").eq("id", businessId!).limit(1).single();
  const b = business!;

  const [visitsRes, convRowsRes, actionsRes, activeBoxesRes, giftsRes, perguntasRes, vouchersRes, acesso, perfilRes, agenteRes, resgatesRes] = await Promise.all([
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", b.id),
    supabase.from("conversations").select("id").eq("business_id", b.id),
    supabase.from("click_events").select("id", { count: "exact", head: true }).eq("business_id", b.id),
    supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", b.id).eq("is_active", true),
    supabase.from("gift_cards").select("id, value_cents, from_name, to_name").eq("business_id", b.id).eq("status", "pending").order("created_at", { ascending: true }).limit(5),
    supabase.from("orbi_learnings").select("id, pergunta, vezes").eq("business_id", b.id).eq("status", "pendente").order("vezes", { ascending: false }).limit(3),
    supabase.from("vouchers").select("id, title, quantity_total, quantity_claimed").eq("business_id", b.id).eq("is_active", true),
    getAccessInfo(b.owner_id),
    supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    supabase.from("agent_configs").select("orbi_colors").eq("business_id", b.id).maybeSingle(),
    supabase.from("voucher_redemptions").select("id", { count: "exact", head: true }).eq("business_id", b.id),
  ]);
  const activeBoxes = activeBoxesRes.count ?? 0;

  const [progress, insightsQueue, semana] = await Promise.all([
    getBusinessProgress(b.id),
    getPendingInsights(b.id),
    calcularSemana(supabase, b.id),
  ]);

  const oportunidade = await calcularOportunidade(supabase, {
    businessId: b.id,
    slug: b.slug,
    criadoEm: b.created_at,
    botoesAtivos: activeBoxes,
    hasVouchers: acesso.hasVouchers,
    hasAiChat: acesso.hasAiChat,
    pendencia: insightsQueue[0] ?? null,
  });

  // Conversas reais (com mensagem do visitante), pros marcos.
  const convIds = (convRowsRes.data ?? []).map((c) => c.id);
  let realConvs = 0;
  if (convIds.length > 0) {
    const { data: msgRows } = await supabase.from("messages").select("conversation_id").in("conversation_id", convIds).eq("role", "visitor");
    realConvs = new Set((msgRows ?? []).map((m) => m.conversation_id)).size;
  }

  const dataProxima = proximaData();
  const vouchersBaixos = (vouchersRes.data ?? [])
    .map((v) => ({ id: v.id, title: v.title, quantity_total: v.quantity_total, restam: v.quantity_total - v.quantity_claimed }))
    .filter((v) => v.restam <= 3)
    .slice(0, 2);

  // Link público sempre pelo domínio de produção (URLs de deploy são protegidas).
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || (await headers()).get("host") || "orbibox-orbi-app.vercel.app";
  const proto = host.includes("localhost") ? "http" : "https";
  const shareUrl = `${proto}://${host}/${b.slug}`;
  const temCapa = !!b.share_image_url || !!b.vitrine_cover_url || (Array.isArray(b.vitrine_cover_urls) && b.vitrine_cover_urls.length > 0) || !!b.logo_url;
  const shareReady = !!b.share_description?.trim() && temCapa;
  const shareTitle = `${b.name}, Orbibox`;

  const nomeCompleto = perfilRes.data?.full_name || (user!.user_metadata?.full_name as string | undefined) || "";
  const primeiroNome = nomeCompleto.trim().split(/\s+/)[0] || null;
  const orbiColors = Array.isArray(agenteRes.data?.orbi_colors) && agenteRes.data.orbi_colors.length >= 2 ? (agenteRes.data.orbi_colors as string[]) : null;

  const numeros = [
    { rotulo: "Visitas", n: semana.visitas, antes: semana.visitasAntes, href: "/admin/pulse" },
    { rotulo: "Conversas", n: semana.conversas, antes: semana.conversasAntes, href: "/admin/conversas" },
    { rotulo: "Contatos", n: semana.contatos, antes: semana.contatosAntes, href: "/admin/conversas" },
    { rotulo: "Conversões", n: semana.conversoes, antes: semana.conversoesAntes, href: "/admin/pulse" },
  ];

  return (
    <HomeView
      saudacao={saudacaoDoMomento()}
      primeiroNome={primeiroNome}
      b={{ id: b.id, name: b.name, slug: b.slug }}
      shareUrl={shareUrl}
      shareTitle={shareTitle}
      shareReady={shareReady}
      teste={acesso.testeSemCartao && acesso.diasRestantes != null ? { dias: acesso.diasRestantes } : null}
      oportunidade={oportunidade}
      proxima={{
        businessId: b.id,
        hasVouchers: acesso.hasVouchers,
        gifts: giftsRes.data ?? [],
        perguntas: perguntasRes.data ?? [],
        data: dataProxima ? { id: dataProxima.id, nome: dataProxima.nome, dias: dataProxima.dias, clima: dataProxima.clima } : null,
        vouchersBaixos,
      }}
      marcos={{ visitas: visitsRes.count ?? 0, acoes: actionsRes.count ?? 0, conversas: realConvs, resgates: resgatesRes.count ?? 0 }}
      numeros={numeros}
      orbiColors={orbiColors}
      progressoPct={progress.pct}
      mostrarConvite={!acesso.subscription || acesso.subscription.status === "trialing"}
      passoFaltando={insightsQueue[0] ? { title: insightsQueue[0].title, ctaLabel: insightsQueue[0].ctaLabel, href: insightsQueue[0].href } : null}
      pendencias={insightsQueue.map((i) => ({ title: i.title, href: i.href }))}
    />
  );
}
