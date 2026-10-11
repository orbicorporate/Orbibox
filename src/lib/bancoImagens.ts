import { createBrowserClient } from "@supabase/ssr";

// As tabelas do banco de imagens ainda não estão nos tipos gerados, por isso o cliente sem tipos.
export function clienteBanco() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
export type ClienteBanco = ReturnType<typeof clienteBanco>;

export const BUCKET = "box-images";
export const LIMITE_TITANIO = 100;
export const LIMITE_NIOBIO = 300;
export const MAX_CATEGORIAS = 12;

export type Categoria = { id: string; name: string; position: number };
export type TipoImagem = "logos" | "produtos" | "ambientes";
export const TIPOS_IMAGEM: { id: TipoImagem; nome: string }[] = [
  { id: "logos", nome: "Logos e ícones" },
  { id: "produtos", nome: "Produtos" },
  { id: "ambientes", nome: "Ambientes" },
];
export type ImagemBanco = { id: string; path: string; category_id: string | null; size_bytes: number | null; created_at: string; url: string; auto_tipo: TipoImagem | null; tipo_corrigido: boolean };
export const COLUNAS_IMAGEM = "id, path, category_id, size_bytes, created_at, auto_tipo, tipo_corrigido";

/** Pede à IA o tipo de até 8 imagens por vez. Devolve id -> tipo. */
export async function classificarImagens(businessId: string, ids: string[]): Promise<Record<string, TipoImagem>> {
  try {
    const r = await fetch("/api/classificar-imagens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, ids }) });
    if (!r.ok) return {};
    const j = (await r.json()) as { resultados?: Record<string, TipoImagem> };
    return j.resultados ?? {};
  } catch {
    return {};
  }
}

export function urlDaImagem(supabase: ClienteBanco, path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Traz para o banco de imagens tudo que já foi enviado antes dele existir
 * (e o que os campos de foto enviam hoje). As fotos novas entram "sem
 * categoria". Pode rodar quantas vezes quiser: só insere o que falta.
 */
export async function sincronizarBiblioteca(supabase: ClienteBanco, businessId: string) {
  const { data: arquivos } = await supabase.storage.from(BUCKET).list(businessId, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  const noArmazenamento = (arquivos ?? []).filter((o) => o.name && /\.(jpe?g|png|webp|gif|avif)$/i.test(o.name));
  if (noArmazenamento.length === 0) return;
  const { data: existentes } = await supabase.from("image_library").select("path").eq("business_id", businessId).limit(5000);
  const ja = new Set((existentes ?? []).map((r: { path: string }) => r.path));
  const novos = noArmazenamento
    .filter((o) => !ja.has(`${businessId}/${o.name}`))
    .map((o) => ({
      business_id: businessId,
      path: `${businessId}/${o.name}`,
      size_bytes: (o.metadata as { size?: number } | null)?.size ?? null,
      created_at: o.created_at ?? undefined,
    }));
  if (novos.length > 0) await supabase.from("image_library").upsert(novos, { onConflict: "business_id,path", ignoreDuplicates: true });
}

/**
 * Deixa a imagem bem leve mantendo a qualidade: lado maior de no máximo
 * 1600 px e WebP em qualidade 80 (JPEG 82 se o navegador não exportar WebP).
 * Se o resultado ficar maior que o original, mantém o original.
 */
export async function comprimirImagem(file: File): Promise<Blob> {
  const MAX = 1600;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const escala = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * escala));
    const h = Math.max(1, Math.round(bmp.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((webp) => {
        if (webp && webp.type === "image/webp") res(webp);
        else canvas.toBlob(res, "image/jpeg", 0.82);
      }, "image/webp", 0.8),
    );
    if (!blob) return file;
    return blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Envia uma imagem já comprimida e registra no banco. Devolve a linha criada. */
export async function enviarImagem(supabase: ClienteBanco, businessId: string, file: File, categoryId: string | null): Promise<ImagemBanco> {
  const blob = await comprimirImagem(file);
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : blob.type === "image/gif" ? "gif" : "jpg";
  const path = `${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: blob.type || "image/jpeg" });
  if (error) throw new Error("upload");
  const { data, error: e2 } = await supabase
    .from("image_library")
    .insert({ business_id: businessId, path, category_id: categoryId, size_bytes: blob.size })
    .select(COLUNAS_IMAGEM)
    .single();
  if (e2 || !data) throw new Error("registro");
  return { ...(data as Omit<ImagemBanco, "url">), url: urlDaImagem(supabase, path) };
}

export function kb(bytes: number | null | undefined) {
  if (!bytes) return "";
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
