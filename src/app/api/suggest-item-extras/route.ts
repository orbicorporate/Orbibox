import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

/**
 * Gera duas coisas curtas e opcionais pra página própria de um item
 * (produto/serviço/categoria): uma lista curta de diferenciais/prova social
 * (só com base real no que o dono já contou sobre o negócio, nunca
 * inventada) e uma pergunta da Orbi pra puxar conversa sobre aquele item
 * específico. O dono pode editar, apagar ou completar o que vier, em
 * qualquer um dos campos, exatamente como já acontece com a descrição
 * melhorada.
 */
export async function POST(req: NextRequest) {
  try {
    const { contentItemId } = await req.json();
    if (!contentItemId) {
      return NextResponse.json({ error: "contentItemId é obrigatório." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: item } = await supabase
      .from("content_items")
      .select("id, title, description, type, business_id")
      .eq("id", contentItemId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("name, about_business, differentials, brand_voice_summary")
      .eq("id", item.business_id)
      .maybeSingle();

    const system = `Você é a Orbi, a camada de inteligência do Orbibox. Sua tarefa aqui tem duas partes curtas pra a página própria de um item (produto, serviço ou categoria):

1) DIFERENCIAL: até 3 linhas curtas de prova social ou credibilidade (tipo "18 anos de experiência", "+500 clientes atendidos", "Entrega em todo o Brasil"), uma por linha, cada uma começando com "DIFERENCIAL: ". REGRA MAIS IMPORTANTE: só escreva uma linha se existir uma base real e específica no contexto do negócio abaixo (tempo de mercado, número concreto, alcance, certificação etc). Nunca invente número, tempo ou dado que não esteja no contexto. Se a descrição do item (abaixo) já menciona esse mesmo dado, não repita, escreva sobre outro ângulo real ou pule. Se não houver nenhuma base específica o bastante, não escreva nenhuma linha DIFERENCIAL.

2) PERGUNTA: uma pergunta curta, natural, que a Orbi faria pra puxar conversa sobre ESSE item específico (baseada no título/descrição dele), do tipo que aparece antes do botão de contato pra incentivar a pessoa a continuar conversando. Sempre gere essa, mesmo sem contexto extra do negócio, mas mantenha coerente com o item. Máximo 80 caracteres, sem aspas.

Contexto do negócio (não invente além disso):
Marca: ${business?.name ?? ""}
Sobre o negócio: ${business?.about_business || "(sem informação)"}
Diferenciais: ${business?.differentials || "(nenhum informado)"}
${business?.brand_voice_summary ? `Tom de voz: ${business.brand_voice_summary}` : ""}

Responda só com linhas nesse formato, sem nada antes ou depois (zero a três linhas DIFERENCIAL, sempre uma linha PERGUNTA):
DIFERENCIAL: <texto>
DIFERENCIAL: <texto>
PERGUNTA: <texto>`;

    const userMsg = `Item: ${item.title}
Tipo: ${item.type}
Descrição: ${item.description || "(nenhuma)"}`;

    const raw = await askClaude({
      system,
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 260,
    });

    const strip = (s: string) => s.trim().replace(/^"|"$/g, "");

    const highlights = [...raw.matchAll(/DIFERENCIAL:\s*(.*)/gi)]
      .map((m) => strip(m[1] ?? ""))
      .filter(Boolean)
      .slice(0, 3);
    const hook = raw.match(/PERGUNTA:\s*(.*)/i)?.[1] ?? "";
    const orbiHook = strip(hook) || null;

    await supabase
      .from("content_items")
      .update({ highlights: highlights.length ? highlights : null, orbi_hook: orbiHook })
      .eq("id", contentItemId);

    return NextResponse.json({ highlights, orbiHook });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao gerar sugestões." }, { status: 500 });
  }
}
