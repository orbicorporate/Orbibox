import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

// Cada formato descreve a FORMA, não o tom, o tom vem do system, que é o
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

Regras absolutas (jamais quebre nenhuma):
1. NUNCA use travessao (— ou --) em lugar nenhum do texto. Use virgula, ponto, dois-pontos ou parenteses.
2. Ortografia e gramatica PERFEITAS. Toda frase comeca com letra MAIUSCULA. Toda pontuacao correta. Acentuacao correta. Zero erro, sempre.
3. NUNCA repita uma mesma palavra de destaque na mesma legenda (a nao ser artigos e preposicoes). Se ja usou "postar", nao use "postar" de novo; troque por sinonimo ou reescreva.
4. NAO fique so vendendo. Fale do UNIVERSO daquele produto ou servico com profundidade. Traga uma dica valiosa e concreta, um dado real de mercado, uma tendencia, um numero, algo que mostre que quem escreveu pesquisa e entende do assunto. Nunca dica generica e obvia. Sempre que possivel, ancore em algo real e util pra quem le.

Seu padrao de escrita:
- Comeca por gente ou por uma ideia forte, nao pelo nome do produto.
- Nao empurra venda. Um bom texto entrega valor primeiro; nao precisa pedir nada. Zero "corre que acaba", "nao perca", "fala com a gente", "vem crescer".
- Uma linha de raciocinio clara, bem desenvolvida, sem encher com frase de efeito vazia. Cada frase acrescenta algo novo.
- Zero clice de marketing ("qualidade e excelencia", "o melhor da regiao", "pensado em voce", "transformar", "elevar o seu negocio").
- Ensina algo. A pessoa que le deve sair sabendo ou pensando algo que nao sabia. Esse e o padrao: util e interessante, nunca raso.
- Escreve bem: ritmo, uma boa imagem, as vezes humor. Alma brasileira, sem forcar girias.
- No maximo 1-2 emoji, e so se couber. Muitas vezes nenhum e melhor.
- So usa numeros/dados que sejam plausiveis e verdadeiros sobre o setor. Nao inventa fatos sobre ESTE negocio (ex: nao crie "18 anos de experiencia" se ninguem te disse). Dados de MERCADO/tendencia do setor, esses sim, use pra enriquecer, desde que reais e conhecidos.

O item em destaque agora e "${productTitle}", foi o mais procurado recentemente. E so um sinal de que o assunto interessa; um bom gancho pra escrever algo valioso sobre esse tema. Nao trate como oferta.

Escreva: ${oQue}

Antes de responder, revise: comecou com maiuscula? tem travessao (proibido)? repetiu alguma palavra de destaque? trouxe uma dica ou dado que agrega de verdade, ou ficou generico? tem frase de venda ou clice? Corrija tudo isso e so entao responda.

Responda APENAS o texto final, pronto pra copiar e colar. Sem titulo, sem aspas, sem "aqui esta", sem explicacao.`;

    // Chama a IA e extrai o texto de forma robusta. Tenta até 2 vezes se vier
    // vazio (acontece raramente). O usuário NUNCA pode ver "não consegui".
    async function pedirTexto(): Promise<string> {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 700,
          temperature: 1,
          system,
          messages: [{ role: "user", content: `Crie o texto sobre "${productTitle}".` }],
        }),
      });
      if (!res.ok) return "";
      const data = await res.json();
      // Junta TODOS os blocos de texto (não só o primeiro), cobrindo variações
      // de formato da resposta.
      const partes = Array.isArray(data?.content)
        ? data.content.filter((b: { type?: string; text?: string }) => b?.type === "text" && b?.text).map((b: { text: string }) => b.text)
        : [];
      return partes.join("\n").trim();
    }

    let bruto = await pedirTexto();
    if (!bruto) bruto = await pedirTexto(); // segunda tentativa

    // Rede de segurança: remove qualquer travessao que tenha escapado, trocando
    // por virgula (regra absoluta: nada de travessao em texto nenhum).
    const limpo = bruto
      .replace(/\s*—\s*/g, ", ")
      .replace(/\s*–\s*/g, ", ")
      .replace(/\s+--\s+/g, ", ")
      .trim();

    // Se depois de tudo ainda estiver vazio, entrega um texto de apoio decente
    // baseado no próprio negócio, pra tela nunca mostrar erro pro usuário.
    if (!limpo) {
      const fallback = tipo === "story"
        ? `Mostre nos stories um instante real do dia a dia de ${biz?.name ?? "quem está por trás disso"}, algo que normalmente fica nos bastidores. Escreva por cima uma frase curta e verdadeira sobre "${productTitle}". Feche com uma caixinha de pergunta pra abrir conversa.`
        : tipo === "whatsapp"
        ? `Oi! Passando só pra dizer que "${productTitle}" tem tido bastante procura por aqui. Se quiser saber como funciona ou tirar qualquer dúvida, é só me chamar. Fico à disposição.`
        : `Tem coisas que a gente só entende de perto. "${productTitle}" é uma delas. Quem já viveu isso sabe o quanto muda a rotina, e quem ainda não, vale conhecer com calma, sem pressa.\n\n#${(biz?.name ?? "negocio").replace(/\s+/g, "")} #dicas`;
      return NextResponse.json({ texto: fallback });
    }

    return NextResponse.json({ texto: limpo });
  } catch (error) {
    console.error("Erro ao gerar conteudo:", error);
    // Mesmo num erro inesperado, entrega um texto de apoio em vez de falhar,
    // pra tela nunca mostrar erro pro usuário.
    return NextResponse.json({
      texto: `Tem coisas que a gente só entende de perto. Quem já viveu sabe o quanto faz diferença no dia a dia, e quem ainda não conhece, vale a pena com calma.\n\n#dicas #paravoce`,
    });
  }
}
