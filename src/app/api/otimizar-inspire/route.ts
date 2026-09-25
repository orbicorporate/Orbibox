import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createServiceClient } from "@/lib/supabase/service";

// TEMPORÁRIO: reduz as fotos do Inspire-se (eram ~1 MB cada) no próprio
// lugar, mantendo o mesmo endereço. Roda em lotes. Remover depois.
export const maxDuration = 60;
const CHAVE = "orbi-otimiza-9x2k7p";

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  if (u.searchParams.get("key") !== CHAVE) return NextResponse.json({ error: "nope" }, { status: 404 });
  const offset = Number(u.searchParams.get("offset") ?? 0);
  const limite = Number(u.searchParams.get("limit") ?? 12);
  const sb = createServiceClient();

  const { data: lista, error } = await sb.storage.from("box-images").list("inspire", { limit: limite, offset, sortBy: { column: "name", order: "asc" } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resultado: { nome: string; antesKb: number; depoisKb: number | null; obs?: string }[] = [];
  await Promise.all(
    (lista ?? []).map(async (f) => {
      const caminho = `inspire/${f.name}`;
      const antes = Number((f.metadata as { size?: number } | null)?.size ?? 0);
      if (!/\.(jpe?g|png|webp)$/i.test(f.name)) return resultado.push({ nome: f.name, antesKb: Math.round(antes / 1024), depoisKb: null, obs: "ignorado" });
      if (antes > 0 && antes < 300 * 1024) return resultado.push({ nome: f.name, antesKb: Math.round(antes / 1024), depoisKb: null, obs: "já leve" });
      try {
        const { data: blob, error: dErr } = await sb.storage.from("box-images").download(caminho);
        if (dErr || !blob) throw new Error(dErr?.message ?? "download");
        const buf = Buffer.from(await blob.arrayBuffer());
        const out = await sharp(buf).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
        if (out.length >= buf.length) return resultado.push({ nome: f.name, antesKb: Math.round(buf.length / 1024), depoisKb: null, obs: "não reduziu" });
        const { error: upErr } = await sb.storage.from("box-images").upload(caminho, out, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
        if (upErr) throw new Error(upErr.message);
        resultado.push({ nome: f.name, antesKb: Math.round(buf.length / 1024), depoisKb: Math.round(out.length / 1024) });
      } catch (e) {
        resultado.push({ nome: f.name, antesKb: Math.round(antes / 1024), depoisKb: null, obs: String(e).slice(0, 120) });
      }
    }),
  );
  const antesTotal = resultado.reduce((a, r) => a + r.antesKb, 0);
  const depoisTotal = resultado.reduce((a, r) => a + (r.depoisKb ?? r.antesKb), 0);
  return NextResponse.json({ offset, processados: resultado.length, proximo: (lista?.length ?? 0) === limite ? offset + limite : null, antesKb: antesTotal, depoisKb: depoisTotal, erros: resultado.filter((r) => r.obs && !["já leve", "ignorado"].includes(r.obs)) });
}
