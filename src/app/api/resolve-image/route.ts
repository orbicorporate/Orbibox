import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 20;

// Extensões que já são imagem direta — não precisa buscar nada.
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;

/**
 * Recebe uma URL colada pelo dono. Se já for uma imagem direta, devolve como
 * está. Se for uma página (ex: link de produto de uma loja), busca o HTML e
 * tenta achar a foto principal via og:image — assim colar o link do produto
 * também funciona, sem o dono precisar caçar a URL exata da imagem.
 */
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    const trimmed = url.trim();
    if (IMAGE_EXT.test(trimmed)) {
      return NextResponse.json({ imageUrl: trimmed });
    }

    const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const res = await fetch(normalized, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbiboxBot/1.0)" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Não consegui abrir esse link." }, { status: 200 });
    }
    const html = await res.text();
    const base = new URL(normalized).origin;

    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    let found = ogMatch?.[1] ?? null;
    if (found?.startsWith("//")) found = "https:" + found;
    else if (found?.startsWith("/")) found = base + found;

    if (!found) {
      return NextResponse.json({ error: "Esse link não é de uma imagem, e não achei nenhuma foto na página." }, { status: 200 });
    }
    return NextResponse.json({ imageUrl: found });
  } catch {
    return NextResponse.json({ error: "Não consegui buscar esse link." }, { status: 200 });
  }
}
