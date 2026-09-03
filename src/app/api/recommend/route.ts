import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId obrigatório." }, { status: 400 });

    const supabase = await createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("name, brand_voice_summary")
      .eq("id", businessId)
      .maybeSingle();

    const { data: content } = await supabase
      .from("content_items")
      .select("title, description, price, brand_label")
      .eq("business_id", businessId)
      .eq("status", "published")
      .limit(12);

    if (!content || content.length === 0) {
      return NextResponse.json({ message: null });
    }

    const catalog = content
      .map((c) => `- ${c.title}${c.brand_label ? ` (${c.brand_label})` : ""}${c.price != null ? ` R$ ${Number(c.price).toFixed(2)}` : ""}${c.description ? `: ${c.description}` : ""}`)
      .join("\n");

    const system = `Você é a Orbi, a inteligência do Orbibox do negócio "${business?.name ?? ""}".
${business?.brand_voice_summary ? `Tom de voz: ${business.brand_voice_summary}` : ""}
Olhando o catálogo, escreva uma recomendação contextual curta e calorosa para o visitante — como um vendedor atencioso notaria um padrão e sugeriria algo. Ex: "Notei que você gosta de X. Que tal conhecer Y?".
Responda SOMENTE JSON válido, sem markdown:
{"message":"uma a duas frases, no máximo 30 palavras","cta":"texto curto do botão, máx 3 palavras"}
Baseie-se apenas nos itens reais abaixo. Não invente produtos.`;

    const raw = await askClaude({
      system,
      messages: [{ role: "user", content: `Catálogo:\n${catalog}` }],
      maxTokens: 300,
    });

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw);
      return NextResponse.json({ message: parsed.message ?? null, cta: parsed.cta ?? "Explorar" });
    } catch {
      return NextResponse.json({ message: null });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: null });
  }
}
