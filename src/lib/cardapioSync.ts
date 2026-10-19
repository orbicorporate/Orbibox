import type { SupabaseClient } from "@supabase/supabase-js";
import { lerSecoes, novoId, type CardapioSecao } from "@/lib/cardapio";

/**
 * Passa itens entre o Catálogo (content_items) e o Cardápio (smart_boxes.config.secoes).
 * É sempre uma cópia: depois de enviado, editar um lado não muda o outro. Só a foto
 * de capa vai junto, porque cada prato do cardápio tem uma foto só.
 */

export type ItemParaCardapio = { titulo: string; descricao?: string | null; preco?: number | null; foto?: string | null; categoria?: string | null };
export type PratoParaCatalogo = { nome: string; descricao?: string | null; preco?: number | null; foto?: string | null; categoria?: string | null };
export type Resultado = { ok: true; novos: number; jaExistiam: number; criados?: Record<string, unknown>[] } | { ok: false; erro: string };

// O cliente do app não conhece todas as tabelas nos tipos gerados, então aceita qualquer um.
type Cliente = SupabaseClient<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const norm = (t: string) => t.trim().toLowerCase();

async function caixaCardapio(supabase: Cliente, businessId: string) {
  const { data } = await supabase.from("smart_boxes").select("id, config").eq("business_id", businessId).eq("box_type", "custom");
  return ((data ?? []) as { id: string; config: Record<string, unknown> | null }[]).find((b) => b.config?.action === "cardapio") ?? null;
}

export async function temCardapio(supabase: Cliente, businessId: string): Promise<boolean> {
  return !!(await caixaCardapio(supabase, businessId));
}

/** Pratos que já estão no cardápio, pra saber o que ainda falta trazer. */
export async function pratosDoCardapio(supabase: Cliente, businessId: string): Promise<{ nome: string; descricao: string; preco: number | null; foto: string | null; categoria: string }[]> {
  const box = await caixaCardapio(supabase, businessId);
  if (!box) return [];
  return lerSecoes(box.config).flatMap((s) => s.itens.filter((i) => i.nome.trim()).map((i) => ({ nome: i.nome, descricao: i.descricao ?? "", preco: i.preco ?? null, foto: i.foto ?? null, categoria: s.nome })));
}

export type ItemDoCatalogo = { id: string; titulo: string; descricao: string; preco: number | null; foto: string | null; categoria: string };

export async function itensDoCatalogo(supabase: Cliente, businessId: string): Promise<ItemDoCatalogo[]> {
  const { data } = await supabase
    .from("content_items")
    .select("id, title, description, price, image_url, brand_label, position")
    .eq("business_id", businessId)
    .eq("status", "published")
    .order("position", { ascending: true });
  return ((data ?? []) as { id: string; title: string; description: string | null; price: number | null; image_url: string | null; brand_label: string | null }[])
    .filter((i) => i.title?.trim())
    .map((i) => ({ id: i.id, titulo: i.title, descricao: i.description ?? "", preco: i.price, foto: i.image_url, categoria: i.brand_label?.trim() ?? "" }));
}

/** Junta itens às categorias do cardápio, sem salvar nada: cria a categoria se faltar e pula o mesmo nome. */
export function mesclarNoCardapio(atuais: CardapioSecao[], itens: ItemParaCardapio[], categoriaPadrao = "Pratos"): { secoes: CardapioSecao[]; novos: number; jaExistiam: number } {
  const secoes: CardapioSecao[] = atuais.map((s) => ({ ...s, itens: [...s.itens] }));
  const nomes = new Set(secoes.flatMap((s) => s.itens.map((i) => norm(i.nome))));
  let novos = 0;
  let jaExistiam = 0;
  for (const it of itens) {
    const nome = it.titulo.trim();
    if (!nome) continue;
    if (nomes.has(norm(nome))) { jaExistiam++; continue; }
    const nomeSecao = (it.categoria ?? "").trim() || categoriaPadrao;
    let secao = secoes.find((s) => norm(s.nome) === norm(nomeSecao));
    if (!secao) { secao = { id: novoId(), nome: nomeSecao, itens: [] }; secoes.push(secao); }
    secao.itens.push({ id: novoId(), nome, descricao: it.descricao?.trim() ?? "", preco: typeof it.preco === "number" ? it.preco : null, aPartir: false, foto: it.foto || null, fotoAjuste: null });
    nomes.add(norm(nome));
    novos++;
  }
  return { secoes, novos, jaExistiam };
}

/** Catálogo para o Cardápio, direto no banco (usado fora da tela do cardápio, onde não há edição aberta). */
export async function enviarAoCardapio(supabase: Cliente, businessId: string, itens: ItemParaCardapio[], categoriaPadrao = "Pratos"): Promise<Resultado> {
  const box = await caixaCardapio(supabase, businessId);
  if (!box) return { ok: false, erro: "Ative o cardápio primeiro." };
  const m = mesclarNoCardapio(lerSecoes(box.config), itens, categoriaPadrao);
  if (m.novos === 0) return { ok: true, novos: 0, jaExistiam: m.jaExistiam };
  const { error } = await supabase.from("smart_boxes").update({ config: { ...(box.config ?? {}), secoes: m.secoes } }).eq("id", box.id);
  if (error) return { ok: false, erro: "Não consegui salvar no cardápio. Tente de novo." };
  return { ok: true, novos: m.novos, jaExistiam: m.jaExistiam };
}

/** Cardápio para o Catálogo. A categoria do prato vira a categoria do item. Nasce publicado, no topo. */
export async function enviarAoCatalogo(supabase: Cliente, businessId: string, pratos: PratoParaCatalogo[]): Promise<Resultado> {
  const { data: atuais } = await supabase.from("content_items").select("title, position").eq("business_id", businessId);
  const existentes = (atuais ?? []) as { title: string; position: number }[];
  const nomes = new Set(existentes.map((i) => norm(i.title ?? "")));
  let pos = existentes.length > 0 ? Math.min(...existentes.map((i) => i.position)) : 0;
  const linhas: Record<string, unknown>[] = [];
  let jaExistiam = 0;
  for (const p of pratos) {
    const nome = p.nome.trim();
    if (!nome) continue;
    if (nomes.has(norm(nome))) { jaExistiam++; continue; }
    nomes.add(norm(nome));
    pos -= 1;
    linhas.push({
      business_id: businessId,
      type: "product",
      title: nome,
      description: p.descricao?.trim() || null,
      price: typeof p.preco === "number" ? p.preco : null,
      price_type: typeof p.preco === "number" ? "exato" : "sem",
      image_url: p.foto || null,
      brand_label: p.categoria?.trim() || null,
      status: "published",
      position: pos,
    });
  }
  if (linhas.length === 0) return { ok: true, novos: 0, jaExistiam };
  const { data: criados, error } = await supabase.from("content_items").insert(linhas).select("*");
  if (error) return { ok: false, erro: "Não consegui salvar no catálogo. Tente de novo." };
  return { ok: true, novos: linhas.length, jaExistiam, criados: (criados ?? []) as Record<string, unknown>[] };
}

/** Texto curto para avisar o resultado, no mesmo tom do resto do app. */
export function avisoDoEnvio(r: Resultado, destino: "cardápio" | "catálogo"): string {
  if (!r.ok) return r.erro;
  if (r.novos === 0) return `Já estava no ${destino}.`;
  const n = r.novos === 1 ? "1 item enviado" : `${r.novos} itens enviados`;
  return r.jaExistiam > 0 ? `${n} para o ${destino}. ${r.jaExistiam} já estavam lá.` : `${n} para o ${destino}.`;
}
