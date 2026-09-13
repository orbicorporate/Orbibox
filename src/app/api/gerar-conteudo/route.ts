import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

// Cada formato descreve a FORMA, não o tom — o tom vem do system, que é o
// mesmo pra todos: humano, delicado, com insight. Nada de "vendedão".
const FORMATO: Record<string, string> = {
  legenda:
    "Uma legenda de Instagram. Comece por uma observacao, historia curta ou provocacao que faca a pessoa parar de rolar, nunca pelo nome do produto. 2 a 5 linhas, com quebras que respiram. Encerre com um convite leve (nao uma ordem de venda) e, so entao, 3 a 5 hashtags realmente relevantes.",
  story:
    "Uma ideia de story de Instagram. Descreva em uma frase o que mostrar no visual (algo real, dos bastidores ou do dia a dia, nao banco de imagem) e escreva o texto curto de sobreposicao, intimo, como se fosse pra um amigo. No fim, sugira um sticker ou interacao (enquete, pergunta, contagem) que caiba no assunto.",
  whatsapp:
    "Uma mensagem curta pra mandar num contato ou lista de transmissao. Escreva como uma pessoa escreve pra outra: sem saudacao corporativa, sem 'prezado cliente'. Uma ideia so, calorosa, que soe como conversa e nao como panfleto. Um convite gentil no fim, se fizer sentido.",
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

Como voce escreve, sempre:
- Comeca por gente, nao por produto. Uma emocao, uma cena, uma verdade pequena do cotidiano de quem consome isso.
- Prefere sugerir a mandar. Convida em vez de ordenar. Zero "corre que acaba", "nao perca", "garanta ja".
- Evita clice de marketing e frase feita. Nada de "qualidade e excelencia", "o melhor da regiao", "pensado em voce".
- E especifica: usa o que sabe do negocio pra dizer algo que so ELE poderia dizer.
- Tem alma brasileira, calor e leveza. Pode ter humor, ternura, uma imagem poetica, desde que soe natural.
- Nao exagera em emoji (no maximo 1-2, e so se combinar).

O item em destaque agora e "${productTitle}", ele foi o mais procurado recentemente. Trate isso como um sinal de interesse real das pessoas, um bom momento pra falar sobre o assunto, nao como um saldao pra empurrar.

Escreva: ${oQue}

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
