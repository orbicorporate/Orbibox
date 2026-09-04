import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";

const DIFF_ICONS = ["◎", "◈", "◇", "☎", "✦", "◫"];

async function fetchSiteText(url: string): Promise<string | null> {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(normalized, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 6000);
  } catch {
    return null;
  }
}

/**
 * Lê o site do negócio e monta sozinha o texto "Sobre nós" e os cards de
 * diferenciais — a pessoa só cola o link, a Orbi faz o resto.
 */
export async function POST(req: NextRequest) {
  try {
    const { businessName, url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Cole o link do seu site." }, { status: 400 });
    }

    const siteText = await fetchSiteText(url);
    if (!siteText) {
      return NextResponse.json({ error: "Não consegui acessar esse link. Confere se está certo e tenta de novo." }, { status: 422 });
    }

    const system = `Você é a Orbi, a IA do Orbibox. Leia o texto extraído do site de "${businessName || "o negócio"}" e monte o conteúdo da página "Sobre" dele.

Responda SOMENTE em JSON válido, sem markdown, sem texto antes ou depois, no formato exato:
{"about":"...", "differentials":[{"title":"...","description":"..."},{"title":"...","description":"..."},{"title":"...","description":"..."}]}

Regras:
- "about": 2 a 4 frases contando quem são, o que fazem e há quanto tempo/o que os diferencia — tom próximo, em português do Brasil, na terceira pessoa (fala sobre o negócio, não como se fosse ele falando).
- "differentials": 3 a 4 diferenciais reais encontrados no site (não invente). Cada um com "title" curto (2-5 palavras) e "description" em uma frase curta (até 12 palavras).
- Nunca invente informação que não esteja no texto — se não achar diferenciais claros, foque no que existe (atendimento, experiência, produtos, localização).`;

    const raw = await askClaude({ system, messages: [{ role: "user", content: siteText }], maxTokens: 700 });

    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);

    const about: string = typeof parsed.about === "string" ? parsed.about.trim() : "";
    const differentials = Array.isArray(parsed.differentials)
      ? parsed.differentials
          .filter((d: unknown): d is { title: string; description?: string } => !!d && typeof d === "object" && typeof (d as { title?: unknown }).title === "string")
          .slice(0, 4)
          .map((d: { title: string; description?: string }, i: number) => ({
            icon: DIFF_ICONS[i % DIFF_ICONS.length],
            title: d.title,
            description: d.description ?? "",
          }))
      : [];

    if (!about && differentials.length === 0) {
      return NextResponse.json({ error: "Não consegui identificar conteúdo suficiente nesse site." }, { status: 422 });
    }

    return NextResponse.json({ about, differentials });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui ler esse site agora. Tenta de novo." }, { status: 500 });
  }
}
