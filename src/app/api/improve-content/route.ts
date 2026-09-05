import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { contentItemId } = await req.json();
    if (!contentItemId) {
      return NextResponse.json({ error: "contentItemId é obrigatório." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: item } = await supabase
      .from("content_items")
      .select("id, title, description, price, type, business_id")
      .eq("id", contentItemId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("name, brand_voice_summary")
      .eq("id", item.business_id)
      .maybeSingle();

    const system = `Você é a Orbi, a camada de inteligência do Orbibox que ajuda donos de negócio a criar e melhorar descrições de produto/serviço para converter mais visitantes em clientes.
Marca: ${business?.name ?? ""}. ${business?.brand_voice_summary ? `Tom de voz: ${business.brand_voice_summary}` : ""}
Se já houver uma descrição, melhore-a. Se estiver vazia, crie uma do zero a partir do título do item.
Escreva SOMENTE a descrição final, sem preâmbulo, sem aspas, sem explicações. Máximo 2 frases curtas, linguagem vendedora mas natural, sem exagero.`;

    const userMsg = `Item: ${item.title}${item.price != null ? ` (R$ ${Number(item.price).toFixed(2)})` : ""}
Descrição atual: ${item.description || "(nenhuma)"}
Tipo: ${item.type}`;

    const improved = await askClaude({
      system,
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 150,
    });

    const cleaned = improved.trim().replace(/^"|"$/g, "");

    await supabase
      .from("content_items")
      .update({ description: cleaned, ai_optimized: true })
      .eq("id", contentItemId);

    return NextResponse.json({ description: cleaned });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao melhorar conteúdo." }, { status: 500 });
  }
}
