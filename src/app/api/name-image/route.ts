import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

// Contexto por ramo pra a IA nomear no jargão certo do negócio.
const CONTEXTO: Record<string, string> = {
  moda: "uma loja de roupas/moda (boutique, brechó, ateliê)",
  restaurante: "um restaurante",
  loja: "uma loja de artigos/presentes/decoração",
  servicos: "uma empresa de serviços (consultoria, agência)",
  pizzaria: "uma pizzaria",
  imobiliaria: "uma imobiliária",
  fotografo: "um fotógrafo/estúdio",
  salao: "um salão de beleza/barbearia",
  doceria: "uma doceria/confeitaria",
  academia: "uma academia/estúdio fitness",
};

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType, theme } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 é obrigatório." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CHAVE_API_ANTROPICA;
    if (!apiKey) {
      return NextResponse.json({ error: "Chave da API não configurada." }, { status: 500 });
    }

    const ramo = CONTEXTO[theme] ?? "um negócio";
    const system = `Você nomeia fotos para a vitrine de ${ramo}. Olhe a imagem e devolva um nome curto e comercial (2 a 4 palavras) para o item mostrado, como apareceria num cardápio ou catálogo. Português do Brasil. Sem aspas, sem ponto final, sem explicação — responda APENAS o nome.`;

    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 30,
        system,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
              { type: "text", text: "Nomeie este item." },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Erro visão:", res.status, text);
      return NextResponse.json({ error: "Erro ao analisar a imagem." }, { status: 500 });
    }

    const data = await res.json();
    const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
    const nome = (textBlock?.text ?? "").trim().replace(/^["']|["']$/g, "").replace(/\.$/, "");

    return NextResponse.json({ name: nome });
  } catch (error) {
    console.error("Erro ao nomear imagem:", error);
    return NextResponse.json({ error: "Erro ao nomear a imagem." }, { status: 500 });
  }
}
