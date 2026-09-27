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
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=15&orientation=${orientacao}&size=large`;
  const r = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const j = (await r.json()) as { photos?: { id: number; photographer: string; src: { medium: string; large2x: string } }[] };
  return (j.photos ?? []).map((p) => ({ id: `px-${p.id}`, thumb: p.src.medium, full: p.src.large2x, autor: p.photographer, fonte: "Pexels" }));
}

// Openverse mistura foto profissional com foto de celular: pede só
// fotografia, tamanho grande e conteúdo seguro, e ainda descarta o que for
// pequeno demais pra virar capa.
async function buscaOpenverse(q: string): Promise<FotoPronta[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=20&license_type=commercial&category=photograph&size=large&mature=false`;
  const r = await fetch(url, { headers: { "User-Agent": "Orbibox/1.0" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: { id: string; url: string; thumbnail?: string; creator?: string; source?: string; width?: number; height?: number }[] };
  return (j.results ?? [])
    .filter((p) => (p.width ?? 0) >= 1200 && (p.height ?? 0) >= 800)
    .map((p) => ({ id: `ov-${p.id}`, thumb: p.thumbnail || p.url, full: p.url, autor: p.creator || "", fonte: p.source || "Openverse" }));
}

/** Intercala os resultados das buscas (a mais específica primeiro) e tira repetidos. */
function intercalar(listas: FotoPronta[][], max: number): FotoPronta[] {
  const vistos = new Set<string>();
  const out: FotoPronta[] = [];
  for (let i = 0; out.length < max && listas.some((l) => i < l.length); i++) {
    for (const l of listas) {
      const f = l[i];
      if (f && !vistos.has(f.full)) {
        vistos.add(f.full);
        out.push(f);
        if (out.length >= max) break;
      }
    }
  }
  return out;
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

    // Sem busca digitada, a Orbi monta três: uma bem no tema e duas mais
    // amplas, relacionadas, pra não ficar estreito demais.
    const digitada = (busca ?? "").trim();
    let termos: string[] = digitada ? [digitada] : [];
    if (!digitada) {
      try {
        const resp = await askClaude({
          system:
            "Você cria termos de busca para bancos de fotos profissionais (Pexels). Responda só com 3 linhas, uma busca por linha, em inglês, 2 a 4 palavras cada, concretas e visuais (objetos, cenas, pessoas, ambientes), sem marcas nem nomes próprios. Linha 1: bem específica do item. Linhas 2 e 3: temas relacionados e mais amplos que também sirvam de capa bonita.",
          messages: [
            {
              role: "user",
              content: `Negócio: ${biz.name}. ${String(biz.about_business ?? "").slice(0, 400)}\nFoto para: ${assunto || biz.name}`,
            },
          ],
          maxTokens: 60,
        });
        termos = resp
          .split("\n")
          .map((l) => l.replace(/^[\s\-\d.)"']+|["'.]+$/g, "").trim())
          .filter(Boolean)
          .slice(0, 3);
      } catch {
        /* sem IA: usa o próprio assunto */
      }
      if (termos.length === 0) termos = [assunto || biz.name];
    }
    const termo = termos[0];

    const orientacao: Orientacao = formato === "quadrado" ? "square" : formato === "retrato" ? "portrait" : "landscape";
    const key = process.env.PEXELS_API_KEY;
    let listas = key ? await Promise.all(termos.map((t) => buscaPexels(t, orientacao, key).catch(() => []))) : [];
    if (listas.every((l) => l.length === 0)) listas = await Promise.all(termos.map((t) => buscaOpenverse(t).catch(() => [])));
    const fotos = intercalar(listas, 27);

    return NextResponse.json({ busca: termo, fotos });
  } catch (e) {
    console.error("fotos-prontas", e);
    return NextResponse.json({ error: "Não consegui buscar fotos agora." }, { status: 500 });
  }
}
