import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Ícone da aba do navegador: o logo da marca dona do Orbibox, quadrado. Sem logo, cai no ícone padrão. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: b } = await supabase.from("businesses").select("logo_url").eq("slug", slug).maybeSingle();
  const padrao = () => Response.redirect(new URL("/icon-192.png", req.url), 302);
  if (!b?.logo_url) return padrao();
  try {
    const r = await fetch(b.logo_url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return padrao();
    const png = await sharp(Buffer.from(await r.arrayBuffer()))
      .resize(192, 192, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=3600" } });
  } catch {
    return padrao();
  }
}
