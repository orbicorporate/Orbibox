import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const limpar = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").trim();

/**
 * Uma dica extra de conversão, gerada pela Orbi olhando o negócio de
 * verdade (o que ele vende, os boxes que tem, a taxa atual). Complementa
 * os passos fixos da leitura, que são iguais pra todo mundo na mesma faixa.
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId, taxa, visitas, evitar } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: biz } = await supabase
      .from("businesses")
      .select("name, about_business, differentials")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!biz) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

    const { data: boxes } = await supabase
      .from("smart_boxes")
      .select("title, is_active, config")
      .eq("business_id", businessId);
    const ativos = (boxes ?? []).filter((b) => b.is_active).map((b) => b.title).join(", ");

    const system = `Você é a Orbi, consultora de conversão do Orbibox de "${biz.name}". A página tem taxa de ação de ${taxa}% em ${visitas} visitas. Boxes ativos: ${ativos || "nenhum"}.
Sobre o negócio: ${biz.about_business || "não informado"}. Diferenciais: ${biz.differentials || "não informados"}.

Dê UMA dica prática e específica pra esse negócio aumentar a taxa de ação, diferente das dicas óbvias de organizar boxes. Pense no que ESSE negócio poderia fazer, dado o que ele vende.
${evitar ? `Não repita esta ideia já dada: "${evitar}".` : ""}

Responda SOMENTE JSON: {"titulo":"até 5 palavras","texto":"1 ou 2 frases práticas, até 30 palavras, sem clichê, sem travessão"}`;

    const raw = await askClaude({ system, messages: [{ role: "user", content: "Gere a dica." }], maxTokens: 200 });
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);

    return NextResponse.json({ titulo: limpar(String(parsed.titulo ?? "")), texto: limpar(String(parsed.texto ?? "")) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Não consegui gerar agora." }, { status: 500 });
  }
}
