import type { SupabaseClient } from "@supabase/supabase-js";

// O que o Orbibox fez de verdade desde que foi criado. Alimenta o paywall
// ("Seu Orbibox trabalhou por você") e o aviso de fim de teste na home.
export type ValorEntregue = {
  visitas: number;
  produtos: number;
  conversas: number;
  whatsapp: number;
  contatos: number;
  resgates: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function calcularValorEntregue(supabase: SupabaseClient<any>, businessId: string, desde?: string | null): Promise<ValorEntregue> {
  const ini = desde ?? "1970-01-01T00:00:00Z";
  const [vis, prod, wa, leads, res, convs] = await Promise.all([
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("started_at", ini),
    supabase.from("click_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("kind", "produto").gte("created_at", ini),
    supabase.from("click_events").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("kind", "whatsapp").gte("created_at", ini),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("created_at", ini),
    supabase.from("voucher_redemptions").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("created_at", ini),
    supabase.from("conversations").select("id").eq("business_id", businessId).gte("started_at", ini).limit(2000),
  ]);
  const ids = ((convs.data ?? []) as { id: string }[]).map((c) => c.id);
  let conversas = 0;
  if (ids.length) {
    const { data: msgs } = await supabase.from("messages").select("conversation_id").in("conversation_id", ids).eq("role", "visitor");
    conversas = new Set(((msgs ?? []) as { conversation_id: string }[]).map((m) => m.conversation_id)).size;
  }
  return {
    visitas: vis.count ?? 0,
    produtos: prod.count ?? 0,
    conversas,
    whatsapp: wa.count ?? 0,
    contatos: leads.count ?? 0,
    resgates: res.count ?? 0,
  };
}

/** Linhas prontas pra mostrar, só as que aconteceram. */
export function linhasDoValor(v: ValorEntregue): { n: number; texto: string; chave: string }[] {
  const l: { n: number; texto: string; chave: string }[] = [
    { n: v.visitas, chave: "visitas", texto: v.visitas === 1 ? "pessoa visitou seu Orbibox" : "pessoas visitaram seu Orbibox" },
    { n: v.produtos, chave: "produtos", texto: v.produtos === 1 ? "vez que um produto seu foi aberto" : "vezes que um produto seu foi aberto" },
    { n: v.conversas, chave: "conversas", texto: v.conversas === 1 ? "pessoa conversou com sua IA" : "pessoas conversaram com sua IA" },
    { n: v.whatsapp, chave: "whatsapp", texto: v.whatsapp === 1 ? "chamou no seu WhatsApp" : "chamaram no seu WhatsApp" },
    { n: v.contatos, chave: "contatos", texto: v.contatos === 1 ? "novo contato capturado" : "novos contatos capturados" },
    { n: v.resgates, chave: "resgates", texto: v.resgates === 1 ? "oferta pega" : "ofertas pegas" },
  ];
  return l.filter((x) => x.n > 0);
}
