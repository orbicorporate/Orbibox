import { NextRequest, NextResponse } from "next/server";
import { askClaudeJSON } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const semTravessao = (t: string) => (t ?? "").replace(/\s*[—–]\s*/g, ", ").trim();

export type CampanhaData = {
  voucher: { titulo: string; descricao: string; tipo: "percent" | "fixed"; valor: number; quantidade: number; selo: string };
  posts: { canal: string; texto: string }[];
  ideia: string;
};

/**
 * Monta a campanha de uma data comemorativa pro negócio: um voucher com a
 * cara da data e os textos prontos pra divulgar. O dono só confere e ativa.
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId, dataNome, dias, clima } = await req.json();
    if (!businessId || !dataNome) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: business } = await supabase
      .from("businesses")
      .select("name, about_business, differentials, brand_voice_summary")
      .eq("id", businessId)
      .maybeSingle();
    if (!business) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

    const { data: itens } = await supabase
      .from("content_items")
      .select("title, price")
      .eq("business_id", businessId)
      .eq("status", "published")
      .limit(10);
    const catalogo = (itens ?? []).map((c) => `- ${c.title}${c.price != null ? ` (R$ ${Number(c.price).toFixed(2)})` : ""}`).join("\n");

    const system = `Você é a Orbi, consultora de marketing do Orbibox. Monte uma campanha curta e certeira de ${dataNome} (${clima}) pra um pequeno negócio brasileiro. Faltam ${dias} dias.

Negócio: ${business.name}
Sobre: ${business.about_business || "não informado"}
Diferenciais: ${business.differentials || "não informados"}
Tom de voz: ${business.brand_voice_summary || "próximo e natural"}
${catalogo ? `Produtos:\n${catalogo}` : ""}

Regras:
- O voucher precisa ter a ver com a data E com o negócio. Desconto realista pra pequeno negócio (entre 10% e 20%, ou um valor fixo baixo). Quantidade limitada (entre 20 e 50) pra dar urgência.
- "titulo": até 28 caracteres, sem a palavra voucher. "descricao": 1 frase curta dizendo como usar. "selo": até 14 caracteres, tipo "Dia das Crianças".
- "posts": exatamente 2, nesta ordem: "Story do Instagram" e "Status do WhatsApp". Textos curtos, prontos pra copiar, no tom da marca, 1 ou 2 emojis no máximo, citando a data e o voucher. Sem hashtags em excesso.
- "ideia": 1 frase com uma ideia extra simples pro balcão nessa data.
- Nunca use travessão. Português do Brasil.`;

    const { data } = await askClaudeJSON<CampanhaData>({
      system,
      messages: [{ role: "user", content: `Monte a campanha de ${dataNome} pra ${business.name}.` }],
      maxTokens: 1200,
      schema: {
        type: "object",
        properties: {
          voucher: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              descricao: { type: "string" },
              tipo: { type: "string", enum: ["percent", "fixed"] },
              valor: { type: "number" },
              quantidade: { type: "number" },
              selo: { type: "string" },
            },
            required: ["titulo", "descricao", "tipo", "valor", "quantidade", "selo"],
          },
          posts: {
            type: "array",
            items: { type: "object", properties: { canal: { type: "string" }, texto: { type: "string" } }, required: ["canal", "texto"] },
          },
          ideia: { type: "string" },
        },
        required: ["voucher", "posts", "ideia"],
      },
    });
    if (!data) return NextResponse.json({ error: "Não consegui montar agora." }, { status: 502 });

    const v = data.voucher;
    const campanha: CampanhaData = {
      voucher: {
        titulo: semTravessao(v.titulo).slice(0, 40),
        descricao: semTravessao(v.descricao),
        tipo: v.tipo === "fixed" ? "fixed" : "percent",
        valor: Math.max(1, Math.round(Number(v.valor) || 10)),
        quantidade: Math.min(200, Math.max(5, Math.round(Number(v.quantidade) || 30))),
        selo: semTravessao(v.selo).slice(0, 18),
      },
      posts: (data.posts ?? []).slice(0, 2).map((p) => ({ canal: semTravessao(p.canal), texto: semTravessao(p.texto) })),
      ideia: semTravessao(data.ideia),
    };
    return NextResponse.json(campanha);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao montar a campanha." }, { status: 500 });
  }
}
