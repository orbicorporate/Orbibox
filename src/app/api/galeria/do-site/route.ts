import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { ehDonoOuAdmin } from "@/lib/business";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "box-images";
const MAX_FOTOS = 40;
const MAX_BYTES = 6_000_000;

/**
 * Enche a galeria com as fotos que vieram do site (as dos itens e o logo).
 * Baixa cada uma e guarda no armazenamento do negócio, com nome fixo por
 * endereço: rodar de novo não duplica. A galeria lista o que está lá.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const { businessId } = (await req.json().catch(() => ({}))) as { businessId?: string };
  if (!businessId || !(await ehDonoOuAdmin(user.id, businessId))) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const [{ data: itens }, { data: biz }] = await Promise.all([
    supabase.from("content_items").select("image_url, gallery_urls").eq("business_id", businessId).limit(200),
    supabase.from("businesses").select("logo_url").eq("id", businessId).maybeSingle(),
  ]);
  const proprio = (u: string) => u.includes(`/storage/v1/object/public/${BUCKET}/${businessId}/`);
  const urls = Array.from(new Set([
    biz?.logo_url ?? null,
    ...(itens ?? []).flatMap((i) => [i.image_url, ...((i.gallery_urls as string[] | null) ?? [])]),
  ].filter((u): u is string => !!u && /^https?:\/\//.test(u) && !proprio(u) && !/youtube|youtu\.be|instagram\.com\/reel/i.test(u)))).slice(0, MAX_FOTOS);
  if (urls.length === 0) return NextResponse.json({ ok: true, trazidas: 0 });

  const { data: jaTem } = await supabase.storage.from(BUCKET).list(businessId, { limit: 1000, search: "site-" });
  const existentes = new Set((jaTem ?? []).map((o) => o.name));

  let trazidas = 0;
  await Promise.all(urls.map(async (url) => {
    const base = `site-${createHash("sha1").update(url).digest("hex").slice(0, 16)}`;
    if ([...existentes].some((n) => n.startsWith(base))) return;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const tipo = (r.headers.get("content-type") ?? "").split(";")[0];
      if (!r.ok || !/^image\/(jpeg|png|webp|gif|avif)$/.test(tipo)) return;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 2000 || buf.length > MAX_BYTES) return;
      const ext = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : tipo === "image/gif" ? "gif" : tipo === "image/avif" ? "avif" : "jpg";
      const { error } = await supabase.storage.from(BUCKET).upload(`${businessId}/${base}.${ext}`, buf, { contentType: tipo, cacheControl: "31536000", upsert: false });
      if (!error) trazidas++;
    } catch { /* foto que não abre fica de fora */ }
  }));
  return NextResponse.json({ ok: true, trazidas });
}
