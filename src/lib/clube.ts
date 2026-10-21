"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Clube de fãs: seguir a marca, curtir e avaliar.
 * As tabelas novas ainda não estão nos tipos gerados do banco, então este
 * cliente é sem tipos. Tudo que é público passa por funções do banco que só
 * devolvem o que pode aparecer (nome curto, foto, números).
 */
let _c: SupabaseClient | null = null;
export function clubeDb(): SupabaseClient {
  if (!_c) _c = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as unknown as SupabaseClient;
  return _c;
}

export type FaLite = { id: string; nome: string | null; foto_url: string | null; nivel?: number };
export type Resumo = {
  fas: number;
  curtidas: number;
  avaliacoes: number;
  nota: number | null;
  distribuicao: number[];
  recentes: { id: string; nome: string | null; foto: string | null }[];
};
export type Avaliacao = {
  id: string;
  nota: number;
  comentario: string | null;
  resposta_dono: string | null;
  criado_em: string;
  nome: string | null;
  foto_url: string | null;
  customer_id: string | null;
};
export type Eu = {
  logado: boolean;
  userId: string | null;
  nome: string | null;
  foto: string | null;
  telefone: string | null;
  telefoneVerificado: boolean;
  mostrarMarcas: boolean;
  ehFa: boolean;
  aceiteWhatsapp: boolean;
  /** Número que o fã digitou para receber novidades (sem confirmação por código). */
  contatoWhatsapp: string | null;
  curtiu: boolean;
  podeAvaliar: boolean;
  minhaAvaliacao: { id: string; nota: number; comentario: string | null; resposta_dono: string | null } | null;
};
export type MarcaDoFa = { id: string; name: string; slug: string; logo_url: string | null };
export type ContatoWhats = { nome: string | null; telefone: string; desde: string };

const RESUMO_VAZIO: Resumo = { fas: 0, curtidas: 0, avaliacoes: 0, nota: null, distribuicao: [0, 0, 0, 0, 0], recentes: [] };

export async function getResumo(businessId: string): Promise<Resumo> {
  const { data } = await clubeDb().rpc("clube_resumo", { p_business: businessId });
  return data ? { ...RESUMO_VAZIO, ...(data as Resumo), nota: (data as Resumo).nota == null ? null : Number((data as Resumo).nota) } : RESUMO_VAZIO;
}
export async function getFas(businessId: string): Promise<FaLite[]> {
  // Com o nível de proximidade (avaliou, comprou, curtiu, só virou fã). Se a função ainda não existe, cai na lista simples.
  const novo = await clubeDb().rpc("clube_fas_nivel", { p_business: businessId, p_limite: 60 });
  if (!novo.error && novo.data) return novo.data as FaLite[];
  const { data } = await clubeDb().rpc("clube_fas", { p_business: businessId, p_limite: 60 });
  return (data as FaLite[] | null) ?? [];
}
export async function getAvaliacoes(businessId: string): Promise<Avaliacao[]> {
  const { data } = await clubeDb().rpc("clube_avaliacoes", { p_business: businessId });
  return (data as Avaliacao[] | null) ?? [];
}
export async function getMarcasDoFa(customerId: string): Promise<MarcaDoFa[]> {
  const { data } = await clubeDb().rpc("clube_marcas_do_fa", { p_customer: customerId });
  return (data as MarcaDoFa[] | null) ?? [];
}
export async function getContatos(businessId: string): Promise<ContatoWhats[]> {
  const { data } = await clubeDb().rpc("clube_contatos_whatsapp", { p_business: businessId });
  return (data as ContatoWhats[] | null) ?? [];
}

const EU_ANON: Eu = {
  logado: false, userId: null, nome: null, foto: null, telefone: null, telefoneVerificado: false, mostrarMarcas: false,
  ehFa: false, aceiteWhatsapp: false, contatoWhatsapp: null, curtiu: false, podeAvaliar: false, minhaAvaliacao: null,
};

/** Garante a linha do cliente (nome e foto vêm do Google) e devolve o estado dele nesta marca. */
export async function getEu(businessId: string): Promise<Eu> {
  const db = clubeDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return EU_ANON;
  await garantirCliente(user);
  const [cli, fan, like, pode, rev] = await Promise.all([
    db.from("customers").select("nome, foto_url, telefone, telefone_verificado, mostrar_marcas").eq("id", user.id).maybeSingle(),
    db.from("fans").select("aceite_whatsapp, contato_whatsapp").eq("business_id", businessId).eq("customer_id", user.id).maybeSingle(),
    db.from("likes").select("alvo_id").eq("customer_id", user.id).eq("alvo", "marca").eq("alvo_id", businessId).maybeSingle(),
    db.rpc("pode_avaliar", { p_business: businessId }),
    db.from("reviews").select("id, nota, comentario, resposta_dono").eq("business_id", businessId).eq("customer_id", user.id).maybeSingle(),
  ]);
  return {
    logado: true,
    userId: user.id,
    nome: cli.data?.nome ?? null,
    foto: cli.data?.foto_url ?? null,
    telefone: cli.data?.telefone ?? null,
    telefoneVerificado: !!cli.data?.telefone_verificado,
    mostrarMarcas: !!cli.data?.mostrar_marcas,
    ehFa: !!fan.data,
    aceiteWhatsapp: !!fan.data?.aceite_whatsapp,
    contatoWhatsapp: (fan.data?.contato_whatsapp as string | null | undefined) ?? null,
    curtiu: !!like.data,
    podeAvaliar: pode.data === true,
    minhaAvaliacao: rev.data ?? null,
  };
}

