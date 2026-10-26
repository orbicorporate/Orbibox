import type { SupabaseClient } from "@supabase/supabase-js";

/** O que o plano grátis mantém no ar. O resto o dono desativa na tela "Escolha o que fica". */
export const LIMITES_GRATIS = { bolinhas: 3, boxes: 4, fotos: 7 } as const;

/**
 * Estado do plano grátis, guardado em businesses.plano_gratis (jsonb).
 * Nada é apagado: o que o dono desativa fica listado aqui e volta quando ele assina.
 */
export type DestaqueGuardado = { t: string; id: string; p?: number; logo?: string | null };
export type PlanoGratis = {
  feito: boolean;
  em?: string;
  desativados?: { boxes?: string[]; destaques?: DestaqueGuardado[]; fotos?: string[] };
};

export function lerPlanoGratis(raw: unknown): PlanoGratis | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as PlanoGratis;
  return { feito: !!r.feito, em: r.em, desativados: r.desativados };
}

/** Caixas que o plano grátis nunca mantém (vouchers, gift, IA, PDFs), vistas pelo tipo e pela ação. */
export function caixaBloqueadaNoGratis(b: { box_type: string; config?: unknown }): boolean {
  if (b.box_type === "campaign" || b.box_type === "agent") return true;
  const cfg = b.config as { action?: string; url?: string } | null;
  const acao = cfg?.action;
  // Botão de link que abre um PDF guardado no Orbibox.
  if (acao === "link" && typeof cfg?.url === "string" && cfg.url.includes("/object/public/cardapios-pdf/")) return true;
  return acao === "cupom" || acao === "gift" || acao === "materiais" || acao === "zara";
}

/**
 * Quando o dono volta a ter plano pago, liga de novo o que o grátis desativou.
 * Roda no painel (layout) sempre que há registro e o acesso está ativo.
 */
export async function restaurarPlanoGratis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  businessId: string,
  plano: PlanoGratis,
): Promise<void> {
  const d = plano.desativados;
  if (d?.boxes?.length) await supabase.from("smart_boxes").update({ is_active: true }).in("id", d.boxes).eq("business_id", businessId);
  if (d?.destaques?.length) {
    const { data } = await supabase.from("businesses").select("home_destaques").eq("id", businessId).maybeSingle();
    const atuais = Array.isArray(data?.home_destaques) ? (data!.home_destaques as DestaqueGuardado[]) : [];
    const ja = new Set(atuais.map((x) => `${x.t}:${x.id}`));
    const voltam = d.destaques.filter((x) => !ja.has(`${x.t}:${x.id}`));
    await supabase.from("businesses").update({ home_destaques: [...atuais, ...voltam] }).eq("id", businessId);
  }
  await supabase.from("businesses").update({ plano_gratis: null }).eq("id", businessId);
}

export type CandidatoGratis = { chave: string; titulo: string; sub?: string; foto?: string | null };
export type EscolhaHome = { bolinhas: CandidatoGratis[]; destaques: CandidatoGratis[]; bloqueados: string[] };

type CaixaLite = { id: string; box_type: string; title: string | null; is_active: boolean; position: number; config: unknown };
type ItemLite = { id: string; title: string | null; image_url: string | null };

/**
 * Separa o que a página inicial mostra hoje em: bolinhas, boxes de destaque e o que o plano grátis nunca mantém.
 * Chaves: box:<id> e item_bolinha:<id> (bolinhas); botao:<id> e item:<id> (destaques).
 */
export function classificarHome(caixas: CaixaLite[], destaquesSalvos: DestaqueGuardado[], itens: ItemLite[]): EscolhaHome {
  const nomeCaixa = (b: CaixaLite) => ((b.config as { label?: string } | null)?.label || b.title || "Botão").trim();
  const porId = new Map(caixas.map((b) => [b.id, b]));
  const botoesDestaque = new Set(destaquesSalvos.filter((d) => d.t === "botao").map((d) => d.id));
  const bloqueados: string[] = [];
  const bolinhas: CandidatoGratis[] = [];
  const destaques: CandidatoGratis[] = [];

  for (const b of [...caixas].sort((a, c) => a.position - c.position)) {
    if (!b.is_active || b.box_type === "hero") continue;
    if (caixaBloqueadaNoGratis(b)) { bloqueados.push(b.id); continue; }
    if (botoesDestaque.has(b.id)) destaques.push({ chave: `botao:${b.id}`, titulo: nomeCaixa(b), sub: "Botão em destaque" });
    else bolinhas.push({ chave: `box:${b.id}`, titulo: nomeCaixa(b), sub: "Bolinha" });
  }
  for (const d of destaquesSalvos) {
    const it = itens.find((x) => x.id === d.id);
    if (d.t === "item" && it) destaques.push({ chave: `item:${d.id}`, titulo: it.title ?? "Item", sub: "Item em destaque", foto: it.image_url });
    if (d.t === "item_bolinha" && it) bolinhas.push({ chave: `item_bolinha:${d.id}`, titulo: it.title ?? "Item", sub: "Item em bolinha", foto: it.image_url });
    if (d.t === "botao" && !porId.get(d.id)?.is_active) continue;
  }
  return { bolinhas, destaques, bloqueados };
}
