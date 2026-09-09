import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// Busca o HTML do site e limpa deixando texto + imagens (com contexto) visíveis.
async function fetchSite(url: string): Promise<{ text: string; images: { id: string; url: string; alt: string; context: string }[]; links: string[]; base: string; html: string } | null> {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(normalized, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const base = new URL(normalized).origin;

    // Coleta imagens com contexto: alt (diz o que É a imagem) e um pedaço de
    // texto ao redor (diz DE QUE PARTE da página ela veio) — sem isso, a Orbi
    // só vê uma URL solta e não tem como saber se é o produto, uma logo de
    // parceiro, um ícone decorativo, etc.
    const images: { id: string; url: string; alt: string; context: string }[] = [];
    const seen = new Set<string>();
    // Regex mais permissivo: pega o <img ...> inteiro pra extrair src/data-src E alt do mesmo bloco.
    const imgTagRegex = /<img\b[^>]*>/gi;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = imgTagRegex.exec(html)) && images.length < 30) {
      const tag = tagMatch[0];
      const srcMatch = tag.match(/(?:data-src|src)=["']([^"']+)["']/i);
      if (!srcMatch) continue;
      let src = srcMatch[1];
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = base + src;
      if (!src.startsWith("http") || /\.(svg|gif)(\?|$)/i.test(src)) continue;
      if (seen.has(src)) continue;
      seen.add(src);

      const altMatch = tag.match(/alt=["']([^"']*)["']/i);
      const alt = (altMatch?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 120);

      // ~200 caracteres de texto puro antes da tag, pra saber em qual seção
      // da página (qual produto/serviço) essa imagem está encaixada.
      const before = html.slice(Math.max(0, tagMatch.index - 600), tagMatch.index);
      const context = before
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(-200);

      images.push({ id: `img${images.length}`, url: src, alt, context });
    }
    // og:image entra por último, sem contexto de posição (é imagem de
    // compartilhamento da página inteira, não de um item específico).
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch && images.length < 30 && !seen.has(ogMatch[1])) {
      images.push({ id: `img${images.length}`, url: ogMatch[1], alt: "(imagem de compartilhamento da página, não de um item específico)", context: "" });
    }

    // Links internos — viram destino dos boxes de categoria/produto
    const links = new Set<string>();
    const linkRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,80}?)<\/a>/gi;
    let lm: RegExpExecArray | null;
    while ((lm = linkRegex.exec(html)) && links.size < 60) {
      let href = lm[1];
      if (href.startsWith("/")) href = base + href;
      if (!href.startsWith("http") || !href.startsWith(base)) continue;
      const label = lm[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (label && label.length > 1) links.add(`${label} :: ${href}`);
    }

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return { text: text.slice(0, 12000), images, links: [...links], base, html: html.slice(0, 4000) };
  } catch {
    return null;
  }
}

type Extracted = {
  title: string;
  description: string;
  price: number | null;
  type: "product" | "service" | "link";
  brand_label: string | null;
  image_hint: string | null;
  target_url: string | null;
  link_kind: "categoria" | "produto" | "externo" | null;
};

type SiteType = "ecommerce" | "institucional" | "links";

/** O que a Orbi devolve depois de ler o site: o tipo, o conhecimento e os boxes propostos. */
type Proposta = {
  site_type: SiteType;
  motivo: string;
  about_business: string | null;
  differentials: string | null;
  policies: string | null;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  items: Extracted[];
};

