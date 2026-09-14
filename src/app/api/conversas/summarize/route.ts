import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { AI_MODEL_RAPIDO } from "@/lib/aiModel";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const limpar = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").trim();

/**
 * Resumo de uma linha + temperatura pra conversa que não virou lead (a
 * pessoa não deixou WhatsApp). Usa o modelo rápido: é volume, não decisão.
 */
export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();
    if (!conversationId) return NextResponse.json({ error: "conversationId" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: conv } = await supabase
      .from("conversations")
      .select("id, business_id, summary, temperature, analyzed_at")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    if (conv.summary) return NextResponse.json({ resumo: conv.summary, temperatura: conv.temperature, cached: true });

    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(40);

    const doVisitante = (msgs ?? []).filter((m) => m.role === "visitor");
    if (doVisitante.length === 0) {
      await supabase.from("conversations").update({ summary: "", temperature: 0, analyzed_at: new Date().toISOString() }).eq("id", conversationId);
      return NextResponse.json({ resumo: "", temperatura: 0 });
    }

    const transcript = (msgs ?? []).map((m) => `${m.role === "visitor" ? "Visitante" : "Orbi"}: ${m.content}`).join("\n");

    const system = `Resuma esta conversa entre um visitante e a Orbi (IA de atendimento de um negócio) em UMA linha de até 16 palavras, dizendo o que a pessoa quis. Concreto, sem adjetivo. Depois dê uma temperatura de 0 a 100 do interesse comercial: quente (70+) se perguntou preço, como comprar, entrega, ou pediu contato; morno (35-69) se demonstrou interesse; frio (0-34) se só cumprimentou ou perguntou algo genérico.

Responda SOMENTE JSON: {"resumo":"...","temperatura":0}`;

    const raw = await askClaude({ system, messages: [{ role: "user", content: transcript }], maxTokens: 200, model: AI_MODEL_RAPIDO });
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);

    const resumo = limpar(String(parsed.resumo ?? ""));
    const temperatura = Math.max(0, Math.min(100, Math.round(Number(parsed.temperatura ?? 0))));

    await supabase
      .from("conversations")
      .update({ summary: resumo, temperature: temperatura, analyzed_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ resumo, temperatura });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
