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
  /** Entrou só com o número neste aparelho: perfil ainda não validado por Google ou e-mail. */
  anonimo: boolean;
  podeAvaliar: boolean;
  minhaAvaliacao: { id: string; nota: number; comentario: string | null; resposta_dono: string | null } | null;
};
export type MarcaDoFa = { id: string; name: string; slug: string; logo_url: string | null };
export type MarcaAfim = MarcaDoFa & { fas: number };
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
  ehFa: false, aceiteWhatsapp: false, contatoWhatsapp: null, curtiu: false, anonimo: false, podeAvaliar: false, minhaAvaliacao: null,
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
    anonimo: user.is_anonymous === true,
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

export async function atualizarPerfil(userId: string, campos: { nome?: string | null; mostrar_marcas?: boolean; telefone?: string | null }) {
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
export async function excluirAvaliacao(businessId: string, userId: string) {
  const { error } = await clubeDb().from("reviews").delete().eq("business_id", businessId).eq("customer_id", userId);
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
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const db = clubeDb();
  const { data: { user } } = await db.auth.getUser();
  // Quem entrou só com o número: liga o Google ao mesmo perfil, sem perder fãs, fotos e avaliações.
  if (user?.is_anonymous) {
    const lig = await db.auth.linkIdentity({ provider: "google", options: { redirectTo } });
    if (!lig.error) return null;
    // Se não deu para ligar (ex.: esse Google já tem conta), entra com ele normalmente.
  }
  const { error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  return error ? "O login com Google ainda não está ativo. Tente com o e-mail." : null;
}
/**
 * E-mail: quem entrou só com o número tem o e-mail ligado ao mesmo perfil (a pessoa confirma pelo link
 * que recebe); quem ainda não entrou recebe um link para entrar. Devolve a mensagem de erro, ou null.
 */
export async function entrarComEmail(slug: string, email: string): Promise<string | null> {
  const limpo = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return "Confira o e-mail digitado.";
  const db = clubeDb();
  const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/${slug}?clube=1`)}`;
  const { data: { user } } = await db.auth.getUser();
  const r = user?.is_anonymous
    ? await db.auth.updateUser({ email: limpo }, { emailRedirectTo })
    : await db.auth.signInWithOtp({ email: limpo, options: { emailRedirectTo } });
  return r.error ? "Não consegui enviar o e-mail agora. Confira o endereço e tente de novo." : null;
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
/**
 * Entrar só com nome e WhatsApp, sem código: cria uma sessão neste aparelho (login anônimo do Supabase),
 * guarda nome e número no perfil (número ainda não confirmado), já torna a pessoa fã da marca e registra
 * que aceitou receber novidades. Como todos os Orbiboxes usam o mesmo endereço, este aparelho fica
 * reconhecido em todos eles. Para outro aparelho, ou para avaliar com foto, vale entrar com Google.
 */
export async function entrarComNumero(businessId: string, nome: string, telefone: string): Promise<string | null> {
  const db = clubeDb();
  let { data: { user } } = await db.auth.getUser();
  if (!user) {
    const r = await db.auth.signInAnonymously();
    if (r.error || !r.data.user) return "Não consegui concluir agora. Tente de novo ou entre com Google.";
    user = r.data.user;
  }
  await garantirCliente(user);
  await db.from("customers").update({ nome: nome.trim() || null, telefone }).eq("id", user.id);
  await virarFa(businessId, user.id);
  return salvarContatoWhatsapp(businessId, user.id, telefone);
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
  if (error) return "Não consegui salvar seu número agora. Tente de novo.";
  // Confere se o aceite realmente ficou ligado (o banco pode recusar sem avisar).
  const { data } = await clubeDb().from("fans").select("aceite_whatsapp").eq("business_id", businessId).eq("customer_id", userId).maybeSingle();
  return data?.aceite_whatsapp ? null : "Guardei seu número, mas não consegui ativar o recebimento de novidades. Tente de novo em instantes.";
}

/** Leve: só diz se quem está logado já é fã desta marca. */
export async function souFa(businessId: string): Promise<boolean> {
  const db = clubeDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return false;
  const { data } = await db.from("fans").select("customer_id").eq("business_id", businessId).eq("customer_id", user.id).maybeSingle();
  return !!data;
}

/** Outras marcas que os fãs deste radar também seguem (só de quem deixou as marcas públicas). */
export async function getAfinidade(businessId: string): Promise<MarcaAfim[]> {
  const { data } = await clubeDb().rpc("clube_afinidade", { p_business: businessId });
  return (data as MarcaAfim[] | null) ?? [];
}

/** Foto de perfil do fã: recorta em quadrado, reduz e guarda no banco de imagens. */
export async function enviarFotoPerfil(userId: string, arquivo: File): Promise<string | null> {
  const bmp = await createImageBitmap(arquivo);
  const lado = Math.min(bmp.width, bmp.height);
  const cv = document.createElement("canvas");
  cv.width = cv.height = 320;
  cv.getContext("2d")!.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, 320, 320);
  const blob: Blob | null = await new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.86));
  if (!blob) return null;
  const db = clubeDb();
  const caminho = `fas/${userId}/${Date.now()}.jpg`;
  const { error } = await db.storage.from("box-images").upload(caminho, blob, { contentType: "image/jpeg", upsert: false });
  if (error) return null;
  const url = db.storage.from("box-images").getPublicUrl(caminho).data.publicUrl;
  await db.from("customers").update({ foto_url: url }).eq("id", userId);
  return url;
}
