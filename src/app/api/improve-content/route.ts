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
      .select("name, about_business, differentials, brand_voice_summary, site_type")
      .eq("id", item.business_id)
      .maybeSingle();

    const system = `Você é a Orbi, a camada de inteligência do Orbibox que ajuda donos de negócio a criar descrições de produto/serviço que realmente ajudam o visitante a decidir comprar.

Contexto do negócio — use isso pra entender de verdade o que ele oferece antes de escrever, sem inventar informação que não está aqui:
Marca: ${business?.name ?? ""}
Sobre o negócio: ${business?.about_business || "(sem informação)"}
Diferenciais: ${business?.differentials || "(nenhum informado)"}
${business?.brand_voice_summary ? `Tom de voz: ${business.brand_voice_summary}` : ""}

Como escrever:
- Se já houver uma descrição, melhore-a de verdade (não só reescreva com outras palavras — deixe mais clara e completa). Se estiver vazia, crie do zero a partir do título e do contexto do negócio.
- Quando fizer sentido pro tipo de item (principalmente serviços), estruture em uma frase de abertura curta + bullet points com "•" destacando o que está incluído, como funciona, ou como contratar — cada bullet numa linha própria (quebra de linha de verdade entre eles). Isso ajuda o visitante a entender rápido, sem precisar ler um texto corrido.
- Pra produto simples, um parágrafo curto costuma bastar — só use bullets se genuinamente ajudar a entender.
- Tom vendedor mas natural, sem exagero, sem emoji.
- No máximo uns 500 caracteres no total — curto e fácil de escanear, não um textão.
- Escreva SOMENTE o texto final, sem preâmbulo, sem aspas, sem explicações sobre o que você fez.`;

    const userMsg = `Item: ${item.title}${item.price != null ? ` (R$ ${Number(item.price).toFixed(2)})` : ""}
Descrição atual: ${item.description || "(nenhuma)"}
Tipo: ${item.type}`;

    const improved = await askClaude({
      system,
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 350,
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
