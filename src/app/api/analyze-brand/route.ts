import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { askClaude } from "@/lib/anthropic";
import { fetchInstagram, fetchSiteResiliente } from "@/lib/siteImport";
import { jsonrepair } from "jsonrepair";
import { extrairCoresDaMarca } from "@/lib/brandColors";
import { SEGMENTOS } from "@/lib/segmentos";
import { CONVERSOES } from "@/lib/conversao";

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
    const { name, instagram, website, descricao } = await req.json();

    // Site (lido do jeito resiliente) e Instagram em paralelo: o tom de voz
    // e a paleta ficam muito melhores com os dois, e sem site o Instagram basta.
    // As cores são MEDIDAS no site (logo, header, rodapé, botões, cores do
    // tema), nunca tiradas das fotos do conteúdo. Roda junto com a leitura.
    const [siteLido, igLido, coresMedidas] = await Promise.all([
      website ? fetchSiteResiliente(website).catch(() => null) : Promise.resolve(null),
      instagram ? fetchInstagram(instagram).catch(() => null) : Promise.resolve(null),
      website ? extrairCoresDaMarca(website).catch(() => null) : Promise.resolve(null),
    ]);
    const medidas = coresMedidas?.colors ?? [];
    if (website) console.log("analyze-brand cores", JSON.stringify({ website, cores: coresMedidas?.evidencia, diagnostico: coresMedidas?.diagnostico }));
    const temPaletaMedida = medidas.length >= 2;
    const siteText =
      [siteLido?.text ? siteLido.text.slice(0, 3500) : (website ? await fetchSiteText(website) : null), igLido?.text ? `INSTAGRAM:\n${igLido.text.slice(0, 2500)}` : null]
        .filter(Boolean)
        .join("\n\n") || null;
    const seed = ((name || "") + (instagram || "") + (website || "")).length;
    const colors = PALETTES[seed % PALETTES.length];

    const system = `Você é a Orbi, a IA do Orbibox que monta um mini manual de marca a partir do nome, Instagram e (quando disponível) texto extraído do site.
Responda SOMENTE em JSON válido, sem markdown, sem texto antes ou depois, no formato exato:
{"personality":{"energetica":0.0,"proxima":0.0,"visual":0.0,"direta":0.0},"voiceSummary":"...","font":"...","palette":["#RRGGBB","#RRGGBB","#RRGGBB"],"resumo":"...","pontosFortes":[{"icon":"✦","title":"...","description":"..."}],"segmento":"...","objetivo":"...","conversao":"...","demo":{"pergunta":"...","resposta":"..."},"oferta":{"titulo":"...","tipo":"percent","valor":10}}
- Os quatro valores de personalidade são números entre 0.3 e 0.95 e devem variar entre si conforme a marca.
- voiceSummary: UMA frase curta (máximo 15 palavras) sobre o tom de voz da marca.
- font: o nome de UMA fonte do Google Fonts que combine com a marca (ex: "Manrope", "Playfair Display", "Poppins", "DM Sans"). Apenas o nome.
- palette: 3 a 5 cores hex que representem a marca (a primeira é a cor principal, uma de destaque, e um fundo claro).
- A paleta vem da IDENTIDADE da marca: logotipo, header, rodapé e botões do site. Nunca use cores de fotos ou imagens do conteúdo (produtos, pessoas, paisagens, comida).
- Se receber "CORES MEDIDAS NO SITE", a paleta deve usar exatamente essas cores, na mesma ordem. Não invente outras.
- resumo: o negócio em até 3 frases curtas (no máximo 3 linhas no celular, ~240 caracteres): o que é, pra quem, e o que torna especial. Português do Brasil, direto, sem clichês ("excelência", "qualidade incomparável").
- pontosFortes: EXATAMENTE 3 pontos fortes reais da marca, tirados do conteúdo (produtos, provas, números, diferenciais citados). title com no máximo 5 palavras; description com no máximo 14 palavras explicando. icon: um só símbolo desta lista, o que combinar: ✦ ★ ◆ ⚡ ✓ ☺ ♥ ✿ ⌖ $. Nunca invente número, prêmio ou fato que não esteja no conteúdo; sem conteúdo, use pontos fortes típicos do segmento, de forma honesta e genérica.
- segmento: o ramo do negócio, UM destes ids: ${SEGMENTOS.map((s) => `${s.id} (${s.rotulo})`).join(", ")}, ou "outro".
- objetivo: o que mais ajudaria esse negócio agora, UM destes: vender (loja, comida, produtos com preço), apresentar (portfólio, marca, institucional), atender (serviço que depende de tirar dúvidas e orçar).
- conversao: a ação mais valiosa que o cliente pode fazer, UMA destas: ${CONVERSOES.map((c) => `${c.id} (${c.rotulo})`).join(", ")}. Restaurante e café: visitar ou whatsapp; loja virtual: comprar; agência e consultoria: orcamento; beleza, clínica e serviços com hora marcada: agendar.
- demo: uma pergunta REAL que um cliente desse negócio faria (curta, do jeito que se digita no celular) e a resposta que a assistente daria usando SÓ informações do conteúdo (produtos, serviços, diferenciais, preços se houver). Resposta em até 45 palavras, simpática, específica, terminando com uma pergunta que leva à conversao. Sem conteúdo, use o nome e o ramo, sem inventar preço, endereço ou horário.
- oferta: uma primeira oferta que faz sentido pra esse negócio. titulo curto (até 32 caracteres, ex: "10% na primeira compra", "Sobremesa grátis no 1º pedido"), tipo "percent" ou "fixed", valor numérico (percent entre 5 e 20; fixed em reais, pequeno).`;

    const userMsg = `Nome do negócio: ${name || "(não informado)"}
${descricao ? `O dono descreveu assim: ${String(descricao).slice(0, 600)}` : ""}
Instagram: ${instagram || "(não informado)"}
${siteText ? `Conteúdo da marca (site e/ou Instagram):\n${siteText}` : "Site e Instagram não disponíveis, infira a partir do nome e segmento provável."}${
      medidas.length > 0
        ? `\n\nCORES MEDIDAS NO SITE (logo, header, rodapé, botões):\n${(coresMedidas?.evidencia.length ? coresMedidas.evidencia : medidas.map((c) => c.hex)).join("\n")}`
        : ""
    }`;

    let personality = { energetica: 0.6, proxima: 0.6, visual: 0.6, direta: 0.6 };
    let voiceSummary = "Tom próximo e direto, pronto para conversar com quem chega.";
    let font = "Manrope";
    let palette: string[] | null = null;
    let resumo = "";
    let pontosFortes: { icon: string; title: string; description: string }[] = [];
    let segmento: string | null = null;
    let objetivo: string | null = null;
    let conversao: string | null = null;
    let demo: { pergunta: string; resposta: string } | null = null;
    let oferta: { titulo: string; tipo: "percent" | "fixed"; valor: number } | null = null;

    try {
      const raw = await askClaude({ system, messages: [{ role: "user", content: userMsg }], maxTokens: 1500 });
      // Extrai o primeiro bloco {...} da resposta, mesmo que venha com texto ao redor.
      const match = raw.match(/\{[\s\S]*\}/);
      const jsonText = match ? match[0] : raw.trim().replace(/^```json\n?|```$/g, "");
      const parsed = JSON.parse(jsonrepair(jsonText));
      if (parsed.personality) personality = parsed.personality;
      if (parsed.voiceSummary) voiceSummary = parsed.voiceSummary;
      if (parsed.font) font = String(parsed.font).slice(0, 60);
      if (typeof parsed.resumo === "string") resumo = parsed.resumo.trim().slice(0, 360);
      if (Array.isArray(parsed.pontosFortes)) {
        pontosFortes = parsed.pontosFortes
          .filter((p: unknown) => !!p && typeof (p as { title?: unknown }).title === "string")
          .slice(0, 3)
          .map((p: { icon?: string; title: string; description?: string }) => ({
            icon: typeof p.icon === "string" && p.icon.trim() ? p.icon.trim().slice(0, 4) : "✦",
            title: p.title.trim().slice(0, 60),
            description: (p.description ?? "").trim().slice(0, 140),
          }));
      }
      if (typeof parsed.segmento === "string" && SEGMENTOS.some((x) => x.id === parsed.segmento)) segmento = parsed.segmento;
      if (["vender", "apresentar", "atender"].includes(parsed.objetivo)) objetivo = parsed.objetivo;
      if (typeof parsed.conversao === "string" && CONVERSOES.some((c) => c.id === parsed.conversao)) conversao = parsed.conversao;
      if (parsed.demo && typeof parsed.demo.pergunta === "string" && typeof parsed.demo.resposta === "string" && parsed.demo.resposta.trim()) {
        demo = { pergunta: parsed.demo.pergunta.trim().slice(0, 120), resposta: parsed.demo.resposta.trim().slice(0, 420) };
      }
      if (parsed.oferta && typeof parsed.oferta.titulo === "string" && parsed.oferta.titulo.trim()) {
        const tipo = parsed.oferta.tipo === "fixed" ? "fixed" : "percent";
        const bruto = Number(parsed.oferta.valor);
        const valor = Number.isFinite(bruto) && bruto > 0 ? (tipo === "percent" ? Math.min(30, Math.round(bruto)) : Math.min(200, Math.round(bruto))) : 10;
        oferta = { titulo: parsed.oferta.titulo.trim().slice(0, 40), tipo, valor };
      }
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
    // Prioridade: cores medidas na identidade do site. A sugestão da Orbi só
    // completa quando o site não deu cores suficientes (ou não há site).
    let finalColors: { hex: string; role: string }[];
    if (temPaletaMedida) {
      finalColors = medidas;
    } else if (medidas.length === 1) {
      const extras = (palette ?? []).filter((h) => h.toLowerCase() !== medidas[0].hex.toLowerCase());
      finalColors = [medidas[0].hex, ...extras].slice(0, 5).map((hex, i) => ({ hex, role: roles[i] ?? "detail" }));
    } else {
      finalColors =
        palette && palette.length > 0
          ? palette.map((hex, i) => ({ hex, role: roles[i] ?? "detail" }))
          : colors;
    }

    return NextResponse.json({ personality, colors: finalColors, voiceSummary, font, resumo, pontosFortes, segmento, objetivo, conversao, demo, oferta, siteAnalyzed: !!siteText });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao analisar marca." }, { status: 500 });
  }
}
