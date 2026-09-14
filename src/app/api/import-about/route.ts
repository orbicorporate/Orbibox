import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";

// Glifos geométricos puros: o "☎" antigo virava emoji colorido no iOS e
// destoava do resto. Todos aqui renderizam como texto, herdando a cor.
const DIFF_ICONS = ["◎", "◈", "◇", "◆", "✦", "◫"];

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
 * diferenciais, a pessoa só cola o link, a Orbi faz o resto.
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

    const system = `Você é a Orbi, a IA do Orbibox, e está fazendo uma leitura estratégica e aprofundada do site de "${businessName || "o negócio"}". O objetivo é duplo: (1) montar o conteúdo da página "Sobre" do negócio, e (2) entregar uma análise de mercado profissional, como um consultor sênior faria, pra ajudar o dono a entender onde está e pra onde pode ir.

Responda SOMENTE em JSON válido, sem markdown, sem texto antes ou depois, no formato exato:
{"about":"...", "differentials":[{"title":"...","description":"..."}], "strengths":[{"title":"...","description":"..."}], "policies":"...", "challenges":[{"title":"...","description":"..."}], "opportunities":[{"title":"...","description":"..."}]}

Regras:
- "about": 2 ou 3 parágrafos separados por uma linha em branco (\n\n). Cada parágrafo com 2 a 3 frases, nunca um bloco único e corrido. Sugestão de divisão: quem são e o que fazem; como trabalham e com quem já trabalharam; o que entregam de resultado. Tom próximo, português do Brasil, terceira pessoa (fala sobre o negócio, não como se fosse ele falando).
- "differentials": 3 a 4 diferenciais reais encontrados no site (não invente). "title" curto (2-5 palavras) e "description" numa frase curta (até 14 palavras).
- "strengths": exatamente 3 pontos fortes internos do negócio: o que ele já tem de ativo real (experiência, portfólio, estrutura, time, posicionamento, base de clientes). Diferente de "differentials": diferencial é o que o cliente percebe, ponto forte é a capacidade que sustenta isso. "title" curto e "description" numa frase objetiva (até 18 palavras).
- "policies": se o site mencionar prazos de entrega, frete, trocas, devoluções, horários de atendimento ou formas de pagamento, resuma em até 3 frases curtas. Se não encontrar nada disso, devolva uma string vazia "".
- "challenges": exatamente 3 desafios reais que negócios desse segmento enfrentam hoje no mercado brasileiro (concorrência, saturação, mudança de comportamento do consumidor, custo de aquisição, pressão de preço, etc). "title" curto (3-6 palavras) e "description" numa frase objetiva (até 20 palavras), tom analítico e direto.
- "opportunities": exatamente 3 oportunidades concretas de diferenciação ou de gerar mais valor nesse mercado agora, conectadas ao que o negócio já tem (nunca genéricas). "title" curto e "description" numa frase objetiva (até 20 palavras).
- Escreva como um consultor de negócios experiente: direto, específico, sem frases feitas ("inovação", "excelência", "compromisso com a qualidade", "soluções sob medida").
- Nunca invente informação factual sobre o negócio (nome, serviços, clientes, localização) que não esteja no texto. Em "challenges" e "opportunities" você pode usar seu conhecimento de mercado, mas sempre ancorado no que o site mostra.`;

    const raw = await askClaude({ system, messages: [{ role: "user", content: siteText }], maxTokens: 2000 });

    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);

    const about: string = typeof parsed.about === "string" ? parsed.about.trim() : "";
    const policies: string = typeof parsed.policies === "string" ? parsed.policies.trim() : "";
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
    const parseTopicList = (list: unknown, max: number) =>
      Array.isArray(list)
        ? list
            .filter((d: unknown): d is { title: string; description?: string } => !!d && typeof d === "object" && typeof (d as { title?: unknown }).title === "string")
            .slice(0, max)
            .map((d: { title: string; description?: string }) => ({ title: d.title, description: d.description ?? "" }))
        : [];
    const challenges = parseTopicList(parsed.challenges, 3);
    const opportunities = parseTopicList(parsed.opportunities, 3);
    const strengths = parseTopicList(parsed.strengths, 3);

    if (!about && differentials.length === 0) {
      return NextResponse.json({ error: "Não consegui identificar conteúdo suficiente nesse site." }, { status: 422 });
    }

    return NextResponse.json({ about, differentials, strengths, policies, challenges, opportunities });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui ler esse site agora. Tenta de novo." }, { status: 500 });
  }
}
