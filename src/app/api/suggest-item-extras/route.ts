import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

/**
 * Gera duas coisas curtas e opcionais pra página própria de um item
 * (produto/serviço/categoria): uma lista curta de diferenciais/prova social
 * (só com base real no que o dono já contou sobre o negócio, nunca
 * inventada) e uma pergunta da Orbi pra puxar conversa sobre aquele item
 * específico. O dono pode editar, apagar ou completar o que vier, em
 * qualquer um dos campos, exatamente como já acontece com a descrição
 * melhorada.
 */
export async function POST(req: NextRequest) {
  try {
    const { contentItemId } = await req.json();
    if (!contentItemId) {
      return NextResponse.json({ error: "contentItemId é obrigatório." }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: item } = await supabase
      .from("content_items")
      .select("id, title, description, type, business_id, image_url, gallery_urls, price, brand_label")
      .eq("id", contentItemId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    const [{ data: business }, { data: irmaos }] = await Promise.all([
      supabase
        .from("businesses")
        .select("name, about_business, differentials, brand_voice_summary, website_url, instagram_handle, site_analysis, brand_personality, address")
        .eq("id", item.business_id)
        .maybeSingle(),
      supabase.from("content_items").select("title").eq("business_id", item.business_id).eq("status", "published").neq("id", item.id).limit(12),
    ]);

    // A foto do item: a Orbi olha de verdade pra sugerir o que se vê nela.
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

    const system = `Você é a Orbi, a inteligência de uma marca, e escreve a página própria de um item (produto, serviço ou categoria) como uma redatora criativa de verdade, não como um formulário. Duas partes:

1) DIFERENCIAL: de 2 a 4 linhas curtas (até 60 caracteres cada) que fazem o cliente querer esse item. Cada linha começa com "DIFERENCIAL: " e olha de um ângulo diferente: o que se VÊ na foto (ingredientes, texturas, cores, cenário, acabamento, porte, embalagem), a ocasião ideal de uso, pra quem é, o jeito de fazer, o sentimento que entrega, o que está no site ou na descrição. Seja específico e sensorial: prefira "Fruta fresca da estação, espremida na hora" a "Ótima qualidade". Nada de clichê vazio ("qualidade", "excelência", "o melhor", "atendimento diferenciado").
REGRA DE HONESTIDADE: tudo que for fato (anos de mercado, número de clientes, prêmios, entrega, certificação, preço, promoção) só pode aparecer se estiver escrito no contexto abaixo. Já o que a foto mostra e o que o título e a descrição dizem você pode e deve usar com liberdade. Nunca invente número, data ou prova social. Não repita o que a descrição do item já diz com as mesmas palavras.

2) PERGUNTA: uma pergunta curta e natural que a Orbi faria pra puxar conversa sobre ESSE item, ligada à ocasião ou à escolha (ex.: "É pra comemorar algo ou pra um programa a dois?"), nunca genérica como "Posso ajudar?". Máximo 80 caracteres, sem aspas.

Escreva no tom da marca${business?.brand_voice_summary ? ` (${cortar(business.brand_voice_summary, 300)})` : ""}, em português do Brasil, sem emoji.

Contexto da marca (fonte dos fatos):
Marca: ${business?.name ?? ""}
Sobre o negócio: ${cortar(business?.about_business, 700) || "(sem informação)"}
Diferenciais já informados: ${cortar(business?.differentials, 500) || "(nenhum)"}
Site: ${business?.website_url || "(não informado)"}
Instagram: ${business?.instagram_handle ? `@${business.instagram_handle.replace(/^@/, "")}` : "(não informado)"}
O que a Orbi leu do site: ${cortar(business?.site_analysis, 1200) || "(nada)"}
Personalidade da marca: ${cortar(business?.brand_personality, 300) || "(nada)"}
Endereço: ${business?.address || "(não informado)"}
Outros itens da vitrine: ${(irmaos ?? []).map((x) => x.title).join(", ") || "(nenhum)"}

Responda só com linhas neste formato, sem nada antes ou depois:
DIFERENCIAL: <texto>
DIFERENCIAL: <texto>
PERGUNTA: <texto>`;

    const texto = `Item: ${item.title}
Tipo: ${item.type}
Categoria: ${item.brand_label || "(sem categoria)"}
Preço: ${item.price != null ? `R$ ${item.price}` : "(não informado)"}
Descrição: ${item.description || "(nenhuma)"}
${imagem ? "A foto do item está anexada: descreva o que ela mostra nos diferenciais." : "(sem foto legível)"}`;

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
      maxTokens: 400,
    });

    const strip = (s: string) => s.trim().replace(/^"|"$/g, "");

    const highlights = [...raw.matchAll(/DIFERENCIAL:\s*(.*)/gi)]
      .map((m) => strip(m[1] ?? ""))
      .filter(Boolean)
      .slice(0, 4);
    const hook = raw.match(/PERGUNTA:\s*(.*)/i)?.[1] ?? "";
    const orbiHook = strip(hook) || null;

    await supabase
      .from("content_items")
      .update({ highlights: highlights.length ? highlights : null, orbi_hook: orbiHook })
      .eq("id", contentItemId);

    return NextResponse.json({ highlights, orbiHook });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao gerar sugestões." }, { status: 500 });
  }
}
