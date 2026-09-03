import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { businessId, conversationId, message, history } = await req.json();

    if (!businessId || !message) {
      return NextResponse.json({ error: "businessId e message são obrigatórios." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: business } = await supabase
      .from("businesses")
      .select("name, brand_voice_summary, about_business, differentials, policies, contact_whatsapp")
      .eq("id", businessId)
      .maybeSingle();

    const { data: agentConfig } = await supabase
      .from("agent_configs")
      .select("agent_name, tone_formal_informal, tone_reserved_energetic, tone_concise_detailed, objectives")
      .eq("business_id", businessId)
      .maybeSingle();

    const { data: content } = await supabase
      .from("content_items")
      .select("title, description, price")
      .eq("business_id", businessId)
      .eq("status", "published")
      .limit(15);

    const agentName = agentConfig?.agent_name ?? "Zara";
    const toneDesc = agentConfig
      ? [
          agentConfig.tone_formal_informal > 60 ? "informal" : agentConfig.tone_formal_informal < 40 ? "formal" : "neutro",
          agentConfig.tone_reserved_energetic > 60 ? "energética" : agentConfig.tone_reserved_energetic < 40 ? "reservada" : "equilibrada",
          agentConfig.tone_concise_detailed > 60 ? "detalhista" : agentConfig.tone_concise_detailed < 40 ? "concisa" : "direta ao ponto",
        ].join(", ")
      : "próxima e direta";

    const catalog = (content ?? [])
      .map((c) => `- ${c.title}${c.price != null ? ` (R$ ${Number(c.price).toFixed(2)})` : ""}${c.description ? `: ${c.description}` : ""}`)
      .join("\n");

    const system = `Você é ${agentName}, a assistente de IA (AgentBox) do negócio "${business?.name ?? "este negócio"}" dentro do Orbibox — uma plataforma de "web adaptativa".
Seu tom de voz é: ${toneDesc}.
Objetivos da conversa: ${agentConfig?.objectives?.join(", ") || "ajudar o visitante"}.
${business?.brand_voice_summary ? `Tom da marca: ${business.brand_voice_summary}` : ""}\n${business?.about_business ? `Sobre o negócio: ${business.about_business}` : ""}\n${business?.differentials ? `Diferenciais: ${business.differentials}` : ""}\n${business?.policies ? `Políticas (entrega, trocas, horários): ${business.policies}` : ""}
${catalog ? `Catálogo disponível:\n${catalog}` : "O catálogo ainda não tem produtos publicados."}

Regras:
- Respostas curtas (2-4 frases), como uma conversa real de chat, nunca um texto formal.
- Nunca invente produtos, preços ou promessas que não estejam no catálogo acima.
- Se não souber algo específico do negócio, seja honesta e ofereça encaminhar para um humano.
- Use no máximo um ✦ ocasionalmente, sem exagerar em emojis.`;

    const messages = [
      ...((history ?? []) as { role: string; content: string }[]).map((m) => ({
        role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const reply = await askClaude({ system, messages, maxTokens: 500 });

    if (conversationId) {
      await supabase.from("messages").insert({ conversation_id: conversationId, role: "agent", content: reply });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao gerar resposta da Zara." }, { status: 500 });
  }
}
