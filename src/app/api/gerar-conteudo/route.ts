import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

const FORMATO: Record<string, string> = {
  legenda: "uma legenda pra post de Instagram: envolvente, 2-4 linhas, com uma chamada pra ação e 3-5 hashtags relevantes no fim",
  story: "uma ideia de story pro Instagram: curta e direta, com uma sugestão do que mostrar no visual e um texto de sobreposição chamativo",
  whatsapp: "uma mensagem pra mandar na lista de transmissão do WhatsApp: pessoal, calorosa, curta, como se falasse direto com o cliente, com uma chamada pra ação",
};

export async function POST(req: NextRequest) {
  try {
    const { businessId, productTitle, tipo } = await req.json();
    if (!businessId || !tipo) return NextResponse.json({ error: "faltam dados" }, { status: 400 });

    const key = process.env.ANTHROPIC_API_KEY || process.env.CHAVE_API_ANTROPICA;
    if (!key) return NextResponse.json({ error: "sem chave" }, { status: 500 });

    const supabase = await createClient();
    const { data: biz } = await supabase.from("businesses").select("name, about_business, differentials").eq("id", businessId).maybeSingle();

    const oQue = FORMATO[tipo] ?? FORMATO.legenda;
    const system = `Você escreve conteúdo de marketing pra ${biz?.name ?? "um negócio"}. ${biz?.about_business ? "Sobre o negócio: " + biz.about_business + ". " : ""}${biz?.differentials ? "Diferenciais: " + biz.differentials + ". " : ""}
Escreva ${oQue}, promovendo o produto/serviço "${productTitle}". Português do Brasil, no tom da marca. Responda APENAS o texto pronto pra usar, sem introdução, sem aspas, sem explicação.`;

    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: [{ role: "user", content: `Crie o conteúdo pra: ${productTitle}` }] }),
    });
    if (!res.ok) return NextResponse.json({ error: "erro ia" }, { status: 500 });
    const data = await res.json();
    const block = data.content?.find((b: { type: string }) => b.type === "text");
    return NextResponse.json({ texto: (block?.text ?? "").trim() });
  } catch (error) {
    console.error("Erro ao gerar conteúdo:", error);
    return NextResponse.json({ error: "erro" }, { status: 500 });
  }
}
