import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const limpar = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").trim();

const SEGMENTO_DESC: Record<string, string> = {
  voucher_nao_usado: "pessoas que pegaram um voucher e ainda não usaram",
  quentes: "pessoas que demonstraram interesse forte mas ainda não fecharam",
  sumiram: "pessoas que conversaram e sumiram há alguns dias",
  querem_novidades: "pessoas que pediram pra ser avisadas de novidades",
  todos: "todos os contatos ativos",
};

/**
 * Mensagem pronta pra um segmento inteiro (automático) ou pra uma lista
 * própria (com motivo livre escrito pelo dono). A Orbi escreve uma base
 * com {nome} como marcador; o front troca por cada nome na hora de mandar.
 * Pode vir também um "gancho" (item novo na vitrine, voucher novo).
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId, segmento, motivo, gancho } = await req.json();
    if (!businessId || (!segmento && !motivo)) return NextResponse.json({ error: "Parâmetros." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: biz } = await supabase
      .from("businesses")
      .select("name, about_business, differentials, brand_voice_summary")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!biz) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

    // Lista própria: o motivo é escrito pelo dono, na hora que ele criou a
    // lista ("compraram corte de cabelo em julho", "perguntaram de aluguel
    // e sumiram"). É mais específico que os segmentos automáticos, então a
    // mensagem sai mais precisa.
    const descricaoGrupo = typeof motivo === "string" && motivo.trim()
      ? motivo.trim()
      : SEGMENTO_DESC[segmento] ?? "um grupo de contatos";

    const system = `Você é a Orbi, assistente de vendas de "${biz.name}". Vai escrever UMA mensagem de WhatsApp que o dono vai mandar, uma por uma, pra um grupo de pessoas. O motivo de elas estarem juntas nessa lista é: ${descricaoGrupo}

Sobre o negócio: ${biz.about_business || "não informado"}
Diferenciais: ${biz.differentials || "não informados"}
Tom de voz: ${biz.brand_voice_summary || "próximo e natural"}
${gancho ? `Gancho desta mensagem: ${gancho}` : ""}

Regras:
- Escreva em primeira pessoa do dono, como quem manda mensagem pra um cliente, não como campanha.
- Use {nome} onde entra o nome da pessoa. Se a frase precisar funcionar sem nome, escreva de um jeito que "{nome}" possa virar "Oi" sem quebrar.
- Curta: até 50 palavras. Um assunto só. Termine com uma pergunta ou convite simples.
- Nunca use "Olá, tudo bem?", "Prezado", "Aproveite", "Imperdível", "Não perca".
- Nunca use travessão. No máximo 1 emoji.
- Se o segmento é de voucher não usado, lembre do voucher de forma leve, sem pressão.
- Se é de quem sumiu, retome o assunto sem cobrar.

Responda SOMENTE JSON: {"mensagem":"...","assunto":"resumo em 4 palavras do que a mensagem faz"}`;

    const raw = await askClaude({ system, messages: [{ role: "user", content: "Escreva a mensagem." }], maxTokens: 300 });
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);

    return NextResponse.json({
      mensagem: limpar(String(parsed.mensagem ?? "")),
      assunto: limpar(String(parsed.assunto ?? "")),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui escrever agora." }, { status: 500 });
  }
}
