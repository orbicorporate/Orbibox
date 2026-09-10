import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

function apiKey() {
  return process.env.ANTHROPIC_API_KEY || process.env.CHAVE_API_ANTROPICA;
}

async function callClaude(system: string, userText: string, maxTokens: number) {
  const key = apiKey();
  if (!key) throw new Error("sem chave");
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: userText }] }),
  });
  if (!res.ok) throw new Error("erro api " + res.status);
  const data = await res.json();
  const block = data.content?.find((b: { type: string }) => b.type === "text");
  return (block?.text ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, mode, question } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId" }, { status: 400 });

    const supabase = await createClient();
    const [{ data: biz }, { data: items }] = await Promise.all([
      supabase.from("businesses").select("name, about_business, differentials").eq("id", businessId).maybeSingle(),
      supabase.from("content_items").select("id, title, description, price, brand_label").eq("business_id", businessId).eq("status", "published").limit(30),
    ]);

    const catalog = (items ?? [])
      .map((c) => `[id:${c.id}] ${c.title}${c.brand_label ? ` (${c.brand_label})` : ""}${c.price != null ? ` R$${Number(c.price).toFixed(2)}` : ""}${c.description ? ` — ${c.description}` : ""}`)
      .join("\n");

    if (!catalog) return NextResponse.json({ questions: [], products: [] });

    const contexto = `Negócio: ${biz?.name ?? ""}. ${biz?.about_business ? "Sobre: " + biz.about_business + ". " : ""}${biz?.differentials ? "Diferenciais: " + biz.differentials + ". " : ""}\n\nCatálogo:\n${catalog}`;

    // MODO 1: gerar as perguntas-chave estratégicas a partir do catálogo real.
    if (mode === "questions") {
      const system = `Você é a inteligência de curadoria de uma vitrine. Olhando o catálogo de um negócio específico, crie UMA pergunta curta e envolvente pra fazer ao visitante (como "O que bateu vontade hoje?" numa sorveteria, ou "Qual seu momento?" numa loja), e de 3 a 4 respostas possíveis, curtas (1-3 palavras cada), que dividam o catálogo de formas úteis e reais pra ESSE negócio. As respostas devem refletir o que o catálogo realmente oferece — nada genérico. Português do Brasil, tom leve.

Responda APENAS um JSON válido, sem texto antes ou depois, no formato:
{"pergunta":"...","opcoes":["...","...","..."]}`;
      const raw = await callClaude(system, contexto, 300);
      try {
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return NextResponse.json({ pergunta: parsed.pergunta, opcoes: (parsed.opcoes ?? []).slice(0, 4) });
      } catch {
        return NextResponse.json({ pergunta: null, opcoes: [] });
      }
    }

    // MODO 2: curar os produtos pra uma resposta escolhida.
    if (mode === "curate" && question) {
      const system = `Você é a curadora inteligente da vitrine de ${biz?.name ?? "um negócio"}. O visitante escolheu: "${question}". Escolha do catálogo os itens que MAIS combinam com isso (no máximo 4), pela ordem de relevância. Escreva uma frase curta, calorosa e personalizada apresentando a seleção (como "Separei essas pra você porque combinam com um dia quente"), e liste os ids escolhidos.

Responda APENAS um JSON válido, sem texto antes ou depois:
{"frase":"...","ids":["id1","id2"]}
Use só ids que existem no catálogo. Se nada combinar bem, retorne poucos ou nenhum.`;
      const raw = await callClaude(system, contexto, 400);
      try {
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        const validIds = new Set((items ?? []).map((i) => i.id));
        const ids = (parsed.ids ?? []).filter((id: string) => validIds.has(id)).slice(0, 4);
        return NextResponse.json({ frase: parsed.frase ?? "Separei estas opções pra você:", ids });
      } catch {
        return NextResponse.json({ frase: "Separei estas opções pra você:", ids: [] });
      }
    }

    return NextResponse.json({ error: "modo inválido" }, { status: 400 });
  } catch (error) {
    console.error("Erro no curador:", error);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
