import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

// Contexto por ramo pra a IA nomear no jargão certo do negócio.
const CONTEXTO: Record<string, string> = {
  moda: "uma loja de roupas/moda (boutique, brechó, ateliê)",
  joalheria: "uma joalheria / ourivesaria (anéis, colares, brincos, alianças, relógios, semijoias)",
  restaurante: "um restaurante",
  loja: "uma loja de artigos/presentes/decoração",
  fitness: "uma loja fitness / moda esportiva (roupas de treino, tênis, acessórios, suplementos, equipamentos)",
  servicos: "uma empresa de serviços (consultoria, agência)",
  pizzaria: "uma pizzaria",
  hamburgueria: "uma hamburgueria / lanchonete (hambúrgueres, batatas, combos, milk-shakes, lanches)",
  imobiliaria: "uma imobiliária",
  fotografo: "um fotógrafo/estúdio",
  grafica: "uma gráfica / papelaria (impressos, cartões de visita, cadernos, convites, banners, personalizados)",
  salao: "um salão de beleza/barbearia",
  estetica: "uma clínica de estética / spa (procedimentos faciais, corporais, depilação, harmonização, ambiente clean)",
  doceria: "uma doceria/confeitaria",
  sorveteria: "uma sorveteria / gelateria (sorvetes, casquinhas, taças, milk-shakes, açaí)",
  arquitetura: "um escritório de arquitetura / design de interiores (projetos, ambientes, plantas, obras)",
  investimentos: "uma assessoria de investimentos / gestão de patrimônio (fotos institucionais, gráficos, reuniões, escritório)",
};

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageUrl, mediaType, theme } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CHAVE_API_ANTROPICA;
    if (!apiKey) {
      return NextResponse.json({ error: "Chave da API não configurada." }, { status: 500 });
    }

    // Aceita a imagem em base64 (foto nova) OU uma URL (foto já salva) — nesse
    // caso baixa a imagem no servidor e converte pra base64.
    let base64 = imageBase64 as string | undefined;
    let mt = mediaType as string | undefined;
    if (!base64 && imageUrl) {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return NextResponse.json({ error: "Não foi possível baixar a imagem." }, { status: 400 });
      }
      mt = imgRes.headers.get("content-type") ?? "image/jpeg";
      const buf = Buffer.from(await imgRes.arrayBuffer());
      base64 = buf.toString("base64");
    }

    if (!base64) {
      return NextResponse.json({ error: "imageBase64 ou imageUrl é obrigatório." }, { status: 400 });
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
              { type: "image", source: { type: "base64", media_type: mt || "image/jpeg", data: base64 } },
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
