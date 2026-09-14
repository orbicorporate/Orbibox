import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

import { AI_MODEL, ANTHROPIC_API_URL } from "@/lib/aiModel";

function apiKey() {
  return process.env.ANTHROPIC_API_KEY || process.env.CHAVE_API_ANTROPICA;
}

async function callClaude(system: string, userText: string, maxTokens: number) {
  const key = apiKey();
  if (!key) throw new Error("sem chave");
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: userText }] }),
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
      supabase.from("businesses").select("name, about_business, differentials, policies, contact_whatsapp, service_modes, brand_voice_summary").eq("id", businessId).maybeSingle(),
      supabase.from("content_items").select("id, title, description, price, brand_label").eq("business_id", businessId).eq("status", "published").limit(30),
    ]);

    const catalog = (items ?? [])
      .map((c) => `[id:${c.id}] ${c.title}${c.brand_label ? ` (${c.brand_label})` : ""}${c.price != null ? ` R$${Number(c.price).toFixed(2)}` : ""}${c.description ? `, ${c.description}` : ""}`)
      .join("\n");

    if (!catalog) return NextResponse.json({ questions: [], products: [] });

    const contexto = `Negócio: ${biz?.name ?? ""}. ${biz?.about_business ? "Sobre: " + biz.about_business + ". " : ""}${biz?.differentials ? "Diferenciais: " + biz.differentials + ". " : ""}${biz?.policies ? "Políticas: " + biz.policies + ". " : ""}\n\nCatálogo:\n${catalog}`;

    // MODO 1: perguntas-chave. Se o dono definiu uma customizada, usa ela.
    if (mode === "questions") {
      const { data: cfg } = await supabase
        .from("agent_configs")
        .select("curation_question, curation_options")
        .eq("business_id", businessId)
        .maybeSingle();
      const custom = cfg?.curation_question?.trim();
      const customOpts = Array.isArray(cfg?.curation_options) ? (cfg.curation_options as string[]).filter(Boolean) : [];
      if (custom && customOpts.length >= 2) {
        return NextResponse.json({ pergunta: custom, opcoes: customOpts.slice(0, 4) });
      }

      const system = `Você é a inteligência de curadoria de uma vitrine. Olhando o catálogo de um negócio específico, crie UMA pergunta curta e envolvente pra fazer ao visitante (como "O que bateu vontade hoje?" numa sorveteria, ou "Qual seu momento?" numa loja), e de 3 a 4 respostas possíveis, curtas (1-3 palavras cada), que dividam o catálogo de formas úteis e reais pra ESSE negócio. As respostas devem refletir o que o catálogo realmente oferece, nada genérico. Português do Brasil, tom leve.

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
      // Regras fixas pra a resposta nunca sair genérica, em qualquer ramo:
      // reconhece o que a pessoa quer, prova que o negócio faz isso (com um
      // fato real do próprio contexto) e convida pra conversar agora.
      const system = `Você é a curadora inteligente da vitrine de ${biz?.name ?? "um negócio"}${biz?.brand_voice_summary ? `, com este tom de voz: ${biz.brand_voice_summary}` : ""}. O visitante escolheu: "${question}".

Escolha do catálogo os itens que MAIS combinam com isso (no máximo 4), por ordem de relevância.

A frase de apresentação segue SEMPRE esta estrutura, em 2 frases curtas no total:
1. Reconheça o que ele quer e afirme que o negócio faz isso, com confiança. Ex: "Ótima escolha, isso é com a gente."
2. Dê UM motivo concreto pra confiar, tirado do que você sabe do negócio (um diferencial real, tempo de casa, um cliente conhecido, algo do catálogo). Nunca invente.

Regras que valem sempre:
- Nunca use elogio vazio ("combinam perfeitamente", "seleção especial", "as melhores opções") sem um fato que sustente.
- Nunca repita a frase que o visitante escolheu palavra por palavra.
- Fale como um dono atencioso que conhece o próprio negócio, não como catálogo automático.
- Se o catálogo não tiver nada que sirva, diga isso com honestidade em vez de empurrar item que não combina.
- Máximo 35 palavras somando as duas frases. Português do Brasil. Nunca use travessão.

Escreva também o convite pra falar com uma pessoa agora ("convite"), curto e específico pro que ele escolheu. Ex: "Quer falar com a gente sobre isso agora?". Máximo 9 palavras.

Responda APENAS um JSON válido, sem texto antes ou depois:
{"frase":"...","convite":"...","ids":["id1","id2"]}
Use só ids que existem no catálogo. Se nada combinar bem, retorne poucos ou nenhum.`;
      const raw = await callClaude(system, contexto, 400);
      try {
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        const validIds = new Set((items ?? []).map((i) => i.id));
        const ids = (parsed.ids ?? []).filter((id: string) => validIds.has(id)).slice(0, 4);
        const limpar = (s: string) => s.replace(/\s*—\s*/g, ", ").replace(/\s*–\s*/g, ", ");
        return NextResponse.json({
          frase: limpar(String(parsed.frase ?? "Separei estas opções pra você:")),
          convite: parsed.convite ? limpar(String(parsed.convite)) : "Quer falar com a gente agora?",
          // O botão só aparece se o negócio tiver WhatsApp cadastrado.
          whatsapp: biz?.contact_whatsapp ?? null,
          ids,
        });
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
