import type { SupabaseClient } from "@supabase/supabase-js";

// Resumo da semana em português de gente: o que aconteceu no link nos
// últimos 7 dias, comparado com a semana anterior, e uma dica do que fazer.
// Usado em Resultados e no e-mail de segunda-feira.
export type ResumoSemanal = {
  visitas: number;
  visitasAntes: number;
  acoes: number;
  whatsapp: number;
  frases: string[];
  dica: { texto: string; href: string; rotulo: string };
};

const DIA = 24 * 60 * 60 * 1000;

function nomeOrigem(raw: string | null): string {
  const s = (raw || "").toLowerCase();
  if (!s || s === "direct" || s === "direto") return "link direto";
  if (s.includes("instagram")) return "Instagram";
  if (s.includes("whatsapp") || s.includes("wa.me")) return "WhatsApp";
  if (s.includes("google")) return "Google";
  if (s.includes("facebook")) return "Facebook";
  if (s.includes("tiktok")) return "TikTok";
  return raw!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function calcularResumoSemanal(supabase: SupabaseClient<any>, businessId: string): Promise<ResumoSemanal> {
  const agora = Date.now();
  const ini = new Date(agora - 7 * DIA).toISOString();
  const iniAntes = new Date(agora - 14 * DIA).toISOString();

  const [sessoes, sessoesAntes, cliques, itens] = await Promise.all([
    supabase.from("visitor_sessions").select("source").eq("business_id", businessId).gte("started_at", ini).limit(5000),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("started_at", iniAntes).lt("started_at", ini),
    supabase.from("click_events").select("kind, content_item_id").eq("business_id", businessId).gte("created_at", ini).limit(5000),
    supabase.from("content_items").select("id, title").eq("business_id", businessId),
  ]);

  const listaSessoes = (sessoes.data ?? []) as { source: string | null }[];
  const visitas = listaSessoes.length;
  const visitasAntes = sessoesAntes.count ?? 0;
  const listaCliques = (cliques.data ?? []) as { kind: string; content_item_id: string | null }[];
  const acoes = listaCliques.length;
  const whatsapp = listaCliques.filter((c) => c.kind === "whatsapp").length;

  const porItem: Record<string, number> = {};
  for (const c of listaCliques) if (c.content_item_id) porItem[c.content_item_id] = (porItem[c.content_item_id] ?? 0) + 1;
  const topId = Object.entries(porItem).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topTitulo = topId ? ((itens.data ?? []) as { id: string; title: string }[]).find((i) => i.id === topId)?.title ?? null : null;

  const porOrigem: Record<string, number> = {};
  for (const s of listaSessoes) {
    const o = nomeOrigem(s.source);
    porOrigem[o] = (porOrigem[o] ?? 0) + 1;
  }
  const [origemTop, origemQtd] = Object.entries(porOrigem).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];

  const frases: string[] = [];
  if (visitas === 0) {
    frases.push("Ninguém abriu seu link nos últimos 7 dias.");
  } else {
    let comp = "";
    if (visitasAntes > 0) {
      const dif = Math.round(((visitas - visitasAntes) / visitasAntes) * 100);
      comp = dif > 0 ? `, ${dif}% a mais que na semana anterior` : dif < 0 ? `, ${Math.abs(dif)}% a menos que na semana anterior` : ", igual à semana anterior";
    }
    frases.push(`${visitas} ${visitas === 1 ? "pessoa abriu" : "pessoas abriram"} seu link nos últimos 7 dias${comp}.`);
    if (acoes > 0) {
      frases.push(`${acoes} ${acoes === 1 ? "vez tocaram" : "vezes tocaram"} em algo${whatsapp > 0 ? `, e ${whatsapp} ${whatsapp === 1 ? "foi" : "foram"} pro seu WhatsApp` : ""}.`);
    } else {
      frases.push("Ninguém tocou em nenhum botão ainda.");
    }
    if (topTitulo) frases.push(`O mais procurado foi “${topTitulo}”.`);
    if (origemTop && origemQtd / visitas >= 0.4) frases.push(`A maioria chegou pelo ${origemTop}.`);
  }

  let dica: ResumoSemanal["dica"];
  if (visitas === 0) {
    dica = { texto: "Mande o link pra 10 clientes no WhatsApp e coloque na bio do Instagram. É o jeito mais rápido de ter as primeiras visitas.", href: "/admin", rotulo: "Compartilhar meu link" };
  } else if (acoes / visitas < 0.2) {
    dica = { texto: "Muita gente olha e pouca gente toca. Deixe o WhatsApp ou o Catálogo como primeiro botão da página.", href: "/admin/boxes", rotulo: "Organizar botões" };
  } else if (topTitulo) {
    dica = { texto: `“${topTitulo}” está chamando atenção. Um voucher pra ele pode transformar curiosidade em venda.`, href: "/admin/vouchers?novo=1", rotulo: "Criar voucher" };
  } else if (origemTop === "Instagram") {
    dica = { texto: "O Instagram está trazendo gente. Repita o link nos stories esta semana.", href: "/admin", rotulo: "Compartilhar de novo" };
  } else {
    dica = { texto: "Está funcionando. Mantenha o catálogo com fotos e preços atualizados pra quem volta.", href: "/admin/vitrine", rotulo: "Revisar catálogo" };
  }

  return { visitas, visitasAntes, acoes, whatsapp, frases, dica };
}
