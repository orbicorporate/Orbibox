import { NextRequest, NextResponse } from "next/server";
import { limitar } from "@/lib/apiGuard";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const lento = limitar(req, "recommend", 20);
  if (lento) return lento;
  try {
    const { businessId, sessionId } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId obrigatório." }, { status: 400 });

    const supabase = await createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("name, brand_voice_summary")
      .eq("id", businessId)
      .maybeSingle();

    const { data: content } = await supabase
      .from("content_items")
      .select("id, title, description, price, brand_label")
      .eq("business_id", businessId)
      .eq("status", "published")
      .limit(12);

    if (!content || content.length === 0) {
      return NextResponse.json({ message: null });
    }

    const catalog = content
      .map((c) => `- ${c.title}${c.brand_label ? ` (${c.brand_label})` : ""}${c.price != null ? ` R$ ${Number(c.price).toFixed(2)}` : ""}${c.description ? `: ${c.description}` : ""}`)
      .join("\n");

    // O que essa pessoa clicou de verdade nessa sessão (categoria ou produto)
    //, sem isso, a recomendação era só um chute em cima do catálogo inteiro
    // e ignorava o interesse que o visitante já tinha sinalizado.
    let interesseDetectado = "";
    if (sessionId) {
      const { data: clicks } = await supabase
        .from("click_events")
        .select("content_item_id, kind, created_at")
        .eq("visitor_session_id", sessionId)
        .in("kind", ["categoria", "produto"])
        .not("content_item_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(3);

      const clickedIds = [...new Set((clicks ?? []).map((c) => c.content_item_id).filter(Boolean))] as string[];
      if (clickedIds.length > 0) {
        const clickedTitles = clickedIds
          .map((id) => content.find((c) => c.id === id)?.title)
          .filter(Boolean);
        if (clickedTitles.length > 0) {
          interesseDetectado = `O visitante clicou especificamente em: ${clickedTitles.join(", ")}. A recomendação PRECISA partir disso, não sugira outra categoria.`;
        }
      }
    }

    const system = `Você é a Orbi, a inteligência do Orbibox do negócio "${business?.name ?? ""}".
${business?.brand_voice_summary ? `Tom de voz: ${business.brand_voice_summary}` : ""}
${interesseDetectado || "Olhando o catálogo, sugira um item ao visitante, como um vendedor atencioso."}
Escreva uma frase curta (até 16 palavras) que sugere UM item do catálogo e diz por que vale a pena.
Nunca diga que notou, viu ou percebeu o interesse da pessoa. Nada de "Notei", "Vi que", "Percebi".
Ex: "Os Crocantes dão textura extra ao seu recheio favorito."
Responda SOMENTE JSON válido, sem markdown:
{"message":"a frase","item":"nome EXATO do item sugerido, copiado da lista","cta":"Ver <nome curto do item>, máx 3 palavras"}
Baseie-se apenas nos itens reais abaixo. Não invente produtos.`;

    const raw = await askClaude({
      system,
      messages: [{ role: "user", content: `Catálogo:\n${catalog}` }],
      maxTokens: 300,
    });

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw);
      // O botão leva ao item sugerido. Sem item reconhecido, não há botão.
      const alvo = typeof parsed.item === "string" ? content.find((c) => c.title.trim().toLowerCase() === parsed.item.trim().toLowerCase()) : undefined;
      const message = parsed.message ? String(parsed.message).replace(/\s*—\s*/g, ", ").replace(/\s*–\s*/g, ", ").replace(/^(notei|vi que|percebi)[^.]*\.\s*/i, "") : null;
      return NextResponse.json({ message, cta: alvo ? (parsed.cta ?? `Ver ${alvo.title}`) : null, itemId: alvo?.id ?? null });
    } catch {
      return NextResponse.json({ message: null });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: null });
  }
}
