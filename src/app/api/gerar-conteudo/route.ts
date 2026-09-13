import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

import { AI_MODEL, ANTHROPIC_API_URL } from "@/lib/aiModel";

// Cada formato descreve a FORMA, não o tom, o tom vem do system, que é o
// mesmo pra todos: humano, delicado, com insight. Nada de "vendedão".
const FORMATO: Record<string, string> = {
  legenda:
    "Uma legenda de Instagram autoral. UMA unica ideia, desenvolvida com profundidade e elegancia, do inicio ao fim, sem se repetir nem dar voltas. Abra com uma frase que valha por si so: uma observacao afiada, uma imagem, uma verdade pouco dita do universo desse negocio. 3 a 6 linhas curtas que respiram. NAO venda, NAO convide pra comprar, NAO faca CTA comercial (nada de 'bora trocar uma ideia', 'fala com a gente', 'vem crescer', 'agende', 'chama no direct'). O objetivo e ser interessante e memoravel, o tipo de post que a pessoa salva ou reposta. No fim, coloque de 4 a 6 hashtags: PESQUISE quais estao em alta e sao realmente usadas no nicho desse negocio agora (mistura de hashtags de alcance medio e algumas mais especificas de nicho, evite so as gigantes e obvias). TODAS as hashtags em letra MINUSCULA, sempre, sem excecao (ex: #marketingdigital, nao #MarketingDigital).",
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

    const system = `Voce e a ${agent?.agent_name ?? "Orbi"}, uma estrategista de conteudo brilhante por tras da presenca digital de um negocio brasileiro. Voce e afiada, culta, atualizada, e escreve textos que fazem a pessoa parar e pensar "que sacada boa". Nada de texto raso, generico ou de vendedor.

Contexto do negocio:
${contexto || "Poucas informacoes disponiveis. Foque no universo do tema com inteligencia."}
${tomLinhas.length ? "\nTom desejado: " + tomLinhas.join(" ") : ""}

MISSAO CENTRAL: antes de escrever, use a busca na web pra encontrar UM dado real e atual sobre o universo desse tema (uma estatistica de mercado, uma tendencia recente, um numero de comportamento do consumidor, uma noticia do setor). Esse dado real precisa aparecer no texto de forma natural e inteligente, como ponto de partida ou reforco da ideia. NUNCA invente numeros. Se buscou e achou, use com precisao. Um texto sem nenhum dado ou fato concreto e um texto fraco, e voce nao entrega texto fraco.

Regras absolutas (jamais quebre):
1. NUNCA use travessao (— ou --). Use virgula, ponto, dois-pontos ou parenteses.
2. Ortografia e gramatica PERFEITAS. Toda frase comeca com MAIUSCULA. Acentuacao e pontuacao impecaveis. Zero erro.
3. NUNCA repita uma mesma palavra de destaque na mesma legenda.
4. Traga SEMPRE um dado real, fato ou tendencia de mercado (pesquisado agora), nao opiniao vaga. Numero, percentual, nome de estudo, movimento do setor. Isso e o que separa um texto inteligente de um texto qualquer.
5. NAO venda. Nada de "corre", "nao perca", "fala com a gente", "garanta ja". O texto ganha autoridade pela inteligencia, nao pelo apelo.

Seu padrao:
- Abre com uma sacada, um dado surpreendente ou uma verdade contraintuitiva. Nunca com o nome do produto.
- Tem uma tese, um ponto de vista. Diz algo que a maioria nao diria.
- Cada frase acrescenta. Zero enrolacao, zero clice ("qualidade e excelencia", "pensado em voce", "transformar seu negocio").
- Ensina ou revela algo. Quem le sai mais inteligente.
- Escreve com estilo: ritmo, uma boa imagem, precisao. Alma brasileira sem forcar giria.
- No maximo 1-2 emoji, e so se elevar. Quase sempre nenhum e melhor.

O tema em foco e "${productTitle}", foi o mais procurado recentemente. Use como gancho pra uma reflexao valiosa sobre esse universo, ancorada no dado que voce pesquisou.

Escreva: ${oQue}

Revise antes de responder: tem um dado/fato real de mercado? comecou com maiuscula? zero travessao? zero repeticao de palavra? zero frase de venda ou clice? tem uma sacada de verdade, ou ficou obvio? So responda quando estiver realmente bom.

Responda APENAS o texto final, pronto pra copiar e colar. Sem titulo, sem aspas, sem "aqui esta", sem explicacao, sem citar as fontes da busca.`;

    // Chama a IA e extrai o texto de forma robusta. Tenta até 2 vezes se vier
    // vazio. O usuário NUNCA pode ver "não consegui". Habilita a busca na web
    // pra Orbi trazer dados/noticias reais de mercado, nao inventados.
    async function pedirTexto(comBusca: boolean): Promise<string> {
      const body: Record<string, unknown> = {
        model: AI_MODEL,
        max_tokens: 1200,
        temperature: 1,
        system,
        messages: [{ role: "user", content: comBusca
          ? `Pesquise um dado atual e real de mercado sobre o universo de "${productTitle}" (setor, comportamento do consumidor, tendencia, numero) e escreva o texto usando esse dado de forma natural. Item: "${productTitle}".`
          : `Escreva o texto sobre "${productTitle}", com uma sacada inteligente e, se souber com seguranca, um dado ou tendencia real do setor.` }],
      };
      if (comBusca) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];

      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error("gerar-conteudo IA nao ok:", res.status, comBusca ? "(com busca)" : "(sem busca)", await res.text().catch(() => ""));
        return "";
      }
      const data = await res.json();
      const partes = Array.isArray(data?.content)
        ? data.content.filter((b: { type?: string; text?: string }) => b?.type === "text" && b?.text).map((b: { text: string }) => b.text)
        : [];
      return partes.join("\n").trim();
    }

    // 1) com busca na web (dado real). 2) se falhar, sem busca mas ainda
    // inteligente. So cai no fallback fixo se as duas falharem.
    let bruto = await pedirTexto(true);
    let pesquisou = !!bruto; // a primeira tentativa é a que usa busca na web
    if (!bruto) { bruto = await pedirTexto(false); pesquisou = false; }

    // Rede de segurança: remove qualquer travessao que tenha escapado, trocando
    // por virgula (regra absoluta: nada de travessao em texto nenhum). Tambem
    // limpa marcacoes de citacao que a busca na web possa ter deixado.
    const limpo = bruto
      .replace(/\s*—\s*/g, ", ")
      .replace(/\s*–\s*/g, ", ")
      .replace(/\s+--\s+/g, ", ")
      .replace(/【[^】]*】/g, "")        // citações estilo 【1】
      .replace(/\[\d+\]/g, "")          // citações estilo [1]
      .replace(/\(\s*fonte[^)]*\)/gi, "") // "(fonte: ...)"
      // Toda hashtag em minusculo, sempre (mantendo acentos).
      .replace(/#([\p{L}\p{N}_]+)/gu, (_m, tag) => "#" + tag.toLowerCase())
      .replace(/[ \t]{2,}/g, " ")
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

    return NextResponse.json({ texto: limpo, pesquisou });
  } catch (error) {
    console.error("Erro ao gerar conteudo:", error);
    // Mesmo num erro inesperado, entrega um texto de apoio em vez de falhar,
    // pra tela nunca mostrar erro pro usuário.
    return NextResponse.json({
      texto: `Tem coisas que a gente só entende de perto. Quem já viveu sabe o quanto faz diferença no dia a dia, e quem ainda não conhece, vale a pena com calma.\n\n#dicas #paravoce`,
    });
  }
}
