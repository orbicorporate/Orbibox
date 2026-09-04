import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

/**
 * Olha pra vitrine de verdade (o que tem, o que falta) e devolve 7 insights,
 * cada um de um ângulo diferente (preço, organização, fotos, descrição,
 * formato, atendimento, marketing) — pra nunca repetir o mesmo conselho
 * quando o dono pede "gerar novo insight" de novo.
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId é obrigatório." }, { status: 400 });

    const supabase = await createClient();

    const [{ data: business }, { data: items }, { data: agent }] = await Promise.all([
      supabase.from("businesses").select("name, site_type, contact_whatsapp").eq("id", businessId).maybeSingle(),
      supabase.from("content_items").select("title, description, price, image_url, image_is_placeholder, brand_label, status").eq("business_id", businessId),
      supabase.from("agent_configs").select("objectives").eq("business_id", businessId).maybeSingle(),
    ]);

    const all = items ?? [];
    const published = all.filter((i) => i.status === "published");
    const drafts = all.filter((i) => i.status !== "published");
    const semFoto = published.filter((i) => !i.image_url).length;
    const comSugerida = published.filter((i) => i.image_is_placeholder).length;
    const semDescricao = published.filter((i) => !i.description?.trim()).length;
    const semPreco = published.filter((i) => i.price == null).length;
    const categorias = Array.from(new Set(published.map((i) => i.brand_label?.trim()).filter(Boolean)));
    const formatosVariados = new Set(published.map((i) => i.brand_label)).size;

    if (published.length === 0) {
      return NextResponse.json({ insights: ["Nenhum item está ativo — os visitantes ainda não veem nada na sua vitrine. Publique pelo menos um pra começar."] });
    }

    const resumo = `Negócio: ${business?.name ?? "—"} (${business?.site_type ?? "tipo não identificado"})
Itens publicados: ${published.length}. Rascunhos: ${drafts.length}.
Sem foto: ${semFoto}. Com imagem sugerida (não é foto própria): ${comSugerida}.
Sem descrição: ${semDescricao}. Sem preço: ${semPreco}.
Categorias: ${categorias.length > 0 ? categorias.join(", ") : "nenhuma — tudo em Destaques"} (${formatosVariados} distintas).
WhatsApp configurado: ${business?.contact_whatsapp ? "sim" : "não"}.
Objetivos da Zara: ${(agent?.objectives ?? []).join(", ") || "não definidos"}.`;

    const system = `Você é a Orbi, a inteligência do Orbibox. Olhe o resumo da vitrine do dono e gere 7 insights curtos, cada um olhando por um ângulo diferente:
1. Preço — itens sem preço, oportunidade de destacar valor.
2. Organização/Categorias — como os itens estão agrupados.
3. Fotos — itens sem foto própria ou com imagem sugerida.
4. Descrição — itens sem descrição, clareza do que é oferecido.
5. Formato/Vitrine — variedade de formato (Destaque/Largo/Médio/Alto), ritmo visual.
6. Atendimento — WhatsApp, Zara configurada, facilidade de contato.
7. Marketing/Alcance — próximo passo comercial: campanha, diversificação, testar preço.

REGRAS:
- Cada insight: no máximo 2 frases curtas, completas (nunca corte no meio).
- Fale direto com o dono, português do Brasil, tom próximo mas objetivo — nunca robótico.
- Sempre em tom de SUGESTÃO ou PERGUNTA, nunca ordem seca. Use formas como "Vale a pena...", "Já pensou em...", "Que tal...", "Se fizer sentido, considera...".
- Nunca invente números fora do resumo dado.
- Se aquele aspecto específico já estiver bem cuidado (ex: todos têm foto), elogie brevemente nessa frase e sugira o próximo passo natural daquele ângulo, não repita o mesmo conselho de outro insight.
- Responda SOMENTE JSON válido, sem texto fora do JSON: {"insights":["...", "...", "...", "...", "...", "...", "..."]} — exatamente 7 strings, na ordem dos 7 ângulos acima.`;

    const raw = await askClaude({ system, messages: [{ role: "user", content: resumo }], maxTokens: 900 });

    let insights: string[] = [];
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw);
      if (Array.isArray(parsed.insights)) insights = parsed.insights.filter((s: unknown) => typeof s === "string" && s.trim());
    } catch (e) {
      console.error("vitrine-insight: falha ao parsear", e, raw.slice(0, 300));
    }

    if (insights.length === 0) {
      insights = [`Você tem ${published.length} ${published.length === 1 ? "item ativo" : "itens ativos"}. Itens com foto e descrição própria convertem mais do que os que ficaram com imagem sugerida.`];
    }

    return NextResponse.json({ insights });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui gerar o insight agora." }, { status: 500 });
  }
}
