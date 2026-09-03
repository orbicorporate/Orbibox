import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";

const PALETTES = [
  [{ hex: "#1c1b1c", role: "primary" }, { hex: "#B7F34A", role: "accent" }, { hex: "#F7F7F4", role: "background" }],
  [{ hex: "#2b2620", role: "primary" }, { hex: "#6EE7D8", role: "accent" }, { hex: "#F7F7F4", role: "background" }],
  [{ hex: "#111318", role: "primary" }, { hex: "#E8B4A0", role: "accent" }, { hex: "#FFFFFF", role: "background" }],
];

async function fetchSiteText(url: string): Promise<string | null> {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(normalized, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 4000);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, instagram, website } = await req.json();

    const siteText = website ? await fetchSiteText(website) : null;
    const seed = ((name || "") + (instagram || "") + (website || "")).length;
    const colors = PALETTES[seed % PALETTES.length];

    const system = `Você é a Orbi, a IA do Orbibox que monta um mini manual de marca a partir do nome, Instagram e (quando disponível) texto extraído do site.
Responda SOMENTE em JSON válido, sem markdown, sem texto antes ou depois, no formato exato:
{"personality":{"energetica":0.0,"proxima":0.0,"visual":0.0,"direta":0.0},"voiceSummary":"...","font":"...","palette":["#RRGGBB","#RRGGBB","#RRGGBB"]}
- Os quatro valores de personalidade são números entre 0.3 e 0.95 e devem variar entre si conforme a marca.
- voiceSummary: UMA frase curta (máximo 15 palavras) sobre o tom de voz da marca.
- font: o nome de UMA fonte do Google Fonts que combine com a marca (ex: "Manrope", "Playfair Display", "Poppins", "DM Sans"). Apenas o nome.
- palette: 3 a 5 cores hex que representem a marca (a primeira é a cor principal/escura, uma de destaque, e um fundo claro). Se detectar cores reais no site, use-as.`;

    const userMsg = `Nome do negócio: ${name || "(não informado)"}
Instagram: ${instagram || "(não informado)"}
${siteText ? `Texto extraído do site:\n${siteText}` : "Site não informado ou não acessível — infira a partir do nome e segmento provável."}`;

    let personality = { energetica: 0.6, proxima: 0.6, visual: 0.6, direta: 0.6 };
    let voiceSummary = "Tom próximo e direto, pronto para conversar com quem chega.";
    let font = "Manrope";
    let palette: string[] | null = null;

    try {
      const raw = await askClaude({ system, messages: [{ role: "user", content: userMsg }], maxTokens: 600 });
      // Extrai o primeiro bloco {...} da resposta, mesmo que venha com texto ao redor.
      const match = raw.match(/\{[\s\S]*\}/);
      const jsonText = match ? match[0] : raw.trim().replace(/^```json\n?|```$/g, "");
      const parsed = JSON.parse(jsonText);
      if (parsed.personality) personality = parsed.personality;
      if (parsed.voiceSummary) voiceSummary = parsed.voiceSummary;
      if (parsed.font) font = String(parsed.font).slice(0, 60);
      if (Array.isArray(parsed.palette) && parsed.palette.length > 0) {
        palette = parsed.palette
          .filter((c: unknown) => typeof c === "string" && /^#?[0-9a-fA-F]{6}$/.test(c))
          .map((c: string) => (c.startsWith("#") ? c : `#${c}`))
          .slice(0, 6);
      }
    } catch (e) {
      console.error("analyze-brand: falha ao chamar/parsear Claude, usando fallback", e);
    }

    const roles = ["primary", "accent", "background", "detail", "detail", "detail"];
    const finalColors =
      palette && palette.length > 0
        ? palette.map((hex, i) => ({ hex, role: roles[i] ?? "detail" }))
        : colors;

    return NextResponse.json({ personality, colors: finalColors, voiceSummary, font, siteAnalyzed: !!siteText });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao analisar marca." }, { status: 500 });
  }
}
