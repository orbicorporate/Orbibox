import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askClaude } from "@/lib/anthropic";
import { AI_MODEL_RAPIDO } from "@/lib/aiModel";
import { AJUDAS } from "@/lib/ajuda";

// Pergunta de uso do painel que a base local não respondeu: a Orbi responde
// em passos curtos, usando só o que está na base como referência de onde
// cada coisa fica, e devolve pra qual tela mandar a pessoa.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const { pergunta } = (await req.json()) as { pergunta?: string };
  const texto = (pergunta ?? "").trim().slice(0, 400);
  if (!texto) return NextResponse.json({ error: "Pergunta vazia." }, { status: 400 });

  const mapa = AJUDAS.map((a) => `- ${a.pergunta} → ${a.passos.join(" ")}${a.acao ? ` [tela: ${a.acao.href}]` : ""}`).join("\n");
  const system = `Você é a Orbi, assistente do painel Orbibox (página inteligente para pequenos negócios no Brasil). Quem pergunta é o dono do negócio, geralmente leigo em tecnologia.
Responda em português do Brasil, simples e direto, em no máximo 3 passos curtos. Nada de jargão técnico, nada de inglês.
Abas do painel: Início, Botões (os botões da página), Catálogo (produtos e serviços), Conversas, Resultados. No menu de configurações: Sua marca, Sua IA, Vouchers, Gift Cards.
Use este mapa como verdade sobre onde cada coisa fica:
${mapa}
Se a pergunta não for sobre usar o Orbibox, diga gentilmente que você ajuda com o painel e sugira uma pergunta.
Responda SOMENTE em JSON: {"passos": ["...", "..."], "href": "/admin/..." ou null, "rotulo": "texto curto do botão" ou null}`;

  try {
    const bruto = await askClaude({ system, messages: [{ role: "user", content: texto }], maxTokens: 400, model: AI_MODEL_RAPIDO });
    const json = JSON.parse(bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1)) as { passos?: string[]; href?: string | null; rotulo?: string | null };
    const href = json.href && /^\/admin(\/|$|\?|#)/.test(json.href) ? json.href : null;
    return NextResponse.json({ passos: (json.passos ?? []).slice(0, 4), href, rotulo: href ? json.rotulo || "Abrir" : null });
  } catch {
    return NextResponse.json({ error: "Não consegui responder agora." }, { status: 500 });
  }
}