export async function POST(req: NextRequest) {
  try {
    const { businessId, url } = await req.json();
    if (!businessId || !url) {
      return NextResponse.json({ error: "businessId e url são obrigatórios." }, { status: 400 });
    }

    const supabase = await createClient();

    // Confirma que o negócio é do usuário logado (segurança).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, owner_id, brand_colors")
      .eq("id", businessId)
      .maybeSingle();
    if (!business || business.owner_id !== user.id) {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }

    const site = await fetchSite(url);
    if (!site) {
      return NextResponse.json({ error: "Não consegui acessar esse site. Verifique o link." }, { status: 422 });
    }

    const imgList = site.images
      .map((img) => `[${img.id}] alt="${img.alt || "(sem alt)"}" | contexto antes da imagem: "...${img.context || "(sem contexto)"}" | ${img.url}`)
      .join("\n");

    const system = `Você é a Orbi, o motor de leitura de sites do Orbibox. Você recebe o conteúdo de um site e precisa (a) entender que TIPO de negócio é e (b) propor a melhor estrutura de vitrine.

PASSO 1 — Classifique o site em um destes tipos:
- "ecommerce": tem carrinho, checkout, grade de produtos com preço, plataforma de loja (Shopify, Nuvemshop, WooCommerce, VTEX), ou caminhos como /produtos /loja /carrinho.
- "institucional": apresenta serviços ou produtos mas NÃO vende online (sem carrinho). Ex: agências, clínicas, restaurantes, consultorias.
- "links": página muito magra, quase sem conteúdo próprio, basicamente um cartão de visita ou agregador de links.

PASSO 2 — Monte os itens conforme o tipo:
- Se "ecommerce": extraia as CATEGORIAS de produto (não produto a produto). Cada item recebe link_kind "categoria" e target_url apontando para a página daquela categoria no site. Máximo 8. Se houver produtos em destaque muito claros, pode incluir até 3 com link_kind "produto" e target_url da página do produto.
- Se "institucional": extraia os SERVIÇOS ou PRODUTOS oferecidos, com descrição. link_kind null e target_url null (ficam dentro do Orbibox), a menos que exista página própria daquele serviço — aí link_kind "produto" e o target_url dela.
- Se "links": monte poucos itens de navegação (ex: "Nosso site", "Sobre", "Contato") com link_kind "externo" e target_url.

PASSO 3 — Extraia o conhecimento do negócio (alimenta a assistente de IA):
- about_business: 2 a 4 frases sobre o que o negócio é e para quem.
- differentials: os diferenciais reais citados no site, em uma frase ou lista curta.
- policies: prazos, entrega, frete, trocas, horários, formas de pagamento — só o que estiver no site. null se não houver.
- contact_whatsapp / contact_phone / contact_email: se aparecerem no site. Só dígitos no whatsapp/telefone (com DDD).

REGRAS GERAIS:
- target_url deve ser um link REAL da lista de links fornecida. Nunca invente URL.
- price: número em reais quando houver no site, senão null. Nunca invente preço.
- brand_label: a categoria do item, poucas e repetidas entre itens semelhantes.
- description: 1 frase curta baseada no site.

REGRA DE IMAGEM (a mais importante — leia com atenção):
Cada imagem candidata vem com [imgN], o "alt" (o que ela É, quando o site informou) e o texto que aparecia logo ANTES dela na página (em que seção/produto ela estava encaixada). Use isso pra decidir, não o nome do arquivo.
- Só escolha image_hint quando o alt OU o contexto deixam CLARO que aquela imagem é uma FOTO DESSE item específico (do produto, do prato, do ambiente do serviço).
- NUNCA escolha uma imagem que seja: logo de marca/parceiro/fornecedor (ex: "Harley-Davidson", "Visa", "Mastercard", bandeiras de cartão, selos de certificação), ícone decorativo, foto de equipe/fundador, banner genérico de topo de página, ou imagem de compartilhamento social (og:image) que não seja do item em si.
- Se o alt ou contexto mencionam uma marca/empresa DIFERENTE do negócio "${business.name}" sendo importado, é quase certo que é logo de parceiro — não use.
- Na dúvida, ou se não achar nada com sinal forte o suficiente, use null. Um item sem foto (fundo colorido, nome em destaque) fica com aparência muito melhor e mais profissional do que um item com a foto errada. Prefira sempre null a arriscar.
- Cada imagem só pode ser usada em UM item — não repita a mesma imagem pra itens diferentes.

Responda SOMENTE JSON válido:
{"site_type":"ecommerce","motivo":"uma frase explicando como você reconheceu","about_business":"","differentials":"","policies":null,"contact_whatsapp":null,"contact_phone":null,"contact_email":null,"items":[{"title":"","description":"","price":null,"type":"product","brand_label":null,"image_hint":"img0","target_url":null,"link_kind":"categoria"}]}`;

    const linkList = site.links.join("\n");
    const userMsg = `Site: ${url}
Negócio: ${business.name}

IMAGENS DISPONÍVEIS:
${imgList || "(nenhuma)"}

LINKS INTERNOS DO SITE:
${linkList || "(nenhum)"}

TEXTO DO SITE:
${site.text}`;

    const raw = await askClaude({ system, messages: [{ role: "user", content: userMsg }], maxTokens: 3500 });

    let proposta: Proposta | null = null;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      proposta = JSON.parse(match ? match[0] : raw) as Proposta;
    } catch (e) {
      console.error("import-site: falha ao parsear extração", e, raw.slice(0, 300));
      return NextResponse.json({ error: "Não consegui interpretar o conteúdo do site." }, { status: 422 });
    }

    const tiposValidos: SiteType[] = ["ecommerce", "institucional", "links"];
    const siteType: SiteType = tiposValidos.includes(proposta.site_type) ? proposta.site_type : "institucional";
    const items: Extracted[] = Array.isArray(proposta.items) ? proposta.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "Não encontrei produtos ou serviços nesse site.", imported: 0 });
    }

    // Resolve o image_hint (img0/img1...) para a URL real, ou gera fallback genérico.
    function resolveImage(it: Extracted): { url: string | null; placeholder: boolean } {
      const hint = it.image_hint;
      if (hint) {
        const found = site!.images.find((img) => img.id === hint);
        if (found) return { url: found.url, placeholder: false };
      }
      // Sem foto no site (ou a Orbi preferiu não arriscar): o box fica em
      // cor sólida, como combinado. Não inventamos imagem de banco de
      // imagens — o dono coloca a dele se/quando quiser.
      return { url: null, placeholder: false };
    }

    // Descobre a posição inicial (append ao que já existe).
    const { count } = await supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    const startPos = count ?? 0;

    // Paleta pra vestir os cards que vierem SEM foto — assim a vitrine
    // importada já nasce colorida e bonita, em vez de um monte de quadrado
    // cinza. Usa as cores do DNA da marca (definidas pela Orbi); se não houver,
    // cai numa curadoria fixa de tons suaves. As cores entram intercaladas.
    function brandSwatches(): string[] {
      const raw = business!.brand_colors;
      const hexes: string[] = Array.isArray(raw)
        ? (raw as { hex?: string }[]).map((c) => c?.hex).filter((h): h is string => typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h))
        : [];
      if (hexes.length >= 2) return hexes;
      // Curadoria fixa (chaves de BOX_COLORS) — mistura de tons vivos e
      // pastéis pra vitrine importada já sair colorida e com bom contraste.
      return ["prim-azul", "bril-lima", "pastel-lavanda", "prim-verde", "energy-amarelo", "bril-pink", "pastel-ceu", "prim-roxo"];
    }
    const swatches = brandSwatches();

    const RHYTHM = ["destaque", "medio", "medio", "largo", "medio", "medio"];
    let semFotoIdx = 0;
    const usedImages = new Set<string>();
    const picked = items.slice(0, 12);
    const rows = picked.map((it, i) => {
      const img = resolveImage(it);
      // Trava de segurança: se por algum motivo a Orbi repetiu a mesma
      // imagem em dois itens, só o primeiro fica com ela — o resto vira cor.
      if (img.url) {
        if (usedImages.has(img.url)) img.url = null;
        else usedImages.add(img.url);
      }
      // Sem foto: veste com uma cor da paleta, alternando pra não repetir
      // duas iguais em seguida. Com foto: fica neutro, recortada (sem "moldura").
      const cor = img.url ? "neutro" : swatches[semFotoIdx++ % swatches.length];
      return {
        business_id: businessId,
        type: it.type === "service" || it.type === "link" ? it.type : "product",
        title: it.title?.slice(0, 200) || "Item sem título",
        description: it.description?.slice(0, 500) ?? null,
        price: typeof it.price === "number" ? it.price : null,
        brand_label: it.brand_label?.slice(0, 80) ?? null,
        image_url: img.url,
        image_is_placeholder: img.placeholder,
        // Destino do clique: categoria/produto vão para o site do dono.
        target_url: typeof it.target_url === "string" && it.target_url.startsWith("http") ? it.target_url : null,
        link_kind: ["categoria", "produto", "externo"].includes(it.link_kind ?? "") ? it.link_kind : null,
        // Ritmo visual: o primeiro vira destaque, os demais alternam.
        layout_size: RHYTHM[i % RHYTHM.length],
        box_style: img.url ? "foto" : "cor",
        box_color: cor,
        source_url: url,
        status: "published" as const,
        ai_optimized: true,
        position: startPos + i,
      };
    });

    const { data: inserted, error: insErr } = await supabase
      .from("content_items")
      .insert(rows)
      .select("id");
    if (insErr) {
      console.error("import-site: erro ao inserir", insErr);
      return NextResponse.json({ error: "Erro ao salvar os itens." }, { status: 500 });
    }

    // Guarda o que a Orbi entendeu: tipo do site, conhecimento e contatos.
    // Só preenche contato que ainda estiver vazio — não sobrescreve o que o dono digitou.
    const { data: atual } = await supabase
      .from("businesses")
      .select("contact_whatsapp, contact_phone, contact_email")
      .eq("id", businessId)
      .maybeSingle();

    await supabase
      .from("businesses")
      .update({
        last_import_url: url,
        last_import_at: new Date().toISOString(),
        site_type: siteType,
        contact_site: url,
        about_business: proposta.about_business ?? null,
        differentials: proposta.differentials ?? null,
        policies: proposta.policies ?? null,
        contact_whatsapp: atual?.contact_whatsapp ?? proposta.contact_whatsapp ?? null,
        contact_phone: atual?.contact_phone ?? proposta.contact_phone ?? null,
        contact_email: atual?.contact_email ?? proposta.contact_email ?? null,
      })
      .eq("id", businessId);

    return NextResponse.json({
      imported: inserted?.length ?? 0,
      ids: inserted?.map((r) => r.id) ?? [],
      siteType,
      motivo: proposta.motivo ?? null,
      semFoto: rows.filter((r) => !r.image_url).length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha na importação." }, { status: 500 });
  }
}
