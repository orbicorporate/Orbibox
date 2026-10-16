import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { askClaudeJSON } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FOTOS = 8;
const MAX_TEXTO = 24000;

type Proposta = {
  categorias: { nome: string; itens: { titulo: string; descricao?: string; preco?: number | null; preco_tipo?: "exato" | "a_partir"; foto?: { imagem?: number; x?: number; y?: number; largura?: number; altura?: number } | null }[] }[];
};

const SISTEMA = `Você transforma um cardápio (texto colado ou foto) em itens organizados para o catálogo de um restaurante, lanchonete, sorveteria ou similar do Brasil.

Regras:
- Copie fielmente o que está no cardápio. Nunca invente item, ingrediente nem preço.
- Agrupe por categoria, na ordem em que aparecem (ex: Lanches, Bebidas, Sobremesas). Se não houver categorias claras, use categorias simples e óbvias.
- titulo: nome do item, com capitalização normal (não tudo em maiúsculas). Sem preço no título.
- descricao: tudo o que o cardápio escreve sobre o item além do nome e do preço: ingredientes, composição, sabor, tamanho, o que acompanha. Costuma estar logo abaixo ou ao lado do nome, em letra menor. Leia com atenção até o texto pequeno e copie fielmente, em uma frase curta (até 200 caracteres). Deixe vazio só se o cardápio realmente não escreve nada sobre aquele item.
- Uma descrição que vale para toda a categoria (ex.: "todos os shakes vêm com chantilly") não é de um item só: repita-a na descricao de cada item da categoria.
- preco: número em reais (ex: 12.5). Se o preço não aparece, null.
- Se o item tem tamanhos ou variações com preços diferentes (P, M, G), crie UM item só, com o MENOR preço, preco_tipo "a_partir", e escreva os tamanhos e valores na descricao (ex: "P R$ 12, M R$ 15, G R$ 18"). Com preço único, preco_tipo "exato".
- Ignore endereço, telefone, redes sociais, horário e frases de propaganda.
- foto: quando o item tem uma foto ou ilustração própria no cardápio, informe onde ela está. "imagem" é o número da imagem enviada (os rótulos "Imagem 1", "Imagem 2"...). x e y são o canto superior esquerdo da foto, largura e altura são o tamanho dela, tudo em fração de 0 a 1 da imagem inteira (x 0.5 é o meio). Enquadre bem justo só o prato ou a bebida em si (o copo, a taça, o prato com a comida), cortando o selo ou círculo de preço, o nome escrito, a legenda, bordas decorativas e qualquer outro elemento gráfico do cardápio. É melhor errar para dentro, pegando um pouco menos do prato, do que incluir texto ou preço. Se o item não tem foto própria, ou se não tiver certeza de onde ela está, use null. Nunca invente.
- No máximo 150 itens. Texto em português do Brasil.`;

const SISTEMA_LISTA = `Você transforma um texto colado ou foto de uma lista de produtos (roupas, acessórios, presentes, serviços etc.) em itens para uma lista dentro da página de um negócio brasileiro.

Regras:
- Copie fielmente o que está no material. Nunca invente item, detalhe nem preço.
- Coloque todos os itens numa única categoria chamada "Itens", na ordem em que aparecem.
- titulo: nome do item, com capitalização normal (não tudo em maiúsculas). Sem preço no título.
- descricao: detalhe curto do item (material, tamanhos, cor), só se estiver no material. Vazio se não houver.
- preco: número em reais (ex: 89.9). Se o preço não aparece, null. Se há tamanhos com preços diferentes, use o MENOR preço, preco_tipo "a_partir" e escreva os tamanhos na descricao.
- Ignore endereço, telefone, redes sociais e frases de propaganda.
- No máximo 60 itens. Texto em português do Brasil.`;

const SCHEMA = {
  type: "object",
  properties: {
    categorias: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          itens: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                descricao: { type: "string" },
                preco: { type: ["number", "null"] },
                preco_tipo: { type: "string", enum: ["exato", "a_partir"] },
                foto: {
                  type: ["object", "null"],
                  properties: {
                    imagem: { type: "integer" },
                    x: { type: "number" },
                    y: { type: "number" },
                    largura: { type: "number" },
                    altura: { type: "number" },
                  },
                },
              },
              required: ["titulo"],
            },
          },
        },
        required: ["nome", "itens"],
      },
    },
  },
  required: ["categorias"],
};

