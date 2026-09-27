import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

/**
 * Busca fotos prontas (banco de imagens) pra um item. A Orbi transforma o
 * nome do item e o que o negócio faz numa busca curta em inglês (os bancos
 * respondem muito melhor assim) e a gente devolve uma grade pra escolher.
 * Fonte principal: Pexels (uso comercial livre). Sem chave do Pexels, cai no
 * Openverse (licenças abertas que permitem uso comercial).
 */
export const maxDuration = 30;

export type FotoPronta = { id: string; thumb: string; full: string; autor: string; fonte: string };

type Orientacao = "landscape" | "portrait" | "square";

async function buscaPexels(q: string, orientacao: Orientacao, key: string): Promise<FotoPronta[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=18&orientation=${orientacao}`;
  const r = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const j = (await r.json()) as { photos?: { id: number; photographer: string; src: { medium: string; large2x: string } }[] };
  return (j.photos ?? []).map((p) => ({ id: `px-${p.id}`, thumb: p.src.medium, full: p.src.large2x, autor: p.photographer, fonte: "Pexels" }));
}

async function buscaOpenverse(q: string, orientacao: Orientacao): Promise<FotoPronta[]> {
  const aspecto = orientacao === "landscape" ? "wide" : orientacao === "portrait" ? "tall" : "square";
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=18&license_type=commercial&aspect_ratio=${aspecto}&mature=false`;
  const r = await fetch(url, { headers: { "User-Agent": "Orbibox/1.0" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: { id: string; url: string; thumbnail: string; creator?: string; source?: string }[] };
  return (j.results ?? []).map((p) => ({ id: `ov-${p.id}`, thumb: p.thumbnail || p.url, full: p.url, autor: p.creator || "", fonte: p.source || "Openverse" }));
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, assunto, busca, formato } = (await req.json()) as {
      businessId?: string;
      assunto?: string;
      busca?: string;
      formato?: string;
    };
    if (!businessId) return NextResponse.json({ error: "Faltou o negócio." }, { status: 400 });

    const supabase = await createClient();
    const { data: biz } = await supabase.from("businesses").select("name, about_business").eq("id", businessId).maybeSingle();
    if (!biz) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

    // Sem busca digitada, a Orbi monta uma a partir do item e do negócio.
    let termo = (busca ?? "").trim();
    if (!termo) {
      try {
        termo = (
          await askClaude({
            system:
              "Você cria termos de busca para bancos de fotos (Pexels). Responda só com o termo, em inglês, de 2 a 4 palavras, concreto e visual (objetos, cenas, pessoas), sem marcas nem nomes próprios.",
            messages: [
              {
                role: "user",
                content: `Negócio: ${biz.name}. ${String(biz.about_business ?? "").slice(0, 400)}\nFoto para: ${assunto || biz.name}`,
              },
            ],
            maxTokens: 30,
          })
        )
          .replace(/["'.\n]/g, " ")
          .trim();
      } catch {
        termo = assunto || biz.name;
      }
    }

    const orientacao: Orientacao = formato === "quadrado" ? "square" : formato === "retrato" ? "portrait" : "landscape";
    const key = process.env.PEXELS_API_KEY;
    let fotos = key ? await buscaPexels(termo, orientacao, key) : [];
    if (fotos.length === 0) fotos = await buscaOpenverse(termo, orientacao);

    return NextResponse.json({ busca: termo, fotos });
  } catch (e) {
    console.error("fotos-prontas", e);
    return NextResponse.json({ error: "Não consegui buscar fotos agora." }, { status: 500 });
  }
}
