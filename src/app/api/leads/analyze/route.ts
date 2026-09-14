import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const limpar = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").trim();

type Analise = {
  resumo: string;
  temperatura: number;
  motivo: string;
  proxima_acao: { titulo: string; mensagem: string; quando: string };
  interesses: string[];
  nome?: string;
};

/**
 * A Orbi lê tudo que se sabe de um lead (conversa, vouchers, produtos que
 * abriu) e devolve: um resumo de uma linha, a temperatura (0 a 100), e a
 * próxima ação com a mensagem pronta pra mandar no WhatsApp.
 *
 * Roda sob demanda (quando a lista precisa) e grava o resultado, então
 * cada lead é analisado uma vez por rodada de atividade, não a cada abertura.
 */
export async function POST(req: NextRequest) {
  try {
    const { leadId, force } = await req.json();
    if (!leadId) return NextResponse.json({ error: "leadId" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: lead } = await supabase
      .from("leads")
      .select("id, business_id, analyzed_at, last_activity_at, summary, temperature, next_action, name")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

    // Já analisado depois da última atividade: devolve o que tem.
    if (!force && lead.analyzed_at && lead.analyzed_at >= lead.last_activity_at && lead.summary) {
      return NextResponse.json({ resumo: lead.summary, temperatura: lead.temperature, proxima_acao: lead.next_action, cached: true });
    }

    const [{ data: ctxRaw }, { data: biz }] = await Promise.all([
      supabase.rpc("lead_context", { p_lead_id: leadId }),
      supabase.from("businesses").select("name, about_business, differentials, brand_voice_summary, policies").eq("id", lead.business_id).maybeSingle(),
    ]);
    if (!ctxRaw) return NextResponse.json({ error: "Sem contexto." }, { status: 404 });

    const system = `Você é a Orbi, assistente de vendas do negócio "${biz?.name ?? ""}" no Orbibox. Você vai ler tudo que um visitante fez e ajudar o dono a fechar com ele.

Sobre o negócio: ${biz?.about_business || "não informado"}
Diferenciais: ${biz?.differentials || "não informados"}
Tom de voz da marca: ${biz?.brand_voice_summary || "próximo e natural"}
${biz?.policies ? `Políticas: ${biz.policies}` : ""}

Responda SOMENTE em JSON válido, sem markdown:
{"resumo":"...","temperatura":0,"motivo":"...","proxima_acao":{"titulo":"...","mensagem":"...","quando":"..."},"interesses":["..."],"nome":"..."}

Regras:
- "resumo": UMA linha (até 18 palavras) dizendo o que essa pessoa quis e onde parou. Ex: "Perguntou preço do vestido preto, pegou voucher de 10%, não usou." Concreto, sem adjetivo.
- "temperatura": 0 a 100. Quente (70+): pediu preço, pegou voucher, deixou contato, perguntou como comprar, voltou mais de uma vez. Morno (35-69): demonstrou interesse mas não avançou. Frio (0-34): só olhou ou conversa vazia. Voucher pego e não usado sobe muito.
- "motivo": até 12 palavras explicando a temperatura.
- "proxima_acao.titulo": ação em até 6 palavras (ex: "Lembrar do voucher que expira").
- "proxima_acao.mensagem": a mensagem pronta pra o dono mandar no WhatsApp dessa pessoa. Em primeira pessoa do dono, no tom da marca, curta (até 45 palavras), citando algo específico que a pessoa fez. Se souber o nome, use. Nunca comece com "Olá, tudo bem?". Nunca use travessão. Pode usar no máximo 1 emoji.
- "proxima_acao.quando": quando mandar (ex: "agora", "hoje à noite", "amanhã de manhã").
- "interesses": até 3 itens curtos do que a pessoa demonstrou querer.
- "nome": se descobrir o nome nas mensagens, devolva; senão string vazia.
- Se não houver quase nada (conversa vazia, só um "oi"), seja honesto: temperatura baixa e a próxima ação vira um contato leve, sem inventar interesse.`;

    const raw = await askClaude({
      system,
      messages: [{ role: "user", content: `Dados do lead:\n${JSON.stringify(ctxRaw, null, 1)}` }],
      maxTokens: 700,
    });

    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw) as Partial<Analise>;

    const temperatura = Math.max(0, Math.min(100, Math.round(Number(parsed.temperatura ?? 0))));
    const resumo = limpar(String(parsed.resumo ?? ""));
    const proxima = parsed.proxima_acao
      ? {
          titulo: limpar(String(parsed.proxima_acao.titulo ?? "")),
          mensagem: limpar(String(parsed.proxima_acao.mensagem ?? "")),
          quando: limpar(String(parsed.proxima_acao.quando ?? "")),
          motivo: limpar(String(parsed.motivo ?? "")),
        }
      : null;
    const interesses = Array.isArray(parsed.interesses) ? parsed.interesses.filter((x): x is string => typeof x === "string").slice(0, 3).map(limpar) : [];
    const nome = typeof parsed.nome === "string" && parsed.nome.trim() ? parsed.nome.trim() : null;

    await supabase
      .from("leads")
      .update({
        summary: resumo || null,
        temperature: temperatura,
        next_action: proxima,
        interests: interesses.length > 0 ? interesses : undefined,
        name: nome ?? undefined,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // Reflete na conversa mais recente também, pra lista de Conversas.
    await supabase
      .from("conversations")
      .update({ summary: resumo || null, temperature: temperatura, analyzed_at: new Date().toISOString() })
      .eq("lead_id", leadId);

    return NextResponse.json({ resumo, temperatura, proxima_acao: proxima, interesses, nome });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui analisar agora." }, { status: 500 });
  }
}
