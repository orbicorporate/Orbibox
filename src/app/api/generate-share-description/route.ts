import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) {
      return NextResponse.json({ error: "businessId é obrigatório." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: business } = await supabase
      .from("businesses")
      .select("name, about_business, differentials, brand_voice_summary")
      .eq("id", businessId)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }

    const system = `Você é a Orbi, a camada de inteligência do Orbibox. Escreva a descrição curta que aparece no preview do link (WhatsApp, Instagram etc.) — embaixo do nome do negócio, que já aparece em destaque separadamente.
Regras obrigatórias:
- NUNCA comece com o nome do negócio nem o repita no texto — ele já está escrito logo acima, repetir fica redundante.
- No máximo 90 caracteres (cabe em 3 linhas curtas no preview do link, incluindo os espaços).
- Uma frase só, direto ao ponto: o que o negócio oferece ou por que vale a pena visitar.
- Tom convidativo, sem exagero, sem emoji, sem aspas.
- Escreva SOMENTE a frase final, nada mais.`;

    const userMsg = `Negócio: ${business.name}
Sobre: ${business.about_business?.slice(0, 400) || "(sem informação)"}
Diferenciais: ${business.differentials?.slice(0, 200) || "(nenhum informado)"}
${business.brand_voice_summary ? `Tom de voz: ${business.brand_voice_summary}` : ""}`;

    const generated = await askClaude({
      system,
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 100,
    });

    let cleaned = generated.trim().replace(/^"|"$/g, "");
    // Se mesmo assim passar de 90, corta na palavra inteira — nunca deixa o
    // link cortando a descrição no meio de uma palavra.
    if (cleaned.length > 90) {
      cleaned = `${cleaned.slice(0, 90).replace(/\s+\S*$/, "")}…`;
    }

    await supabase.from("businesses").update({ share_description: cleaned }).eq("id", businessId);

    return NextResponse.json({ description: cleaned });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao gerar descrição." }, { status: 500 });
  }
}
