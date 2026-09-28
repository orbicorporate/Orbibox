import { NextRequest, NextResponse } from "next/server";
import { askClaudeJSON } from "@/lib/anthropic";
import { AI_MODEL_RAPIDO } from "@/lib/aiModel";
import { createClient } from "@/lib/supabase/server";

/**
 * Busca fotos prontas (banco de imagens) pra um item, em três etapas:
 * 1. A Orbi entende o contexto (negócio, item e o que a pessoa digitou) e
 *    traduz a ideia em cenas fotografáveis, em inglês, que é como os bancos
 *    respondem bem. "Roubo de caminhão" não existe como foto; "caminhão
 *    estacionado à noite", "câmera de segurança em pátio" existem.
 * 2. Busca todas essas cenas no Pexels (fotos profissionais, uso comercial
 *    livre). Sem chave do Pexels, cai no Openverse.
 * 3. A Orbi lê a descrição de cada foto encontrada e fica só com as que
 *    combinam de verdade com o contexto, na ordem de relevância.
 */
export const maxDuration = 40;

export type FotoPronta = { id: string; thumb: string; full: string; autor: string; fonte: string; alt?: string };

type Orientacao = "landscape" | "portrait" | "square";
type Plano = { assunto: string; palavras: string[]; cenas: string[]; sugestoes: string[] };

