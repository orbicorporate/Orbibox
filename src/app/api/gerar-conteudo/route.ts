import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

// Cada formato descreve a FORMA, não o tom — o tom vem do system, que é o
// mesmo pra todos: humano, delicado, com insight. Nada de "vendedão".
const FORMATO: Record<string, string> = {
  legenda:
    "Uma legenda de Instagram autoral. UMA unica ideia, desenvolvida com profundidade e elegancia, do inicio ao fim, sem se repetir nem dar voltas. Abra com uma frase que valha por si so: uma observacao afiada, uma imagem, uma verdade pouco dita do universo desse negocio. 3 a 6 linhas curtas que respiram. NAO venda, NAO convide pra comprar, NAO faca CTA comercial (nada de 'bora trocar uma ideia', 'fala com a gente', 'vem crescer', 'agende', 'chama no direct'). O objetivo e ser interessante e memoravel, o tipo de post que a pessoa salva ou reposta. No fim, 3 a 5 hashtags relevantes e sem exagero.",
  story:
    "Uma ideia de story de Instagram. Descreva em uma frase o que mostrar no visual (algo real, dos bastidores ou do dia a dia, nao banco de imagem) e escreva o texto curto de sobreposicao, intimo e bem escrito, como se fosse pra um amigo. Sugira no fim um sticker ou interacao (enquete, pergunta, caixinha) que caiba no assunto. Sem tom de propaganda.",
  whatsapp:
    "Uma mensagem curta pra mandar num contato ou lista. Escreva como uma pessoa de verdade escreve pra outra: sem saudacao corporativa, sem 'prezado cliente', sem parecer disparo em massa. Uma ideia so, calorosa e especifica. Pode terminar sem nenhum pedido, so uma boa mensagem. Se houver convite, que seja um so, sutil e humano.",
};

export async function POST(req: NextRequest) {
  try {
    const { businessId, productTitle, tipo } = await req.json();
    if (!businessId || !tipo) return NextResponse.json({ error: "faltam dados" }, { status: 400 });

    const key = process.env.ANTHROPIC_API_KEY || process.env.CHAVE_API_ANTROPICA;
    if (!key) return NextResponse.json({ error: "sem chave" }, { status: 500 });

    const supabase = await createClient();

    const [{ data: biz }, { data: agent }, { data: outros }] = await Promise.all([
      supabase.from("businesses").select("name, about_business, differentials, policies, site_type").eq("id", businessId).maybeSingle(),
      supabase.from("agent_configs").select("agent_name, tone_formal_informal, tone_concise_detailed").eq("business_id", businessId).maybeSingle(),
      supabase.from("content_items").select("title").eq("business_id", businessId).eq("status", "published").limit(8),
    ]);

    const oQue = FORMATO[tipo] ?? FORMATO.legenda;

    const contexto = [
      biz?.name ? `Negocio: ${biz.name}.` : "",
      biz?.about_business ? `Sobre: ${biz.about_business}` : "",
      biz?.differentials ? `O que torna esse negocio diferente: ${biz.differentials}` : "",
      biz?.policies ? `Politicas/observacoes: ${biz.policies}` : "",
      Array.isArray(outros) && outros.length > 1
        ? `Outros itens que o negocio oferece (pra voce entender o contexto, nao pra citar todos): ${outros.map((o) => o.title).filter((t) => t !== productTitle).slice(0, 6).join(", ")}.`
        : "",
    ].filter(Boolean).join("\n");

    const tomLinhas: string[] = [];
    if (agent) {
      if (typeof agent.tone_formal_informal === "number")
        tomLinhas.push(agent.tone_formal_informal >= 55 ? "Tom mais descontraido e proximo." : agent.tone_formal_informal <= 45 ? "Tom mais elegante e sobrio." : "Tom equilibrado, nem formal nem solto.");
      if (typeof agent.tone_concise_detailed === "number" && agent.tone_concise_detailed >= 60)
        tomLinhas.push("Pode desenvolver um pouco mais a ideia, sem encher linguica.");
    }

    const system = `Voce e a ${agent?.agent_name ?? "Orbi"}, a inteligencia criativa por tras da presenca digital de um pequeno negocio brasileiro. Voce conhece esse negocio de verdade e escreve como uma redatora sensivel que se importa com ele, nao como uma ferramenta que cospe texto de venda.

Contexto do negocio:
${contexto || "Poucas informacoes disponiveis. Nesse caso, seja mais atemporal e humano, sem inventar fatos."}
${tomLinhas.length ? "\nTom desejado: " + tomLinhas.join(" ") : ""}

Seu padrao de escrita (inegociavel):
- Comeca por gente, nao por produto. Uma emocao, uma cena, uma verdade pequena do cotidiano de quem vive isso.
- NAO vende. Nao empurra, nao convida pra comprar, nao faz chamada comercial. Um bom texto nao precisa pedir nada. Zero "corre que acaba", "nao perca", "garanta ja", "fala com a gente", "vem crescer", "bora trocar uma ideia".
- Uma ideia so, bem desenvolvida. Sem repetir a mesma coisa com outras palavras, sem encher com frase de efeito vazia. Cada linha precisa acrescentar algo.
- Zero clice de marketing. Nada de "qualidade e excelencia", "o melhor da regiao", "pensado em voce", "transformar", "elevar o seu negocio", "resultado de verdade".
- Especifica ao extremo: usa o que sabe do negocio pra dizer algo que so ELE poderia dizer. Se souber pouco, prefere o universal humano a inventar.
- Escreve bem: ritmo, uma boa imagem, as vezes humor ou ternura. Alma brasileira, sem forcar girias.
- No maximo 1-2 emoji, e so se realmente couber. Muitas vezes, nenhum e melhor.
- Nao usa numeros/dados que voce nao tem certeza (ex: nao invente "18 anos" se nao te disseram).

O item em destaque agora e "${productTitle}" — ele foi o mais procurado recentemente. Isso e so um sinal de que o assunto interessa; um bom gancho pra escrever algo bom sobre esse tema. Nao trate como oferta nem como saldao.

Escreva: ${oQue}

Antes de responder, revise mentalmente: tem repeticao? tem frase de venda? tem clice? Se tiver, reescreva. So entao responda.

Responda APENAS o texto final, pronto pra copiar e colar. Sem titulo, sem aspas, sem "aqui esta", sem explicacao.`;

    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        temperature: 1,
        system,
        messages: [{ role: "user", content: `Crie o texto sobre "${productTitle}".` }],
      }),
    });
    if (!res.ok) return NextResponse.json({ error: "erro ia" }, { status: 500 });
    const data = await res.json();
    const block = data.content?.find((b: { type: string }) => b.type === "text");
    return NextResponse.json({ texto: (block?.text ?? "").trim() });
  } catch (error) {
    console.error("Erro ao gerar conteudo:", error);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
