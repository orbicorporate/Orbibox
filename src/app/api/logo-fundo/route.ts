import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { fundoDosPixels } from "@/lib/logoFundo";

/**
 * Plano B da cor de fundo do logo: quando o navegador não deixa ler a imagem (CORS),
 * o servidor baixa o logo e devolve a mesma cor. Só aceita imagens do storage do próprio
 * Orbibox, para a rota não virar um buscador de qualquer endereço.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("u") ?? "";
  let alvo: URL;
  try {
    alvo = new URL(url);
  } catch {
    return NextResponse.json({ cor: null }, { status: 400 });
  }
  const permitido = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
  if (alvo.protocol !== "https:" || alvo.host !== permitido) {
    return NextResponse.json({ cor: null }, { status: 400 });
  }
  try {
    const r = await fetch(alvo.toString());
    if (!r.ok) return NextResponse.json({ cor: null });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 6 * 1024 * 1024) return NextResponse.json({ cor: null });
    const n = 48;
    const { data, info } = await sharp(buf).resize(n, n, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const cor = fundoDosPixels(data, info.width, info.height);
    return NextResponse.json({ cor }, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
  } catch {
    return NextResponse.json({ cor: null });
  }
}
