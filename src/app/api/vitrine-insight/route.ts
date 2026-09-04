import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

/**
 * Olha pra vitrine de verdade (o que tem, o que falta) e devolve um insight
 * curto e específico — não um texto genérico fixo. É isso que o botão
 * "Gerar novo insight" chama, então cada clique pode trazer um ângulo diferente.
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId é obrigatório." }, { status: 400 });

    const supabase = await createClient();

    const [{ data: business }, { data: items }] = await Promise.all([
      supabase.from("businesses").select("name, site_type").eq("id", businessId).maybeSingle(),
      supabase.from("content_items").select("title, description, price, image_url, image_is_placeholder, brand_label, status").eq("business_id", businessId),
    ]);

    const all = items ?? [];
    const published = all.filter((i) => i.status === "published");
    const drafts = all.filter((i) => i.status !== "published");
    const semFoto = published.filter((i) => !i.image_url).length;
    const comSugerida = published.filter((i) => i.image_is_placeholder).length;
    const semDescricao = published.filter((i) => !i.description?.trim()).length;
    const semPreco = published.filter((i) => i.price == null).length;
    const categorias = Array.from(new Set(published.map((i) => i.brand_label?.trim()).filter(Boolean)));

    if (published.length === 0) {
      return NextResponse.json({ insight: "Nenhum item está ativo — os visitantes ainda não veem nada na sua vitrine. Publique pelo menos um pra começar." });
    }

    const resumo = `Negócio: ${business?.name ?? "—"} (${business?.site_type ?? "tipo não identificado"})
Itens publicados: ${published.length}. Rascunhos: ${drafts.length}.
Sem foto: ${semFoto}. Com imagem sugerida (não é foto própria): ${comSugerida}.
Sem descrição: ${semDescricao}. Sem preço: ${semPreco}.
Categorias: ${categorias.length > 0 ? categorias.join(", ") : "nenhuma — tudo em Destaques"}.`;

    const system = `Você é a Orbi, a inteligência do Orbibox. Olhe o resumo da vitrine do dono e dê UM insight curto, específico e acionável — a coisa mais importante pra ele fazer agora pra melhorar a conversão. Fale direto com o dono, em português do Brasil, tom próximo mas objetivo. 2 frases no máximo. Nunca invente números fora do resumo. Se estiver tudo bem cuidado, elogie brevemente e sugira o próximo passo natural (ex: testar preços, revisar categorias).`;

    const insight = await askClaude({ system, messages: [{ role: "user", content: resumo }], maxTokens: 200 });

    return NextResponse.json({ insight: insight.trim() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui gerar o insight agora." }, { status: 500 });
  }
}
