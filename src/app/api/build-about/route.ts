import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

const DIFF_ICONS = ["◎", "◈", "◇", "☎", "✦", "◫"];

/**
 * Quando a Base de Conhecimento (catálogo, história, políticas, diferenciais)
 * está toda preenchida, a Orbi já tem o que precisa pra tecer isso numa
 * página "Sobre" coesa — em vez de blocos soltos escritos em momentos
 * diferentes. Essa rota lê o que já existe e devolve uma versão costurada.
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) {
      return NextResponse.json({ error: "businessId é obrigatório." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: business } = await supabase
      .from("businesses")
      .select("name, about_business, differentials, differentials_cards, policies, brand_voice_summary")
      .eq("id", businessId)
      .maybeSingle();
    if (!business) {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }

    const { data: items } = await supabase
      .from("content_items")
      .select("title")
      .eq("business_id", businessId)
      .eq("status", "published")
      .limit(12);
    const catalogo = (items ?? []).map((i) => i.title).join(", ");

    const rawCards = business.differentials_cards;
    const diferenciaisAtuais = Array.isArray(rawCards) && rawCards.length > 0
      ? (rawCards as { title: string; description?: string }[]).map((c) => `${c.title}${c.description ? ` — ${c.description}` : ""}`).join("; ")
      : (business.differentials ?? "");

    const system = `Você é a Orbi, a IA do Orbibox. A pessoa já preencheu, em momentos diferentes, os pedaços da página "Sobre" de "${business.name}": história da marca, diferenciais e políticas. Sua tarefa é tecer isso numa página "Sobre" coesa e fluida, sem repetir informação nem soar como blocos colados.

Responda SOMENTE em JSON válido, sem markdown, sem texto antes ou depois, no formato exato:
{"about":"...", "differentials":[{"title":"...","description":"..."}]}

Regras:
- "about": 2 a 4 frases em português do Brasil, terceira pessoa, tom ${business.brand_voice_summary || "próximo e natural"} — conte quem são e o que fazem, incorporando a essência da história já escrita, sem inventar fatos novos.
- "differentials": 3 a 4 cards, cada um com "title" curto (2-5 palavras) e "description" em uma frase (até 14 palavras). Refine os diferenciais já escritos — deixe cada um mais direto e atraente — não invente diferenciais que não existiam.
- Nunca invente dado factual (datas, números, prêmios) que não esteja no material original.
- Não repita no "about" o que já vai aparecer nos cards de diferenciais.`;

    const userMsg = `História da marca (texto atual): ${business.about_business || "(vazio)"}
Diferenciais (texto/cards atuais): ${diferenciaisAtuais || "(vazio)"}
Políticas (contexto, não precisa repetir na página): ${business.policies || "(vazio)"}
Alguns itens do catálogo publicado, pra dar contexto do que é oferecido: ${catalogo || "(nenhum ainda)"}`;

    const raw = await askClaude({ system, messages: [{ role: "user", content: userMsg }], maxTokens: 700 });
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);

    const about: string = typeof parsed.about === "string" ? parsed.about.trim() : business.about_business ?? "";
    const differentials = Array.isArray(parsed.differentials)
      ? parsed.differentials
          .filter((d: unknown): d is { title: string; description?: string } => !!d && typeof d === "object" && typeof (d as { title?: unknown }).title === "string")
          .slice(0, 4)
          .map((d: { title: string; description?: string }, i: number) => ({
            icon: DIFF_ICONS[i % DIFF_ICONS.length],
            title: d.title,
            description: d.description ?? "",
          }))
      : [];

    await supabase
      .from("businesses")
      .update({
        about_business: about,
        differentials_cards: differentials.length > 0 ? differentials : rawCards,
      })
      .eq("id", businessId);

    return NextResponse.json({ about, differentials });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui montar a página agora. Tenta de novo." }, { status: 500 });
  }
}
