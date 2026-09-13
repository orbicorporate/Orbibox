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

    const conversa = historico.map((t, i) => `P${i + 1}: ${t.pergunta}\nR${i + 1}: ${t.resposta}`).join("\n\n") || "(ainda não começou)";

    if (acao === "finalizar") {
      // Transforma as respostas em campos prontos.
      const system = `Você é a Orbi, a inteligência do Orbibox. Entrevistou o dono de "${nome}" pra conhecer o negócio. Com base nas respostas, escreva de forma natural e em primeira pessoa da marca (nós/a gente), sem inventar nada além do que foi dito.

Responda APENAS um JSON válido, sem markdown, com estas chaves:
{"sobre": "2-3 frases sobre o que o negócio faz e pra quem, tom humano", "diferenciais": "1-2 frases sobre o que torna esse negócio diferente/especial", "tom_formal_informal": número de 0 a 100 (0=muito formal, 100=muito descontraído), "resumo_publico": "1 frase curta sobre quem é o público"}

Entrevista:
${conversa}`;
      const raw = await chamarIA(system, "Gere o JSON.", 700, key);
      try {
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        // Salva sobre e diferenciais no negócio; tom no agent_config.
        await supabase.from("businesses").update({
          about_business: parsed.sobre ?? null,
          differentials: parsed.diferenciais ?? null,
        }).eq("id", businessId);
        if (typeof parsed.tom_formal_informal === "number") {
          await supabase.from("agent_configs").upsert({
            business_id: businessId,
            tone_formal_informal: Math.max(0, Math.min(100, Math.round(parsed.tom_formal_informal))),
          }, { onConflict: "business_id" });
        }
        return NextResponse.json({ ok: true, sobre: parsed.sobre, diferenciais: parsed.diferenciais, publico: parsed.resumo_publico });
      } catch {
        return NextResponse.json({ ok: false });
      }
    }

    // Próxima pergunta, adaptada ao que já foi dito.
    const total = historico.length;
    const system = `Você é a Orbi, a inteligência do Orbibox, entrevistando o dono de "${nome}" pra conhecer o negócio e o público, e assim trabalhar melhor por ele.

Faça a PRÓXIMA pergunta da entrevista (esta é a de número ${total + 1} de 5 no total). Regras:
- UMA pergunta só, curta (máx 2 linhas), calorosa, inteligente e específica.
- Adapte ao que a pessoa já respondeu: aprofunde, não repita.
- Cubra ao longo das 5: o que o negócio faz, pra quem, o que o torna diferente, o tom/personalidade da marca, e o que a pessoa mais quer que a Orbi ajude.
- Não use travessão. Não numere. Não explique, só faça a pergunta.

Conversa até agora:
${conversa}`;
    const pergunta = await chamarIA(system, "Qual a próxima pergunta?", 200, key);
    return NextResponse.json({ pergunta: pergunta.replace(/\s*—\s*/g, ", ").replace(/^["']|["']$/g, "").trim() });
  } catch {
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