const semAcento = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function buscaPexels(q: string, orientacao: Orientacao, key: string): Promise<FotoPronta[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=25&orientation=${orientacao}&size=large`;
  const r = await fetch(url, { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const j = (await r.json()) as { photos?: { id: number; url?: string; photographer: string; alt?: string; src: { medium: string; large2x: string } }[] };
  // A descrição (alt) às vezes vem vazia; o endereço da foto no Pexels traz
  // o assunto no nome (ex.: /photo/acai-bowl-with-banana-123/), então junta os dois.
  const slug = (u?: string) => (u ?? "").replace(/^.*\/photo\//, "").replace(/-\d+\/?$/, "").replace(/-/g, " ");
  return (j.photos ?? []).map((p) => ({ id: `px-${p.id}`, thumb: p.src.medium, full: p.src.large2x, autor: p.photographer, fonte: "Pexels", alt: `${p.alt ?? ""} ${slug(p.url)}`.trim() }));
}

// Pixabay: acervo grande (bom em comida e produtos), aceita busca em
// português e permite guardar a foto no nosso armazenamento.
async function buscaPixabay(q: string, orientacao: Orientacao, key: string, lang: "en" | "pt"): Promise<FotoPronta[]> {
  const ori = orientacao === "landscape" ? "horizontal" : orientacao === "portrait" ? "vertical" : "all";
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q.slice(0, 100))}&lang=${lang}&image_type=photo&orientation=${ori}&safesearch=true&min_width=1200&per_page=25&order=popular`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const j = (await r.json()) as { hits?: { id: number; tags?: string; pageURL?: string; user?: string; webformatURL: string; largeImageURL: string }[] };
  const slug = (u?: string) => (u ?? "").replace(/^.*\/photos\//, "").replace(/-\d+\/?$/, "").replace(/-/g, " ");
  return (j.hits ?? []).map((p) => ({
    id: `pb-${p.id}`,
    thumb: p.webformatURL,
    full: p.largeImageURL,
    autor: p.user ?? "",
    fonte: "Pixabay",
    alt: `${p.tags ?? ""} ${slug(p.pageURL)}`.trim(),
  }));
}

// Openverse mistura foto profissional com foto de celular: pede só
// fotografia, tamanho grande e conteúdo seguro, e descarta o que for
// pequeno demais pra virar capa.
async function buscaOpenverse(q: string): Promise<FotoPronta[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=20&license_type=commercial&category=photograph&size=large&mature=false`;
  const r = await fetch(url, { headers: { "User-Agent": "Orbibox/1.0" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: { id: string; url: string; thumbnail?: string; creator?: string; source?: string; title?: string; width?: number; height?: number }[] };
  return (j.results ?? [])
    .filter((p) => (p.width ?? 0) >= 1200 && (p.height ?? 0) >= 800)
    .map((p) => ({ id: `ov-${p.id}`, thumb: p.thumbnail || p.url, full: p.url, autor: p.creator || "", fonte: p.source || "Openverse", alt: p.title ?? "" }));
}

/** Intercala os resultados das buscas (a mais específica primeiro) e tira repetidos. */
function intercalar(listas: FotoPronta[][], max: number): FotoPronta[] {
  const vistos = new Set<string>();
  const out: FotoPronta[] = [];
  for (let i = 0; out.length < max && listas.some((l) => i < l.length); i++) {
    for (const l of listas) {
      const f = l[i];
      if (f && !vistos.has(f.full)) {
        vistos.add(f.full);
        out.push(f);
        if (out.length >= max) break;
      }
    }
  }
  return out;
}

async function planejar(negocio: string, sobre: string, assunto: string, pedido: string): Promise<Plano | null> {
  const { data } = await askClaudeJSON<Plano>({
    model: AI_MODEL_RAPIDO,
    maxTokens: 600,
    system: `Você é diretor de arte e escolhe fotos de banco de imagens (Pexels) para capas de produtos e serviços de pequenos negócios brasileiros.

Bancos de imagem só encontram o que é FOTOGRAFÁVEL: objetos, pessoas, lugares, ações, luz. Conceitos abstratos ("roubo", "proteção", "tranquilidade", "economia") não viram foto sozinhos. Seu trabalho é entender o contexto do negócio e transformar a ideia em cenas concretas que comuniquem aquilo visualmente.

Exemplo: associação de proteção veicular, item "Roubo de caminhão" →
cenas: "semi truck parked at night", "truck on highway at dusk", "security camera parking lot night", "truck driver in cab", "fleet of trucks yard"
sugestões: "Caminhão à noite", "Estrada com caminhão", "Pátio com segurança"

Quando a pessoa DIGITA um pedido, ele manda: o assunto é exatamente o que ela digitou.
- Todas as cenas precisam ter esse assunto visível, com o nome dele na busca. Só varia o jeito de mostrar (ângulo, ambiente, acompanhamentos).
- Exemplo: pedido "açaí" → cenas: "acai bowl", "acai bowl with banana and granola", "acai cup top view", "acai smoothie bowl fruits", "purple acai bowl table". Nunca "blueberries", "dessert" ou "berries" sozinhos: parecido não serve.
- Palavras que já são usadas em inglês (açaí, sushi, pizza, brigadeiro) ficam como estão, sem acento.

Regras:
- assunto: o assunto principal, curto, em inglês (ex.: "acai bowl", "semi truck").
- palavras: 2 a 6 palavras-chave em inglês e português, sem acento e em minúsculas, que uma foto certa teria na descrição (ex.: "acai", "acai bowl", "açai" vira "acai"). Servem pra filtrar.
- cenas: 5 buscas em inglês, 2 a 5 palavras, cada uma uma cena diferente e concreta. A primeira é a mais fiel ao item; as outras variam ângulo, ambiente e emoção, sempre dentro do tema.
- Respeite o setor: se o negócio é de caminhões, não traga carros de passeio; se é comida japonesa, não traga pizza.
- Evite cenas negativas pesadas (acidente com feridos, crime violento); prefira a versão aspiracional ou de segurança.
- Nada de marcas, logos ou nomes próprios.
- sugestões: 3 ideias curtas em português (2 a 4 palavras) de outras cenas que a pessoa pode tocar pra buscar. Se houve pedido, todas mantêm o assunto dele (ex.: pedido "açaí" → "Açaí com granola", "Açaí no copo", "Tigela de açaí vista de cima").`,
    messages: [
      {
        role: "user",
        content: `Negócio: ${negocio}\nSobre o negócio: ${sobre.slice(0, 500) || "(sem descrição)"}\nItem da vitrine: ${assunto || "(sem nome)"}\n${pedido ? `A pessoa pediu: "${pedido}"` : "A pessoa não digitou nada, sugira pelo item."}`,
      },
    ],
    schema: {
      type: "object",
      properties: {
        assunto: { type: "string" },
        palavras: { type: "array", items: { type: "string" }, maxItems: 6 },
        cenas: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
        sugestoes: { type: "array", items: { type: "string" }, maxItems: 3 },
      },
      required: ["assunto", "palavras", "cenas", "sugestoes"],
    },
  });
  if (!data || !Array.isArray(data.cenas) || data.cenas.length === 0) return null;
  return {
    assunto: String(data.assunto ?? "").trim(),
    palavras: (data.palavras ?? []).map((p) => semAcento(String(p)).trim()).filter((p) => p.length >= 3).slice(0, 6),
    cenas: data.cenas.map((c) => String(c).trim()).filter(Boolean).slice(0, 5),
    sugestoes: (data.sugestoes ?? []).map(String).slice(0, 3),
  };
}

/** A Orbi lê a descrição de cada foto e devolve só as que combinam, em ordem. */
async function escolherMelhores(fotos: FotoPronta[], contexto: string, assunto: string, estrito: boolean): Promise<FotoPronta[]> {
  const comAlt = fotos.filter((f) => (f.alt ?? "").trim());
  if (comAlt.length < (estrito ? 1 : 6)) return fotos;
  const lista = comAlt.map((f, i) => `${i}: ${f.alt!.slice(0, 140)}`).join("\n");
  try {
    const { data } = await askClaudeJSON<{ escolhidas: number[] }>({
      model: AI_MODEL_RAPIDO,
      maxTokens: 400,
      system: `Você escolhe fotos para a capa de um item de um pequeno negócio. Recebe o contexto e uma lista numerada com a descrição de cada foto. Devolva os números das fotos que combinam de verdade, da mais adequada para a menos. Descarte as que fogem do tema, do setor ou que ficariam estranhas como capa. Máximo de 27.${
        estrito
          ? " A pessoa pediu um assunto específico: a foto PRECISA mostrar o assunto principal (ex.: açaí). Descarte fotos em que ele não aparece, mesmo parecidas (pediu açaí: mirtilo ou sobremesa qualquer não serve). Detalhes do pedido (no copo, com granola, vista de cima) só servem pra ordenar: fotos do assunto sem esses detalhes continuam valendo, só vêm depois."
          : ""
      }`,
      messages: [{ role: "user", content: `Assunto principal: ${assunto || "-"}\nContexto: ${contexto}\n\nFotos:\n${lista}` }],
      schema: {
        type: "object",
        properties: { escolhidas: { type: "array", items: { type: "integer" } } },
        required: ["escolhidas"],
      },
    });
    const idx = (data?.escolhidas ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n < comAlt.length);
    if (!estrito && idx.length < 3) return fotos;
    const vistos = new Set<number>();
    return idx.filter((n) => (vistos.has(n) ? false : (vistos.add(n), true))).map((n) => comAlt[n]);
  } catch {
    return fotos;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, assunto, busca, formato } = (await req.json()) as {
      businessId?: string;
      assunto?: string;
      busca?: string;
      formato?: string;
    };
    if (!businessId) return NextResponse.json({ error: "Faltou o negócio." }, { status: 400 });

    const supabase = await createClient();
    const { data: biz } = await supabase.from("businesses").select("name, about_business").eq("id", businessId).maybeSingle();
    if (!biz) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });

    const pedido = (busca ?? "").trim();
    const sobre = String(biz.about_business ?? "");

    // Mesmo quando a pessoa digita, passa pela Orbi: ela entende o contexto
    // e transforma a ideia em cenas que o banco de imagens encontra.
    let plano: Plano | null = null;
    try {
      plano = await planejar(biz.name, sobre, assunto ?? "", pedido);
    } catch {
      /* sem IA: busca literal */
    }
    // Com pedido, também busca o assunto puro (ex.: "acai bowl"), que é onde
    // o banco tem mais fotos certas; os detalhes vêm nas outras buscas.
    const cenas = [
      ...(pedido && plano?.assunto ? [plano.assunto] : []),
      ...(plano?.cenas.length ? plano.cenas : [pedido || assunto || biz.name]),
    ].filter((c, i, arr) => arr.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i).slice(0, 6);

    const orientacao: Orientacao = formato === "quadrado" ? "square" : formato === "retrato" ? "portrait" : "landscape";
    // Dois bancos ao mesmo tempo (Pexels e Pixabay), resultados intercalados.
    // O Pixabay ainda recebe o pedido em português, do jeito que foi digitado.
    const kPexels = process.env.PEXELS_API_KEY;
    const kPixabay = process.env.PIXABAY_API_KEY;
    const buscas: Promise<FotoPronta[]>[] = [];
    for (const t of cenas) {
      if (kPexels) buscas.push(buscaPexels(t, orientacao, kPexels).catch(() => []));
      if (kPixabay) buscas.push(buscaPixabay(t, orientacao, kPixabay, "en").catch(() => []));
    }
    if (kPixabay && pedido) buscas.unshift(buscaPixabay(pedido, orientacao, kPixabay, "pt").catch(() => []));
    let listas = await Promise.all(buscas);
    if (listas.every((l) => l.length === 0)) listas = await Promise.all(cenas.map((t) => buscaOpenverse(t).catch(() => [])));
    let candidatas = intercalar(listas, 120);

    // Com pedido digitado, a busca é estrita: primeiro um filtro pelas
    // palavras-chave na descrição da foto, depois a Orbi confere uma a uma.
    const estrito = !!pedido;
    let comPalavra: FotoPronta[] | null = null;
    const palavras = [...(plano?.palavras ?? []), ...(pedido ? [semAcento(pedido)] : [])].filter(Boolean);
    if (estrito && palavras.length) {
      const batem = candidatas.filter((f) => {
        const alt = semAcento(f.alt ?? "");
        return palavras.some((p) => alt.includes(p));
      });
      if (batem.length >= 3) candidatas = batem;
      comPalavra = batem;
    }

    const contexto = `Negócio: ${biz.name} (${sobre.slice(0, 200)}). Item: ${assunto || "-"}. ${pedido ? `Pedido: ${pedido}.` : ""} Cenas buscadas: ${cenas.join("; ")}.`;
    let fotos = await escolherMelhores(candidatas, contexto, plano?.assunto || pedido, estrito);
    // Nunca volta vazio se há fotos com o assunto na descrição: a conferência
    // da Orbi pode ter sido rigorosa demais com os detalhes.
    if (estrito && fotos.length < 6 && comPalavra && comPalavra.length > fotos.length) {
      const ids = new Set(fotos.map((f) => f.id));
      fotos = [...fotos, ...comPalavra.filter((f) => !ids.has(f.id))];
    }
    fotos = fotos.slice(0, 27);

    return NextResponse.json({ busca: pedido, cenas, sugestoes: plano?.sugestoes ?? [], fotos });
  } catch (e) {
    console.error("fotos-prontas", e);
    return NextResponse.json({ error: "Não consegui buscar fotos agora." }, { status: 500 });
  }
}
