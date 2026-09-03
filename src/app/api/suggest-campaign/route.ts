import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

const BEST_HOURS: Record<string, string> = {
  instagram: "19h",
  whatsapp: "11h",
  direct: "20h",
};

export async function POST(req: NextRequest) {
  try {
    const { businessId, channel, title } = await req.json();
    if (!businessId || !channel || !title) {
      return NextResponse.json({ error: "businessId, channel e title são obrigatórios." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: business } = await supabase
      .from("businesses")
      .select("name, brand_voice_summary")
      .eq("id", businessId)
      .maybeSingle();

    const { data: content } = await supabase
      .from("content_items")
      .select("title, description, price")
      .eq("business_id", businessId)
      .eq("status", "published")
      .order("ai_score", { ascending: false, nullsFirst: false })
      .limit(5);

    const catalog = (content ?? [])
      .map((c) => `- ${c.title}${c.price != null ? ` (R$ ${Number(c.price).toFixed(2)})` : ""}`)
      .join("\n");

    const system = `Você é a Orbi, a camada de inteligência do Orbibox. Sua tarefa é escrever uma sugestão curta de campanha para o canal "${channel}" do negócio "${business?.name ?? ""}".
${business?.brand_voice_summary ? `Tom de voz: ${business.brand_voice_summary}` : ""}
${catalog ? `Catálogo disponível para promover:\n${catalog}` : "Ainda não há produtos publicados."}

Responda em UMA frase curta (máx. 30 palavras), no formato: recomendação de produto a promover + horário sugerido (use ${BEST_HOURS[channel] ?? "um horário de pico"}). Comece com "✦".`;

    const suggestion = await askClaude({
      system,
      messages: [{ role: "user", content: `Nome da campanha: ${title}` }],
      maxTokens: 120,
    });

    return NextResponse.json({ content: suggestion.trim() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao gerar sugestão de campanha." }, { status: 500 });
  }
}
