import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { ehDonoOuAdmin } from "@/lib/business";

/** Limite do texto: cerca de 6 linhas na tela do celular. */
const MAX_CARACTERES = 230;

/**
 * Escreve o "Fale mais" de uma página de produto: um texto humano, curto (até 6 linhas),
 * no tom da marca e só com fatos que o dono já contou. Não grava nada: devolve o texto
 * para o dono ver, ajustar e desfazer se quiser.
 */
export async function POST(req: NextRequest) {
  try {
    const { contentItemId, atual } = await req.json();
    if (!contentItemId) return NextResponse.json({ error: "contentItemId é obrigatório." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });

    const { data: item } = await supabase
      .from("content_items")
      .select("id, title, description, type, business_id, image_url, gallery_urls, price, brand_label")
      .eq("id", contentItemId)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    if (!(await ehDonoOuAdmin(user.id, item.business_id))) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

    const { data: business } = await supabase
      .from("businesses")
      .select("name, about_business, differentials, brand_voice_summary, brand_personality, address")
      .eq("id", item.business_id)
      .maybeSingle();

    let imagem: { media_type: string; data: string } | null = null;
    const fotoUrl = item.image_url || item.gallery_urls?.[0] || null;
    if (fotoUrl && /^https?:\/\//.test(fotoUrl)) {
      try {
        const r = await fetch(fotoUrl, { signal: AbortSignal.timeout(8000) });
        const mt = (r.headers.get("content-type") ?? "").split(";")[0];
        if (r.ok && /^image\/(jpeg|png|webp|gif)$/.test(mt)) {
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length < 4_500_000) imagem = { media_type: mt, data: buf.toString("base64") };
        }
      } catch {
        // sem foto legível, segue só com o texto
      }
    }

    const cortar = (v: unknown, n: number) => {
      const t = typeof v === "string" ? v : v ? JSON.stringify(v) : "";
      return t.length > n ? `${t.slice(0, n)}…` : t;
    };
    const textoAtual = typeof atual === "string" ? atual.trim().slice(0, 1500) : "";

    const system = `Você é a Orbi e escreve o texto "Fale mais" da página de um produto ou serviço, como uma pessoa que conhece e gosta do que vende, não como um anúncio.

Regras:
- Um único parágrafo, de até ${MAX_CARACTERES} caracteres (cerca de 6 linhas no celular). Pode ser menor. Nunca passe disso.
- Tom humano, caloroso e direto, no jeito de falar da marca${business?.brand_voice_summary ? ` (${cortar(business.brand_voice_summary, 300)})` : ""}. Português do Brasil, frases curtas e naturais, como se estivesse contando para um cliente.
- Seja específico e sensorial: diga o que a pessoa vai viver, sentir ou comer, para quem é e em que ocasião funciona. Evite clichê ("qualidade", "excelência", "o melhor", "experiência única", "momentos inesquecíveis").
- Honestidade: só use como fato o que está no título, na descrição atual, no contexto da marca ou o que a foto mostra. Nunca invente preço, número, prêmio, horário, promoção ou prova social.
- Se já existe uma descrição escrita pelo dono, reescreva-a melhor, mantendo todos os fatos e a intenção dele.
- Sem emoji, sem travessão (use vírgula, ponto ou dois-pontos), sem aspas, sem lista, sem hashtag. Nunca use a palavra "loja".
- Responda somente com o texto final.

Marca: ${business?.name ?? ""}
Sobre o negócio: ${cortar(business?.about_business, 600) || "(sem informação)"}
Diferenciais informados: ${cortar(business?.differentials, 400) || "(nenhum)"}
Personalidade da marca: ${cortar(business?.brand_personality, 250) || "(nada)"}`;

    const texto = `Item: ${item.title}
Tipo: ${item.type}
Categoria: ${item.brand_label || "(sem categoria)"}
Preço: ${item.price != null ? `R$ ${item.price}` : "(não informado)"}
Descrição atual: ${textoAtual || item.description || "(nenhuma)"}
${imagem ? "A foto do item está anexada: use o que ela mostra." : "(sem foto legível)"}`;

    const raw = await askClaude({
      system,
      messages: [
        {
          role: "user",
          content: imagem
            ? [{ type: "image", source: { type: "base64", media_type: imagem.media_type, data: imagem.data } }, { type: "text", text: texto }]
            : texto,
        },
      ],
      maxTokens: 300,
    });

    let saida = raw.trim().replace(/^["“]|["”]$/g, "").replace(/\s*[—–]\s*/g, ", ").replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ");
    if (saida.length > MAX_CARACTERES) {
      const corte = saida.slice(0, MAX_CARACTERES);
      const fim = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf("! "), corte.lastIndexOf("? "));
      saida = fim > 80 ? corte.slice(0, fim + 1) : `${corte.replace(/[\s,;:]+\S*$/, "")}.`;
    }
    if (!saida) return NextResponse.json({ error: "A Orbi não conseguiu escrever agora." }, { status: 502 });
    return NextResponse.json({ texto: saida });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao gerar o texto." }, { status: 500 });
  }
}
