import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL, ANTHROPIC_API_URL } from "@/lib/aiModel";

export const runtime = "nodejs";

type Turno = { pergunta: string; resposta: string };

async function chamarIA(system: string, userText: string, maxTokens: number, key: string) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, temperature: 0.9, system, messages: [{ role: "user", content: userText }] }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  const bloco = data.content?.find((b: { type: string }) => b.type === "text");
  return (bloco?.text ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, historico, acao } = await req.json() as { businessId: string; historico: Turno[]; acao: "proxima" | "finalizar" };
    if (!businessId) return NextResponse.json({ error: "faltam dados" }, { status: 400 });
    const key = process.env.ANTHROPIC_API_KEY || process.env.CHAVE_API_ANTROPICA;
    if (!key) return NextResponse.json({ error: "sem chave" }, { status: 500 });

    const supabase = await createClient();
    const { data: biz } = await supabase.from("businesses").select("name").eq("id", businessId).maybeSingle();
    const nome = biz?.name ?? "o negócio";

    if (acao === "finalizar") {
      // Transforma as respostas em campos prontos. Ignora perguntas puladas.
      const usaveis = historico.filter((t) => t.resposta && t.resposta !== "(prefiro não responder essa)");
      const conversaUtil = usaveis.map((t, i) => `P${i + 1}: ${t.pergunta}\nR${i + 1}: ${t.resposta}`).join("\n\n") || "(pouca informação)";
      const system = `Você é a Orbi, a inteligência do Orbibox. Conversou com o dono de "${nome}" pra conhecer o negócio. Com base no que ele contou, escreva de forma natural e em primeira pessoa da marca (nós/a gente), sem inventar nada além do que foi dito. Se a informação for pouca, escreva o que der com honestidade, sem encher.

Responda APENAS um JSON válido, sem markdown, com estas chaves:
{"sobre": "2-3 frases sobre o que o negócio faz e pra quem, tom humano", "diferenciais": "1-2 frases sobre o que torna esse negócio diferente, priorizando o motivo concreto de escolha que ele deu", "tom_formal_informal": número de 0 a 100 (0=muito formal, 100=muito descontraído), "resumo_publico": "1 frase curta sobre quem é o público", "duvidas_frequentes": "as dúvidas que ele disse que os clientes mais fazem antes de fechar, reescritas como 2-4 frases curtas que a Orbi possa responder sozinha pro visitante. Se ele não citou nenhuma, devolva string vazia"}

Conversa:
${conversaUtil}`;
      const raw = await chamarIA(system, "Gere o JSON.", 1400, key);
      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        // Salva sobre e diferenciais no negócio; tom no agent_config.
        // As dúvidas frequentes viram base de resposta da Orbi no chat, então
        // entram em "policies", que é o campo que ela consulta pra isso.
        const duvidas = typeof parsed.duvidas_frequentes === "string" ? parsed.duvidas_frequentes.trim() : "";
        await supabase.from("businesses").update({
          about_business: parsed.sobre ?? null,
          differentials: parsed.diferenciais ?? null,
          ...(duvidas ? { policies: duvidas } : {}),
        }).eq("id", businessId);
        if (typeof parsed.tom_formal_informal === "number") {
          await supabase.from("agent_configs").upsert({
            business_id: businessId,
            tone_formal_informal: Math.max(0, Math.min(100, Math.round(parsed.tom_formal_informal))),
          }, { onConflict: "business_id" });
        }
        return NextResponse.json({ ok: true, sobre: parsed.sobre, diferenciais: parsed.diferenciais, publico: parsed.resumo_publico, duvidas });
      } catch {
        // JSON inválido ou cortado: o front precisa saber que falhou, senão
        // mostra um card de sucesso sem conteúdo nenhum.
        return NextResponse.json({ ok: false, error: "parse" });
      }
    }

    // As perguntas são fixas (definidas no front). A API só finaliza.
    return NextResponse.json({ error: "acao invalida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
