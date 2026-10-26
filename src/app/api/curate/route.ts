import { NextRequest, NextResponse } from "next/server";
import { limitar } from "@/lib/apiGuard";
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
  const lento = limitar(req, "curate", 20);
  if (lento) return lento;
  try {
    const { businessId, mode, question } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId" }, { status: 400 });

    const supabase = await createClient();
    const [{ data: biz }, { data: items }] = await Promise.all([
      supabase.from("businesses").select("name, about_business, differentials, policies, contact_whatsapp, service_modes, brand_voice_summary").eq("id", businessId).maybeSingle(),
      supabase.from("content_items").select("id, title, description, price, price_type, price_max, image_url, brand_label").eq("business_id", businessId).eq("status", "published").order("position", { ascending: true }).limit(30),
    ]);

    const catalog = (items ?? [])
      .map((c) => `[id:${c.id}] ${c.title}${c.brand_label ? ` (${c.brand_label})` : ""}${c.price != null ? ` R$${Number(c.price).toFixed(2)}` : ""}${c.description ? `, ${c.description}` : ""}`)
      .join("\n");

    if (!catalog) return NextResponse.json({ questions: [], products: [] });

    const contexto = `Negócio: ${biz?.name ?? ""}. ${biz?.about_business ? "Sobre: " + biz.about_business + ". " : ""}${biz?.differentials ? "Diferenciais: " + biz.differentials + ". " : ""}${biz?.policies ? "Políticas: " + biz.policies + ". " : ""}\n\nCatálogo:\n${catalog}`;

    // MODO 1: perguntas-chave. Se o dono definiu uma customizada, usa ela.
    if (mode === "questions") {
      const [{ data: cfg }, { data: gift }] = await Promise.all([
        supabase.from("agent_configs").select("curation_question, curation_options, tone_formal_informal, tone_reserved_energetic, tone_concise_detailed").eq("business_id", businessId).maybeSingle(),
        supabase.from("gift_settings").select("enabled").eq("business_id", businessId).maybeSingle(),
      ]);
      const giftEnabled = !!gift?.enabled;
      // "Para presente" garante acesso ao gift card direto na pergunta de
      // curadoria, sem precisar de um box à parte. Só entra se o negócio
      // aceita gift cards, e só se nenhuma opção já cobrir isso.
      function comGift(opcoes: string[]): string[] {
        if (!giftEnabled) return opcoes;
        if (opcoes.some((o) => o.toLowerCase().includes("presente"))) return opcoes;
        return opcoes.length >= 4 ? [...opcoes.slice(0, 3), "Para presente"] : [...opcoes, "Para presente"];
      }

      const custom = cfg?.curation_question?.trim();
      const customOpts = Array.isArray(cfg?.curation_options) ? (cfg.curation_options as string[]).filter(Boolean) : [];
      if (custom && customOpts.length >= 2) {
        return NextResponse.json({ pergunta: custom, opcoes: comGift(customOpts.slice(0, 4)) });
      }

      // O tom de voz configurado em "Sua IA" vale também para a pergunta e as respostas.
      const fi = cfg?.tone_formal_informal ?? 50, re = cfg?.tone_reserved_energetic ?? 50, cd = cfg?.tone_concise_detailed ?? 50;
      const tomDeVoz = `Tom de voz da marca: ${[
        fi > 60 ? "descontraído e informal (pode usar 'você' leve, expressões do dia a dia)" : fi < 40 ? "formal e elegante (sem gírias, sem diminutivos, frases bem construídas)" : "neutro e cordial",
        re > 60 ? "proativo e convidativo" : re < 40 ? "reservado e discreto" : "equilibrado",
        cd > 60 ? "inspiracional, com um toque de sensação" : cd < 40 ? "direto e curto" : "claro e objetivo",
      ].join(", ")}. Nunca use travessão.`;
      const system = `Você é a inteligência de curadoria de uma vitrine. Olhando o catálogo de um negócio específico, crie UMA pergunta curta e envolvente pra fazer ao visitante (como "O que bateu vontade hoje?" numa sorveteria, ou "Qual seu momento?" numa loja), e de 3 a 4 respostas possíveis, curtas (1-3 palavras cada), que dividam o catálogo de formas úteis e reais pra ESSE negócio. As respostas devem refletir o que o catálogo realmente oferece, nada genérico. Português do Brasil. ${tomDeVoz}

Responda APENAS um JSON válido, sem texto antes ou depois, no formato:
{"pergunta":"...","opcoes":["...","...","..."]}`;
      const raw = await callClaude(system, contexto, 300);
      try {
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        return NextResponse.json({ pergunta: parsed.pergunta, opcoes: comGift((parsed.opcoes ?? []).slice(0, 4)) });
      } catch {
        return NextResponse.json({ pergunta: null, opcoes: [] });
      }
    }

    // MODO 2: curar os produtos pra uma resposta escolhida.
    if (mode === "curate" && question) {
      const { data: tcfg } = await supabase.from("agent_configs").select("tone_formal_informal, tone_reserved_energetic, tone_concise_detailed").eq("business_id", businessId).maybeSingle();
      const tf = tcfg?.tone_formal_informal ?? 50, tr = tcfg?.tone_reserved_energetic ?? 50, tc = tcfg?.tone_concise_detailed ?? 50;
      const tomCfg = `Tom de voz configurado pelo dono: ${[
        tf > 60 ? "descontraído e informal" : tf < 40 ? "formal e elegante (sem gírias nem diminutivos)" : "neutro e cordial",
        tr > 60 ? "proativo" : tr < 40 ? "reservado" : "equilibrado",
        tc > 60 ? "inspiracional" : tc < 40 ? "direto e curto" : "claro e objetivo",
      ].join(", ")}.`;
      // Regras fixas pra a resposta nunca sair genérica, em qualquer ramo:
      // reconhece o que a pessoa quer, prova que o negócio faz isso (com um
      // fato real do próprio contexto) e convida pra conversar agora.
      const system = `Você é a curadora inteligente da vitrine de ${biz?.name ?? "um negócio"}${biz?.brand_voice_summary ? `, com este tom de voz: ${biz.brand_voice_summary}` : ""}. O visitante escolheu: "${question}".
${tomCfg}

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
      const todos = items ?? [];
      const limpar = (s: string) => s.replace(/\s*—\s*/g, ", ").replace(/\s*–\s*/g, ", ");
      // Garantia: se a IA falhar, vier sem ids ou com ids inválidos, a Orbi
      // ainda mostra itens reais (os que mais combinam com o texto escolhido,
      // ou os primeiros do catálogo). Nunca promete opções e deixa a lista vazia.
      const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const palavras = norm(question).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
      const porTexto = () => {
        const pontos = todos.map((i) => {
          const alvo = norm(`${i.title} ${i.brand_label ?? ""} ${i.description ?? ""}`);
          return { i, n: palavras.reduce((acc, w) => acc + (alvo.includes(w) ? 1 : 0), 0) };
        });
        const achados = pontos.filter((p) => p.n > 0).sort((a, b) => b.n - a.n).map((p) => p.i);
        return (achados.length > 0 ? achados : todos).slice(0, 4);
      };
      const montar = (ids: string[], frase: string, convite: string | null) => {
        const porId = new Map(todos.map((i) => [i.id, i]));
        const escolhidos = ids.map((id) => porId.get(id)).filter((x): x is NonNullable<typeof x> => !!x);
        return NextResponse.json({
          frase,
          convite,
          // O botão só aparece se o negócio tiver WhatsApp cadastrado.
          whatsapp: biz?.contact_whatsapp ?? null,
          ids: escolhidos.map((i) => i.id),
          // Os itens vêm completos daqui: a tela não depende de já ter carregado o produto.
          itens: escolhidos.map((i) => ({ id: i.id, title: i.title, price: i.price, price_type: i.price_type, price_max: i.price_max, image_url: i.image_url })),
        });
      };
      const fraseFallback = "Estas são as opções que mais combinam com o que você escolheu:";
      let raw = "";
      try {
        raw = await callClaude(system, contexto, 800);
      } catch {
        return montar(porTexto().map((i) => i.id), fraseFallback, "Quer falar com a gente agora?");
      }
      try {
        // Pega o primeiro objeto JSON, mesmo com texto ou cercas de código em volta.
        const ini = raw.indexOf("{"), fim = raw.lastIndexOf("}");
        const parsed = JSON.parse(raw.slice(ini, fim + 1));
        const validIds = new Set(todos.map((i) => i.id));
        let ids: string[] = (Array.isArray(parsed.ids) ? parsed.ids : []).filter((id: string) => validIds.has(id)).slice(0, 4);
        let frase = limpar(String(parsed.frase ?? "")).trim();
        if (ids.length === 0) {
          ids = porTexto().map((i) => i.id);
          frase = fraseFallback;
        }
        return montar(ids, frase || fraseFallback, parsed.convite ? limpar(String(parsed.convite)) : "Quer falar com a gente agora?");
      } catch {
        return montar(porTexto().map((i) => i.id), fraseFallback, "Quer falar com a gente agora?");
      }
    }

    return NextResponse.json({ error: "modo inválido" }, { status: 400 });
  } catch (error) {
    console.error("Erro no curador:", error);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
