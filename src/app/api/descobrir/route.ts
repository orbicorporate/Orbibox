import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lerMelhorFonte } from "@/lib/siteImport";

export const maxDuration = 60;

// Leitura rápida do site/Instagram só pra mostrar na tela, ao vivo, o que a
// Orbi está encontrando (fotos, quantidade de conteúdo). Não grava nada.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { site, instagram } = await req.json().catch(() => ({}));
  if (!site && !instagram) return NextResponse.json({ ok: false });

  const lida = await lerMelhorFonte({ site, instagram }).catch(() => null);
  if (!lida) return NextResponse.json({ ok: false });

  const palavras = lida.data.text.split(/\s+/).filter((w) => w.length > 2).length;
  const imagens = lida.data.images
    .filter((i) => !/logo|icon|sprite|favicon|placeholder|pixel/i.test(`${i.url} ${i.alt}`))
    .slice(0, 8)
    .map((i) => i.url);
  let host = lida.url;
  try { host = new URL(lida.url.startsWith("http") ? lida.url : `https://${lida.url}`).host.replace(/^www\./, ""); } catch { /* mantém */ }

  return NextResponse.json({ ok: true, fonte: lida.fonte, host, palavras, imagens });
}
