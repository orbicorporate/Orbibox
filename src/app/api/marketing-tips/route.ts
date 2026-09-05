import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

const INSTRUCOES: Record<string, string> = {
  bio: `Escreva uma bio de Instagram curtíssima (até 4 linhas), com 1 a 3 emojis no máximo, que diga o que a marca faz e chame a pessoa pra tocar no link. Termine com uma seta apontando pro link (ex: "👇"). Dê 2 opções separadas por "———".`,
  story: `Escreva 3 ideias curtas de Story pra divulgar o link: cada uma com uma frase de chamada e a orientação do que mostrar na tela. Depois, escreva 1 resposta pronta pra mandar no Direct de quem demonstrar interesse, incluindo o convite pra abrir o link. Seja direto e caloroso.`,
  whatsapp: `Escreva 3 mensagens curtas e naturais de WhatsApp pra divulgar o link: (1) uma pra mandar num contato que perguntou "quanto custa / o que você faz", (2) uma pra postar no Status, (3) uma pra reativar um cliente antigo. Sem parecer robô, sem exagero de emoji.`,
  grupo: `Escreva 2 mensagens pra compartilhar o link em grupos (WhatsApp/Facebook) sem soar como spam: comece entregando valor ou contexto e só depois convide pro link. Tom de gente real, não de propaganda.`,
  anuncio: `Escreva 2 ideias de anúncio simples (para impulsionar no Instagram) levando pro link: cada uma com um título curto, um texto de 2 linhas e uma sugestão de público-alvo. Foco em clareza e no benefício, não em promessas exageradas.`,
};

export async function POST(req: NextRequest) {
  try {
    const { businessId, kind } = await req.json();
    if (!businessId || !kind || !INSTRUCOES[kind]) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: business } = await supabase
      .from("businesses")
      .select("name, slug, about_business, brand_voice_summary")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!business) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

    const { data: items } = await supabase
      .from("content_items")
      .select("title")
      .eq("business_id", businessId)
      .eq("status", "published")
      .limit(8);
    const catalogo = (items ?? []).map((i) => i.title).join(", ");

    const system = `Você é a Orbi, consultora de marketing do Orbibox. Ajuda donos de pequenos negócios a divulgar a página deles (o "link do Orbibox") pelos canais certos, de forma prática e sem enrolação.
Negócio: "${business.name}". ${business.about_business ? `Sobre: ${business.about_business}` : ""}
${catalogo ? `Oferece: ${catalogo}.` : ""}
Tom de voz da marca: ${business.brand_voice_summary || "próximo, claro e confiante"}.
Regras: escreva em português do Brasil, direto ao ponto, pronto pra copiar e colar. Não explique o que vai fazer, entregue o conteúdo. Não invente dados ou números. Quando fizer sentido citar o link, use a expressão "o link" (o dono cola o link real depois). Nada de jargão de marketing difícil.`;

    const text = await askClaude({
      system,
      messages: [{ role: "user", content: INSTRUCOES[kind] }],
      maxTokens: 600,
    });

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui gerar agora. Tenta de novo." }, { status: 500 });
  }
}