/** Só aceita uma posição de foto que faça sentido (dentro da imagem e com tamanho razoável). */
function caixaValida(f: { imagem?: number; x?: number; y?: number; largura?: number; altura?: number } | null | undefined, total: number) {
  if (!f || typeof f !== "object") return null;
  const { imagem, x, y, largura, altura } = f;
  if (![imagem, x, y, largura, altura].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const im = Math.round(imagem as number);
  if (im < 1 || im > total) return null;
  const cx = Math.min(Math.max(x as number, 0), 1);
  const cy = Math.min(Math.max(y as number, 0), 1);
  const w = Math.min(largura as number, 1 - cx);
  const h = Math.min(altura as number, 1 - cy);
  if (w < 0.04 || h < 0.04 || w > 0.9 || h > 0.9) return null;
  return { imagem: im, x: cx, y: cy, largura: w, altura: h };
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, texto, imagens, modo } = (await req.json()) as { businessId?: string; texto?: string; imagens?: string[]; modo?: string };
    const lista = modo === "lista";
    const textoLimpo = (texto ?? "").trim().slice(0, MAX_TEXTO);
    const fotos = Array.isArray(imagens) ? imagens.slice(0, MAX_FOTOS) : [];
    if (!businessId || (!textoLimpo && fotos.length === 0)) {
      return NextResponse.json({ error: "Cole o texto do cardápio ou envie uma foto." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
    const atual = await getCurrentBusinessId(userData.user.id);
    if (!atual || atual !== businessId) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

    // Só aceita fotos do próprio armazenamento do negócio.
    const base = supabase.storage.from("box-images").getPublicUrl(`${businessId}/`).data.publicUrl;
    const content: unknown[] = [];
    for (const [pos, url] of fotos.entries()) {
      if (!url.startsWith(base)) continue;
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const jpg = await sharp(Buffer.from(await r.arrayBuffer()))
          .rotate()
          .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 88 })
          .toBuffer();
        content.push({ type: "text", text: `Imagem ${pos + 1}:` });
        content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpg.toString("base64") } });
      } catch {
        /* foto ilegível: segue com as outras */
      }
    }
    if (textoLimpo) content.push({ type: "text", text: `${lista ? "Texto da lista" : "Texto do cardápio"}:\n\n${textoLimpo}` });
    content.push({ type: "text", text: lista ? "Monte os itens da lista." : "Monte os itens do cardápio." });
    if (content.length <= 1) return NextResponse.json({ error: "Não consegui ler as fotos. Tente outra foto, ou cole o texto." }, { status: 422 });

    const { data, truncated } = await askClaudeJSON<Proposta>({
      system: lista ? SISTEMA_LISTA : SISTEMA,
      messages: [{ role: "user", content: content as never }],
      schema: SCHEMA,
      toolName: "montar_cardapio",
      maxTokens: 12000,
    });
    const categorias = (data?.categorias ?? [])
      .map((c) => ({
        nome: String(c.nome ?? "").trim().slice(0, 40) || "Itens",
        itens: (c.itens ?? [])
          .filter((i) => i && String(i.titulo ?? "").trim())
          .map((i) => ({
            foto: caixaValida(i.foto, fotos.length),
            titulo: String(i.titulo).trim().slice(0, 80),
            descricao: String(i.descricao ?? "").trim().slice(0, 300),
            preco: typeof i.preco === "number" && i.preco > 0 ? Math.round(i.preco * 100) / 100 : null,
            preco_tipo: i.preco_tipo === "a_partir" ? "a_partir" : "exato",
          })),
      }))
      .filter((c) => c.itens.length > 0);
    if (categorias.length === 0) return NextResponse.json({ error: "Não encontrei itens nesse cardápio. Tente uma foto mais nítida ou cole o texto." }, { status: 422 });
    return NextResponse.json({ categorias, truncated });
  } catch (e) {
    console.error("importar-cardapio", e);
    return NextResponse.json({ error: "A Orbi não conseguiu ler o cardápio agora. Tente de novo em instantes." }, { status: 500 });
  }
}
