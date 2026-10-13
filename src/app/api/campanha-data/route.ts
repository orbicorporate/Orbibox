import { NextRequest, NextResponse } from "next/server";
import { askClaudeJSON } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const semTravessao = (t: string) => (t ?? "").replace(/\s*[—–]\s*/g, ", ").trim();

export type CampanhaData = {
  voucher: { titulo: string; descricao: string; tipo: "percent" | "fixed"; valor: number; quantidade: number; selo: string };
  /** Foto do produto que combina com a campanha, pra o voucher já sair com imagem. */
  foto: string | null;
  fotoDe: string | null;
  posts: { canal: string; texto: string }[];
  ideia: string;
};

/**
 * Monta a campanha de uma data comemorativa pro negócio: um voucher com a
 * cara da data e os textos prontos pra divulgar. O dono só confere e ativa.
 */
export async function POST(req: NextRequest) {
  try {
    const { businessId, dataNome, dias, clima, anteriores } = await req.json();
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
      .select("title, price, image_url")
      .eq("business_id", businessId)
      .eq("status", "published")
      .limit(30);
    const lista = (itens ?? []) as { title: string; price: number | null; image_url: string | null }[];
    const catalogo = lista.slice(0, 15).map((c) => `- ${c.title}${c.price != null ? ` (R$ ${Number(c.price).toFixed(2)})` : ""}${c.image_url ? " [tem foto]" : ""}`).join("\n");
    const evitar = Array.isArray(anteriores) && anteriores.length > 0 ? `\nJá sugeridas antes (faça DIFERENTE, outra ideia, outro produto em foco, outro desconto): ${anteriores.slice(0, 6).map((t: string) => `"${String(t).slice(0, 40)}"`).join(", ")}.` : "";

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
- "produto_foto": o título EXATO de um produto da lista marcado com [tem foto] que mais combina com a campanha (ele vira a foto do voucher). Se nenhum tiver foto, deixe vazio.
- Nunca use travessão. Português do Brasil.${evitar}`;

    const { data } = await askClaudeJSON<CampanhaData & { produto_foto?: string }>({
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
          produto_foto: { type: "string" },
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
    // Foto do voucher: o produto que a Orbi escolheu; se não achar, o primeiro com foto, ou a capa da vitrine.
    const comFoto = lista.filter((c) => !!c.image_url);
    const escolhido = comFoto.find((c) => c.title.trim().toLowerCase() === (data.produto_foto ?? "").trim().toLowerCase()) ?? comFoto[0] ?? null;
    let foto: string | null = escolhido?.image_url ?? null;
    let fotoDe: string | null = escolhido?.title ?? null;
    if (!foto) {
      const { data: cap } = await supabase.from("businesses").select("vitrine_cover_url").eq("id", businessId).maybeSingle();
      foto = (cap as { vitrine_cover_url: string | null } | null)?.vitrine_cover_url ?? null;
      fotoDe = null;
    }
    const campanha: CampanhaData = {
      foto,
      fotoDe,
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
