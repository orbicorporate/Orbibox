import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { businessId, conversationId, message, history, trialMode } = await req.json();

    if (!businessId || !message) {
      return NextResponse.json({ error: "businessId e message são obrigatórios." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: business } = await supabase
      .from("businesses")
      .select("name, brand_voice_summary, about_business, differentials, policies, contact_whatsapp, address")
      .eq("id", businessId)
      .maybeSingle();

    const { data: agentConfig } = await supabase
      .from("agent_configs")
      .select("agent_name, tone_formal_informal, tone_reserved_energetic, tone_concise_detailed, objectives")
      .eq("business_id", businessId)
      .maybeSingle();

    const { data: content } = await supabase
      .from("content_items")
      .select("id, title, description, price, image_url, link_kind")
      .eq("business_id", businessId)
      .eq("status", "published")
      .limit(15);

    const agentName = agentConfig?.agent_name ?? "Orbi";
    const toneDesc = agentConfig
      ? [
          agentConfig.tone_formal_informal > 60 ? "informal" : agentConfig.tone_formal_informal < 40 ? "formal" : "neutro",
          agentConfig.tone_reserved_energetic > 60 ? "energética" : agentConfig.tone_reserved_energetic < 40 ? "reservada" : "equilibrada",
          agentConfig.tone_concise_detailed > 60 ? "detalhista" : agentConfig.tone_concise_detailed < 40 ? "concisa" : "direta ao ponto",
        ].join(", ")
      : "próxima e direta";

    const catalog = (content ?? [])
      .map((c) => `- [id:${c.id}] ${c.title}${c.price != null ? ` (R$ ${Number(c.price).toFixed(2)})` : ""}${c.description ? `: ${c.description}` : ""}`)
      .join("\n");

    const system = `Você é ${agentName}, a assistente de IA (AgentBox) do negócio "${business?.name ?? "este negócio"}" dentro do Orbibox — uma plataforma de "web adaptativa".
Seu tom de voz é: ${toneDesc}.
Objetivos da conversa: ${agentConfig?.objectives?.join(", ") || "ajudar o visitante"}.
${business?.brand_voice_summary ? `Tom da marca: ${business.brand_voice_summary}` : ""}\n${business?.about_business ? `Sobre o negócio: ${business.about_business}` : ""}\n${business?.differentials ? `Diferenciais: ${business.differentials}` : ""}\n${business?.policies ? `Políticas (entrega, trocas, horários): ${business.policies}` : ""}\n${business?.address ? `Endereço: ${business.address}` : ""}
${catalog ? `Catálogo disponível:\n${catalog}` : "O catálogo ainda não tem produtos publicados."}

Regras:
- Se a pessoa perguntar onde fica, o endereço, como chegar, ou localização, e houver um endereço no contexto acima, responda com o endereço e escreva a marcação [[endereco]] numa linha própria — ela vira um card com botões de Waze e Google Maps. Se não houver endereço no contexto, diga que pode passar pelo WhatsApp.
- Recomende produtos/serviços da vitrine quando fizer sentido pra ajudar a pessoa. Pra mostrar um card clicável com a foto do produto, escreva a marcação [[produto:ID]] usando o id que aparece no catálogo (ex: [[produto:abc-123]]). Coloque a marcação numa linha própria, logo depois de mencionar o produto no texto. Use no máximo 2 por resposta, e só de produtos que existem no catálogo acima. Não descreva a marcação, só a escreva.
- Respostas CURTAS e diretas (2 a 3 frases no máximo), como uma conversa real de chat no celular. Vá direto ao ponto, sem enrolação nem introduções longas.
- Nunca invente produtos, preços ou promessas que não estejam no catálogo acima.
- Nunca use a expressão "dono do negócio" ou "dono" — soa amador. Diga "nosso time" ou "um especialista da área".
- NUNCA use travessão (—) em nenhuma resposta, em hipótese alguma. Use vírgula, ponto ou duas frases separadas no lugar.
- Seja envolvente, próxima e consultiva, como uma especialista técnica do negócio que entende do assunto de verdade, não uma atendente genérica.
- Sempre que fizer sentido, termine a resposta puxando uma pergunta estratégica pra levar a conversa adiante (qual é o objetivo da pessoa, o que ela já tentou, qual o prazo, o que mais importa pra ela) — não deixe a conversa morrer numa resposta seca.
- Captura de contato — é o objetivo principal da conversa, sem isso ela não gera valor pro negócio:
  - Logo cedo (na 1ª ou 2ª resposta), depois de ajudar com a pergunta, ofereça ativamente conectar a pessoa com um especialista pelo WhatsApp, enquadrando como benefício pra ELA: atendimento mais completo e personalizado, com alguém que resolve de verdade. Ex: "Posso te conectar com um especialista da nossa equipe pra te atender de perto. Me passa seu WhatsApp que eu já encaminho?" Seja calorosa e natural, nunca robótica nem insistente. Nunca trave a resposta esperando isso.
  - Se a pessoa pular ou não responder, sem problema, continue a conversa normalmente, não insista de novo por conta própria.
  - Se em qualquer momento a pessoa pedir pra ser contatada, pedir orçamento/proposta, ou pedir algo que só nosso time resolve, e o WhatsApp dela AINDA não apareceu em nenhuma mensagem anterior desta conversa, peça o WhatsApp primeiro, antes de dizer que vai anotar ou encaminhar. Sem o contato, a solicitação não vai a lugar nenhum.
  - Se a pessoa desconversar ou não quiser dar o contato agora, tudo bem: siga ajudando e ofereça de novo mais pra frente, sem pressionar.
  - Assim que a pessoa der o WhatsApp, confirme com simpatia que anotou e diga que um especialista da equipe vai ver essa conversa e retornar. Nunca prometa um prazo específico (nunca diga "em breve" ou "hoje" sem saber).${business?.contact_whatsapp ? ' Mencione também que tem um atalho pro WhatsApp da empresa logo abaixo do chat pra quem quiser resposta mais rápida, sem esperar.' : ""}
- Use no máximo um ✦ ocasionalmente, sem exagerar em emojis.
- Se for listar 2 ou mais itens (produtos, serviços, opções), use uma lista com "- " no início de cada linha, uma por linha, nunca tudo numa frase só separado por vírgula.
- Pode usar **negrito** em nomes de produtos/serviços e valores importantes, com moderação.`;

    // No modo teste (dono experimentando), a Orbi é mais proativa em mostrar o
    // que sabe fazer: sempre que possível recomenda um produto/serviço com card,
    // pra o dono ver o poder da ferramenta. Se não houver catálogo, sugere o
    // que o negócio faz de forma envolvente e convida a criar a vitrine.
    const systemFinal = trialMode
      ? `${system}\n\nMODO DEMONSTRAÇÃO: o dono do negócio está te testando pra decidir se assina. Seja impressionante. Sempre que houver produtos no catálogo, recomende pelo menos um com a marcação [[produto:ID]] pra mostrar os cards clicáveis. Se o catálogo estiver vazio, explique de forma animada o que você conseguiria fazer com a vitrine dele preenchida, e incentive-o a montar a Vitrine. Mostre valor em cada resposta.`
      : system;

    const messages = [
      ...((history ?? []) as { role: string; content: string }[]).map((m) => ({
        role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const reply = await askClaude({ system: systemFinal, messages, maxTokens: 500 });

    if (conversationId) {
      await supabase.from("messages").insert({ conversation_id: conversationId, role: "agent", content: reply });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao gerar resposta da Orbi." }, { status: 500 });
  }
}
