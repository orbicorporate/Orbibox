import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Repassa a foto escolhida do banco de imagens pro navegador, pra ela poder
 * ser recortada e enviada igual a uma foto do celular (os bancos nem sempre
 * liberam o acesso direto do navegador). Só aceita endereços de imagem.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const url = req.nextUrl.searchParams.get("u") ?? "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* inválido */
  }
  // Só https e nunca endereço interno.
  if (!/^https:\/\//i.test(url) || !host.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    return NextResponse.json({ error: "Endereço inválido." }, { status: 400 });
  }
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Orbibox/1.0" }, signal: AbortSignal.timeout(12000) });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) return NextResponse.json({ error: "Não consegui abrir essa foto." }, { status: 422 });
    const buf = await r.arrayBuffer();
    if (buf.byteLength > 15 * 1024 * 1024) return NextResponse.json({ error: "Foto grande demais." }, { status: 413 });
    return new NextResponse(buf, { headers: { "Content-Type": tipo, "Cache-Control": "private, max-age=600" } });
  } catch {
    return NextResponse.json({ error: "Não consegui abrir essa foto." }, { status: 502 });
  }
}
