import { NextRequest, NextResponse } from "next/server";
import { askClaude } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// Busca o HTML do site e limpa deixando texto + urls de imagem visíveis.
async function fetchSite(url: string): Promise<{ text: string; images: string[]; links: string[]; base: string; html: string } | null> {
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

    // Coleta URLs de imagem (src e data-src, incluindo og:image)
    const imgs = new Set<string>();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch) imgs.add(ogMatch[1]);
    const imgRegex = /<img[^>]+(?:data-src|src)=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRegex.exec(html)) && imgs.size < 40) {
      let src = m[1];
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = base + src;
      if (src.startsWith("http") && !src.match(/\.(svg|gif)(\?|$)/i)) imgs.add(src);
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

    return { text: text.slice(0, 12000), images: [...imgs], links: [...links], base, html: html.slice(0, 4000) };
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
      .select("id, name, owner_id")
      .eq("id", businessId)
      .maybeSingle();
    if (!business || business.owner_id !== user.id) {
      return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
    }

    const site = await fetchSite(url);
    if (!site) {
      return NextResponse.json({ error: "Não consegui acessar esse site. Verifique o link." }, { status: 422 });
    }

    const imgList = site.images.map((u, i) => `[img${i}] ${u}`).join("\n");

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
- image_hint: escolha a imagem mais provável da lista pelo id [imgN]. Se nenhuma servir, use null — NÃO invente imagem.
- price: número em reais quando houver no site, senão null. Nunca invente preço.
- brand_label: a categoria do item, poucas e repetidas entre itens semelhantes.
- description: 1 frase curta baseada no site.

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
        const idx = Number(hint.replace("img", ""));
        if (Number.isFinite(idx) && site!.images[idx]) {
          return { url: site!.images[idx], placeholder: false };
        }
      }
      // Sem foto no site: o box fica em branco com cor neutra, como combinado.
      // Não inventamos imagem de banco de imagens — o dono coloca a dele.
      return { url: null, placeholder: false };
    }

    // Descobre a posição inicial (append ao que já existe).
    const { count } = await supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    const startPos = count ?? 0;

    const RHYTHM = ["destaque", "medio", "medio", "largo", "medio", "medio"];
    const rows = items.slice(0, 12).map((it, i) => {
      const img = resolveImage(it);
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
        // Sem foto do site, o box nasce em cor neutra (não inventamos imagem).
        box_style: img.url ? "foto" : "cor",
        box_color: "neutro",
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
