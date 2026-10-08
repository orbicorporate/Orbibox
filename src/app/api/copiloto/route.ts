import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { askClaude } from "@/lib/anthropic";
import { AI_MODEL_RAPIDO } from "@/lib/aiModel";
import { AJUDAS } from "@/lib/ajuda";
import { calcularSemana } from "@/lib/copiloto";
import { conversaoPorId, objetivoPorId } from "@/lib/conversao";

export const maxDuration = 30;

// "Pergunte qualquer coisa sobre seus clientes ou seu Orbibox": a Orbi
// responde com os números reais do negócio e, quando cabe, aponta a tela
// onde a pessoa resolve aquilo.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const { pergunta } = (await req.json()) as { pergunta?: string };
  const texto = (pergunta ?? "").trim().slice(0, 400);
  if (!texto) return NextResponse.json({ error: "Pergunta vazia." }, { status: 400 });

  const businessId = await getCurrentBusinessId(user.id);
  if (!businessId) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

  const ini = new Date(Date.now() - 7 * 86400000).toISOString();
  const [bizRes, semana, cliques, itens, vouchers, perguntas, conversas, sessoes] = await Promise.all([
    supabase.from("businesses").select("name, objetivo, conversao, about_business, created_at").eq("id", businessId).maybeSingle(),
    calcularSemana(supabase, businessId),
    supabase.from("click_events").select("kind, content_item_id").eq("business_id", businessId).gte("created_at", ini).limit(5000),
    supabase.from("content_items").select("id, title, price").eq("business_id", businessId).eq("status", "published").limit(200),
    supabase.from("vouchers").select("title, quantity_total, quantity_claimed, is_active").eq("business_id", businessId).limit(20),
    supabase.from("orbi_learnings").select("pergunta, vezes").eq("business_id", businessId).eq("status", "pendente").order("vezes", { ascending: false }).limit(5),
    supabase.from("conversations").select("summary, temperature, started_at").eq("business_id", businessId).not("summary", "is", null).order("started_at", { ascending: false }).limit(8),
    supabase.from("visitor_sessions").select("source, intent").eq("business_id", businessId).gte("started_at", ini).limit(5000),
  ]);
  const biz = bizRes.data;
  const listaItens = (itens.data ?? []) as { id: string; title: string; price: number | null }[];
  const porItem: Record<string, number> = {};
  const porTipo: Record<string, number> = {};
  for (const c of (cliques.data ?? []) as { kind: string; content_item_id: string | null }[]) {
    porTipo[c.kind] = (porTipo[c.kind] ?? 0) + 1;
    if (c.content_item_id) porItem[c.content_item_id] = (porItem[c.content_item_id] ?? 0) + 1;
  }
  const topItens = Object.entries(porItem).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, n]) => `${listaItens.find((i) => i.id === id)?.title ?? "item removido"} (${n} toques)`);
  const porOrigem: Record<string, number> = {};
  const porIntencao: Record<string, number> = {};
  for (const s of (sessoes.data ?? []) as { source: string | null; intent: string | null }[]) {
    const o = s.source || "direto";
    porOrigem[o] = (porOrigem[o] ?? 0) + 1;
    if (s.intent) porIntencao[s.intent] = (porIntencao[s.intent] ?? 0) + 1;
  }

  const dados = `Negócio: ${biz?.name ?? ""}
Objetivo do dono: ${objetivoPorId(biz?.objetivo)?.rotulo ?? "não definido"}. O que ele mais quer que o cliente faça: ${conversaoPorId(biz?.conversao)?.rotulo ?? "não definido"}.
Últimos 7 dias (semana anterior entre parênteses): visitas ${semana.visitas} (${semana.visitasAntes}); conversas com a IA ${semana.conversas} (${semana.conversasAntes}); contatos capturados ${semana.contatos} (${semana.contatosAntes}); conversões, que são cliques no WhatsApp + ofertas resgatadas, ${semana.conversoes} (${semana.conversoesAntes}).
Toques por tipo nos últimos 7 dias: ${Object.entries(porTipo).map(([k, n]) => `${k} ${n}`).join(", ") || "nenhum"}.
Itens mais tocados: ${topItens.join("; ") || "nenhum"}.
De onde vieram as visitas: ${Object.entries(porOrigem).map(([k, n]) => `${k} ${n}`).join(", ") || "nenhuma"}.
O que escolheram na tela inicial: ${Object.entries(porIntencao).map(([k, n]) => `${k} ${n}`).join(", ") || "nada"}.
Catálogo: ${listaItens.length} itens publicados.
Ofertas: ${((vouchers.data ?? []) as { title: string; quantity_total: number; quantity_claimed: number; is_active: boolean }[]).map((v) => `${v.title} (${v.quantity_claimed}/${v.quantity_total} resgatados${v.is_active ? "" : ", pausada"})`).join("; ") || "nenhuma"}.
Perguntas que a IA não soube responder: ${((perguntas.data ?? []) as { pergunta: string; vezes: number }[]).map((p) => `"${p.pergunta}" (${p.vezes}x)`).join("; ") || "nenhuma"}.
Resumo das últimas conversas: ${((conversas.data ?? []) as { summary: string | null }[]).map((c) => c.summary).filter(Boolean).join(" | ") || "nenhuma"}.`;

  const mapa = AJUDAS.map((a) => `- ${a.pergunta}${a.acao ? ` [tela: ${a.acao.href}]` : ""}`).join("\n");
  const system = `Você é a Orbi, copiloto do dono de um pequeno negócio dentro do painel Orbibox. Ele é leigo em tecnologia e quer saber o que fazer.
Responda em português do Brasil, em no máximo 3 frases curtas, com os números reais abaixo quando ajudarem. Formato ideal: o dado, o que ele significa, o que fazer.
Nunca invente número, cliente ou fato que não esteja nos dados. Se os dados não respondem, diga isso com franqueza e sugira o que observar.
Sem jargão técnico, sem inglês, sem listas.
Telas do painel (use pra indicar onde agir):
${mapa}
- Criar oferta/voucher [tela: /admin/vouchers?novo=1]
- Criar post ou conteúdo com a IA [tela: /admin/content]
- Ver contatos e conversas [tela: /admin/conversas]
- Ver resultados completos [tela: /admin/pulse]

DADOS DO NEGÓCIO:
${dados}

Responda SOMENTE em JSON: {"resposta": "...", "href": "/admin/..." ou null, "rotulo": "texto curto do botão" ou null}`;

  try {
    const bruto = await askClaude({ system, messages: [{ role: "user", content: texto }], maxTokens: 450, model: AI_MODEL_RAPIDO });
    const json = JSON.parse(bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1)) as { resposta?: string; href?: string | null; rotulo?: string | null };
    const href = json.href && /^\/admin(\/|$|\?|#)/.test(json.href) ? json.href : null;
    if (!json.resposta) throw new Error("sem resposta");
    return NextResponse.json({ resposta: json.resposta.slice(0, 600), href, rotulo: href ? json.rotulo || "Abrir" : null });
  } catch {
    return NextResponse.json({ error: "Não consegui responder agora." }, { status: 500 });
  }
}
