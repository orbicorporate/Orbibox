import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { askClaude } from "@/lib/anthropic";
import { AI_MODEL_RAPIDO } from "@/lib/aiModel";
import { AJUDAS } from "@/lib/ajuda";

// Suporte conversacional: a Orbi tira dúvida de uso do Orbibox ensinando
// conforme o negócio de quem pergunta (nome, o que vende, o que já montou).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const { mensagens } = (await req.json()) as { mensagens?: { role: "user" | "assistant"; content: string }[] };
  const hist = (mensagens ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  if (!hist.length || hist[hist.length - 1].role !== "user") return NextResponse.json({ error: "Pergunta vazia." }, { status: 400 });

  const businessId = await getCurrentBusinessId(user.id);
  let contexto = "Não há dados do negócio.";
  if (businessId) {
    const [{ data: biz }, { count: itens }, { count: botoes }, acesso] = await Promise.all([
      supabase.from("businesses").select("name, address, vitrine_categories").eq("id", businessId).maybeSingle(),
      supabase.from("content_items").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "published"),
      supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("is_active", true),
      getAccessInfoForBusiness(businessId),
    ]);
    const cats = (biz?.vitrine_categories as string[] | null)?.slice(0, 8).join(", ");
    contexto = `Negócio: ${biz?.name ?? "sem nome"}. Categorias do catálogo: ${cats || "nenhuma ainda"}. Itens publicados: ${itens ?? 0}. Botões ativos: ${botoes ?? 0}. Endereço cadastrado: ${biz?.address ? "sim" : "não"}. Plano: ${acesso.isFree ? "grátis" : "pago"}. Orbi atendendo clientes: ${acesso.hasAiChat ? "sim" : "não"}.`;
  }

  const mapa = AJUDAS.map((a) => `- ${a.pergunta} → ${a.passos.join(" ")}${a.acao ? ` [tela: ${a.acao.href}]` : ""}`).join("\n");
  const system = `Você é a Orbi, no suporte do painel Orbibox (página inteligente para pequenos negócios no Brasil). Quem pergunta é o dono do negócio, geralmente leigo em tecnologia.
Dados do negócio dele: ${contexto}
Ensine do jeito que serve ao ramo dele: use o nome do negócio e exemplos do que ele vende. Se faltar algo importante (ex.: sem itens, sem endereço), sugira o próximo passo.
Responda em português do Brasil, simples, curto (até 4 passos ou 5 linhas). Sem jargão, sem inglês, sem negrito, sem travessão.
Abas do painel: Início, Botões, Catálogo, Conversas, Números. Menu de configurações: Sua marca, Sua IA, Vouchers, Gift Cards, PDFs da marca, Suporte.
Mapa de onde cada coisa fica:
${mapa}
Se não souber ou for algo de conta, cobrança ou erro do sistema, diga para chamar o suporte da Nume Company no WhatsApp.
Responda SOMENTE em JSON: {"resposta": "texto, passos separados por quebra de linha", "href": "/admin/..." ou null, "rotulo": "texto curto do botão" ou null}`;

  try {
    const bruto = await askClaude({ system, messages: hist, maxTokens: 500, model: AI_MODEL_RAPIDO });
    const json = JSON.parse(bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1)) as { resposta?: string; href?: string | null; rotulo?: string | null };
    if (!json.resposta) throw new Error();
    const href = json.href && /^\/admin(\/|$|\?|#)/.test(json.href) ? json.href : null;
    return NextResponse.json({ resposta: json.resposta, href, rotulo: href ? json.rotulo || "Abrir" : null });
  } catch {
    return NextResponse.json({ error: "Não consegui responder agora." }, { status: 500 });
  }
}