async function garantirCliente(user: User) {
  const db = clubeDb();
  const { data: ja } = await db.from("customers").select("id").eq("id", user.id).maybeSingle();
  if (ja) return;
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  await db.from("customers").insert({
    id: user.id,
    nome: (meta.full_name || meta.name || "").trim() || null,
    foto_url: meta.avatar_url || meta.picture || null,
  });
}

export async function atualizarPerfil(userId: string, campos: { nome?: string | null; mostrar_marcas?: boolean }) {
  await clubeDb().from("customers").update(campos).eq("id", userId);
}

export async function virarFa(businessId: string, userId: string) {
  await clubeDb().from("fans").upsert({ business_id: businessId, customer_id: userId }, { onConflict: "business_id,customer_id", ignoreDuplicates: true });
}
export async function deixarDeSerFa(businessId: string, userId: string) {
  await clubeDb().from("fans").delete().eq("business_id", businessId).eq("customer_id", userId);
}
export async function aceitarWhatsapp(businessId: string, userId: string, aceita: boolean) {
  await clubeDb().from("fans").update({ aceite_whatsapp: aceita }).eq("business_id", businessId).eq("customer_id", userId);
}
export async function curtirMarca(businessId: string, userId: string, curtir: boolean) {
  const db = clubeDb();
  if (curtir) await db.from("likes").upsert({ customer_id: userId, business_id: businessId, alvo: "marca", alvo_id: businessId }, { onConflict: "customer_id,alvo,alvo_id", ignoreDuplicates: true });
  else await db.from("likes").delete().eq("customer_id", userId).eq("alvo", "marca").eq("alvo_id", businessId);
}
/** Curtir item, voucher ou qualquer outra coisa da marca (só fãs, a tela garante). */
export async function curtirAlvo(businessId: string, userId: string, alvo: string, alvoId: string, curtir: boolean) {
  const db = clubeDb();
  if (curtir) {
    const { error } = await db.from("likes").upsert({ customer_id: userId, business_id: businessId, alvo, alvo_id: alvoId }, { onConflict: "customer_id,alvo,alvo_id", ignoreDuplicates: true });
    return !error;
  }
  const { error } = await db.from("likes").delete().eq("customer_id", userId).eq("alvo", alvo).eq("alvo_id", alvoId);
  return !error;
}
export async function enviarAvaliacao(businessId: string, userId: string, v: { nota: number; comentario: string; completo: boolean; foto: boolean }) {
  const linha = { business_id: businessId, customer_id: userId, nota: v.nota, comentario: v.comentario.trim() || null, nome_visivel: v.completo ? "completo" : "primeiro", mostrar_foto: v.foto };
  const { error } = await clubeDb().from("reviews").upsert(linha, { onConflict: "business_id,customer_id" });
  return !error;
}
export async function responderAvaliacao(reviewId: string, texto: string) {
  await clubeDb().rpc("clube_responder", { p_review: reviewId, p_texto: texto });
}
export async function pedirRevisao(reviewId: string) {
  await clubeDb().rpc("clube_pedir_revisao", { p_review: reviewId });
}

/* ---------- Entrar ---------- */
export async function entrarComGoogle(slug: string): Promise<string | null> {
  const next = `/${slug}?clube=1`;
  const { error } = await clubeDb().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  return error ? "O login com Google ainda não está ativo. Tente por WhatsApp." : null;
}
/** Só dígitos, com 55 na frente se vier sem DDI. */
export function normalizarTelefone(txt: string): string {
  const d = txt.replace(/\D/g, "");
  if (d.length >= 12) return `+${d}`;
  return `+55${d}`;
}
export async function enviarCodigoWhatsapp(telefone: string): Promise<string | null> {
  const { error } = await clubeDb().auth.signInWithOtp({ phone: telefone, options: { channel: "whatsapp" } });
  return error ? "Não consegui enviar o código por WhatsApp agora. Confira o número ou tente com Google." : null;
}
export async function confirmarCodigo(telefone: string, codigo: string): Promise<string | null> {
  const { error } = await clubeDb().auth.verifyOtp({ phone: telefone, token: codigo.trim(), type: "sms" });
  return error ? "Código incorreto ou vencido." : null;
}
export async function sairDoClube() {
  await clubeDb().auth.signOut();
}

/**
 * O fã deixa o número e aceita receber novidades, sem código de confirmação.
 * Já o torna fã da marca. A marca só vê o número de quem aceitou.
 */
export async function salvarContatoWhatsapp(businessId: string, userId: string, telefone: string): Promise<string | null> {
  const { error } = await clubeDb().from("fans").upsert(
    { business_id: businessId, customer_id: userId, contato_whatsapp: telefone, aceite_whatsapp: true },
    { onConflict: "business_id,customer_id" },
  );
  return error ? "Não consegui salvar seu número agora. Tente de novo." : null;
}

/** Leve: só diz se quem está logado já é fã desta marca. */
export async function souFa(businessId: string): Promise<boolean> {
  const db = clubeDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return false;
  const { data } = await db.from("fans").select("customer_id").eq("business_id", businessId).eq("customer_id", user.id).maybeSingle();
  return !!data;
}
