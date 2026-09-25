import { askClaude, askClaudeJSON } from "@/lib/anthropic";
import { jsonrepair } from "jsonrepair";

// Leitura de fontes (site ou Instagram) e extração da proposta de vitrine
// pela Orbi. Usado pela importação do onboarding e da Vitrine, e pelo teste
// em lote. Tudo aqui é "sem banco": só lê e interpreta.

export type SiteData = { text: string; images: { id: string; url: string; alt: string; context: string }[]; links: string[]; base: string; html: string };

// Tenta ler o site de todo jeito antes de desistir: o endereço como veio,
// com/sem "www", http, e por fim um leitor que roda o JavaScript da página
// (sites feitos em React/Wix/etc. chegam quase vazios num fetch simples).
export async function fetchSiteResiliente(url: string): Promise<SiteData | null> {
  const limpo = url.trim().replace(/\/+$/, "");
  const semProto = limpo.replace(/^https?:\/\//i, "");
  const host = semProto.split("/")[0];
  const resto = semProto.slice(host.length);
  const hostAlt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const variantes = [`https://${host}${resto}`, `https://${hostAlt}${resto}`, `http://${host}${resto}`];

  let melhor: SiteData | null = null;
  for (const v of variantes) {
    const r = await fetchSite(v);
    if (r && (!melhor || r.text.length > melhor.text.length)) melhor = r;
    if (melhor && melhor.text.length >= 600) return melhor;
  }

  // Página vazia ou bloqueada: usa o leitor que renderiza o JavaScript.
  const lido = await fetchRenderizado(`https://${host}${resto}`);
  if (lido && (!melhor || lido.text.length > melhor.text.length)) {
    // Mantém imagens e links do HTML cru quando existirem (o leitor só
    // devolve texto e as imagens em markdown).
    return { ...lido, images: lido.images.length ? lido.images : melhor?.images ?? [], links: lido.links.length ? lido.links : melhor?.links ?? [] };
  }
  return melhor;
}

async function fetchRenderizado(url: string): Promise<SiteData | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
    });
    if (!res.ok) return null;
    const md = await res.text();
    if (md.trim().length < 50) return null;
    const base = new URL(url).origin;
    const images: SiteData["images"] = [];
    const seen = new Set<string>();
    const imgRe = /!\[([^\]]*)\]\((https?:[^)\s]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(md)) && images.length < 30) {
      const src = m[2];
      if (seen.has(src) || /\.(svg|gif)(\?|$)/i.test(src)) continue;
      seen.add(src);
      const context = md.slice(Math.max(0, m.index - 300), m.index).replace(/[#*_>\[\]()!]/g, " ").replace(/\s+/g, " ").trim().slice(-200);
      images.push({ id: `img${images.length}`, url: src, alt: m[1].slice(0, 120), context });
    }
    const links = new Set<string>();
    const linkRe = /(?<!!)\[([^\]]{2,80})\]\((https?:[^)\s]+)\)/g;
    while ((m = linkRe.exec(md)) && links.size < 60) {
      if (m[2].startsWith(base)) links.add(`${m[1].trim()} :: ${m[2]}`);
    }
    const text = md.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    return { text: text.slice(0, 12000), images, links: [...links], base, html: "" };
  } catch {
    return null;
  }
}

// Busca o HTML do site e limpa deixando texto + imagens (com contexto) visíveis.
async function fetchSite(url: string): Promise<SiteData | null> {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(normalized, {
      signal: AbortSignal.timeout(8000),
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
    // texto ao redor (diz DE QUE PARTE da página ela veio), sem isso, a Orbi
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

    // Links internos, viram destino dos boxes de categoria/produto
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

export type Extracted = {
  title: string;
  description: string;
  price: number | null;
  type: "product" | "service" | "link";
  brand_label: string | null;
  image_hint: string | null;
  target_url: string | null;
  link_kind: "categoria" | "produto" | "externo" | null;
};

export type SiteType = "ecommerce" | "institucional" | "links";

const PROPOSTA_SCHEMA = {
  type: "object",
  properties: {
    site_type: { type: "string", enum: ["ecommerce", "institucional", "links"] },
    motivo: { type: "string" },
    about_business: { type: ["string", "null"] },
    differentials: { type: ["string", "null"] },
    policies: { type: ["string", "null"] },
    contact_whatsapp: { type: ["string", "null"] },
    contact_phone: { type: ["string", "null"] },
    contact_email: { type: ["string", "null"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          price: { type: ["number", "null"] },
          type: { type: "string", enum: ["product", "service", "link"] },
          brand_label: { type: ["string", "null"] },
          image_hint: { type: ["string", "null"] },
          target_url: { type: ["string", "null"] },
          link_kind: { type: ["string", "null"], enum: ["categoria", "produto", "externo", null] },
        },
        required: ["title", "description", "type"],
      },
    },
  },
  required: ["site_type", "motivo", "items"],
};

/** O que a Orbi devolve depois de ler o site: o tipo, o conhecimento e os boxes propostos. */
export type Proposta = {
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


/** A Orbi lê o conteúdo e devolve a proposta (tipo, conhecimento, itens). */
export async function extrairProposta(
  site: SiteData,
  url: string,
  businessName: string,
  fonte: "site" | "instagram" = "site",
): Promise<Proposta | null> {
  const imgList = site.images
    .map((img) => `[${img.id}] alt="${img.alt || "(sem alt)"}" | contexto: "...${img.context || "(sem contexto)"}" | ${img.url}`)
    .join("\n");

  const regrasFonte =
    fonte === "instagram"
      ? `ATENÇÃO, a fonte é o PERFIL DO INSTAGRAM da marca (não um site). Você recebe o nome, a bio, o link da bio e as legendas dos posts mais recentes, cada imagem [imgN] é a foto de um post e o "contexto" é a legenda dele.
- Classifique como "institucional", a menos que a bio ou as legendas deixem claro que é loja online com link de compra (aí "ecommerce").
- Os itens são os PRODUTOS ou SERVIÇOS que aparecem nos posts (cada sabor, prato, serviço, coleção). Agrupe repetidos. De 3 a 10 itens.
- link_kind null e target_url null (os itens ficam dentro do Orbibox).
- image_hint: a foto do post que mostra aquele produto, quando a legenda deixa claro. Pode usar fotos de posts, é o conteúdo da própria marca.
- about_business e differentials a partir da bio e do que as legendas repetem.`
      : `A fonte é o SITE da marca.`;

  const system = `Você é a Orbi, o motor de leitura do Orbibox. Você recebe o conteúdo de uma marca e precisa (a) entender que TIPO de negócio é e (b) propor a melhor estrutura de vitrine.

${regrasFonte}

PASSO 1, classifique em um destes tipos:
- "ecommerce": tem carrinho, checkout, grade de produtos com preço, plataforma de loja (Shopify, Nuvemshop, WooCommerce, VTEX), ou caminhos como /produtos /loja /carrinho.
- "institucional": apresenta serviços ou produtos mas NÃO vende online (sem carrinho). Ex: agências, clínicas, restaurantes, consultorias, franquias.
- "links": página muito magra, quase sem conteúdo próprio, basicamente um cartão de visita ou agregador de links.

PASSO 2, monte os itens conforme o tipo:
- "ecommerce": extraia as CATEGORIAS de produto (não produto a produto). link_kind "categoria" e target_url da página daquela categoria. Máximo 8. Pode incluir até 3 produtos em destaque com link_kind "produto".
- "institucional": extraia os SERVIÇOS ou PRODUTOS oferecidos, com descrição. link_kind null e target_url null, a menos que exista página própria daquele item (aí link_kind "produto" e o target_url dela).
- "links": poucos itens de navegação ("Nosso site", "Sobre", "Contato") com link_kind "externo" e target_url.
- SEMPRE devolva pelo menos 1 item. Se o conteúdo for pouco, monte itens a partir do que der pra entender do negócio (ex: o principal serviço, "Fale com a gente").

PASSO 3, conhecimento do negócio (alimenta a assistente de IA):
- about_business: 2 a 4 frases sobre o que o negócio é e para quem.
- differentials: diferenciais reais citados, frase curta ou lista curta.
- policies: prazos, entrega, frete, trocas, horários, pagamento, só o que estiver no conteúdo. null se não houver.
- contact_whatsapp / contact_phone / contact_email: se aparecerem. Só dígitos no whatsapp/telefone (com DDD).

REGRAS GERAIS:
- target_url deve ser um link REAL da lista de links fornecida. Nunca invente URL.
- price: número em reais quando houver, senão null. Nunca invente preço.
- brand_label: a categoria do item, poucas e repetidas entre itens semelhantes.
- description: 1 frase curta, no máximo 140 caracteres.
- Textos curtos em todos os campos. Nada de listas enormes.

REGRA DE IMAGEM:
Cada imagem vem com [imgN], o "alt" e o contexto em volta. Use isso pra decidir, não o nome do arquivo.
- Só escolha image_hint quando o alt OU o contexto deixam CLARO que aquela imagem é uma FOTO DESSE item específico.
- NUNCA escolha logo de marca/parceiro/fornecedor, bandeira de cartão, selo, ícone decorativo, foto de equipe, banner genérico de topo ou imagem de compartilhamento social.
- Se o alt ou contexto mencionam uma marca DIFERENTE de "${businessName}", é quase certo que é logo de parceiro, não use.
- Na dúvida, null. Item sem foto fica melhor do que com a foto errada.
- Cada imagem só pode ser usada em UM item.

Entregue a resposta chamando a ferramenta salvar_proposta.`;

  const userMsg = `${fonte === "instagram" ? "Instagram" : "Site"}: ${url}
Negócio: ${businessName}

IMAGENS DISPONÍVEIS:
${imgList || "(nenhuma)"}

LINKS:
${site.links.join("\n") || "(nenhum)"}

TEXTO:
${site.text}`;

  // 1ª tentativa: resposta estruturada (não vem JSON quebrado).
  try {
    const r = await askClaudeJSON<Proposta>({
      system,
      messages: [{ role: "user", content: userMsg }],
      schema: PROPOSTA_SCHEMA,
      toolName: "salvar_proposta",
      maxTokens: 6000,
    });
    if (r.data && Array.isArray(r.data.items) && r.data.items.length > 0) return r.data;
    if (r.truncated) console.warn("siteImport: resposta estruturada cortada");
  } catch (e) {
    console.error("siteImport: falha na resposta estruturada", e);
  }

  // 2ª tentativa: modo texto, consertando o JSON se vier torto.
  try {
    const raw = await askClaude({
      system: system.replace("Entregue a resposta chamando a ferramenta salvar_proposta.", "Responda SOMENTE com o JSON, sem texto antes ou depois."),
      messages: [{ role: "user", content: userMsg }],
      maxTokens: 6000,
    });
    const ini = raw.indexOf("{");
    const p = JSON.parse(jsonrepair(ini >= 0 ? raw.slice(ini) : raw)) as Proposta;
    if (p && Array.isArray(p.items)) return p;
  } catch (e) {
    console.error("siteImport: falha também no modo texto", e);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Instagram
// ---------------------------------------------------------------------------

/** Tira o @ ou a URL e devolve só o usuário do Instagram. */
export function instagramHandle(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  const m = t.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const h = (m ? m[1] : t.replace(/^@/, "")).replace(/\/+$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h.toLowerCase() : null;
}

type IgPost = { caption: string; image: string; likes: number; comments: number; takenAt: number };
export type InstagramData = SiteData & { externalUrl: string | null; fullName: string; bio: string; posts: IgPost[] };

/**
 * Lê o perfil público do Instagram (bio, link da bio e os posts recentes).
 * Usa o mesmo endpoint que a página pública do Instagram usa. Pode falhar
 * (perfil privado, limite do Instagram), então é sempre plano B.
 */
export async function fetchInstagram(handleOrUrl: string): Promise<InstagramData | null> {
  const handle = instagramHandle(handleOrUrl);
  if (!handle) return null;

  type IgUser = {
    full_name?: string;
    biography?: string;
    external_url?: string | null;
    is_private?: boolean;
    edge_owner_to_timeline_media?: {
      edges?: {
        node?: {
          display_url?: string;
          taken_at_timestamp?: number;
          edge_liked_by?: { count?: number };
          edge_media_to_comment?: { count?: number };
          edge_media_to_caption?: { edges?: { node?: { text?: string } }[] };
        };
      }[];
    };
  };

  let user: IgUser | null = null;
  try {
    const res = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${handle}`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "x-ig-app-id": "936619743392459",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "*/*",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (res.ok) {
      const j = await res.json();
      user = j?.data?.user ?? null;
    }
  } catch {
    user = null;
  }

  // Plano C: leitor que abre a página como navegador.
  if (!user) {
    const lido = await fetchRenderizado(`https://www.instagram.com/${handle}/`);
    if (!lido || lido.text.length < 80) return null;
    return { ...lido, externalUrl: null, fullName: handle, bio: "", posts: [] };
  }
  if (user.is_private) return null;

  const posts: IgPost[] = (user.edge_owner_to_timeline_media?.edges ?? [])
    .map((e) => e.node)
    .filter((n): n is NonNullable<typeof n> => !!n?.display_url)
    .slice(0, 12)
    .map((n) => ({
      caption: n.edge_media_to_caption?.edges?.[0]?.node?.text ?? "",
      image: n.display_url!,
      likes: n.edge_liked_by?.count ?? 0,
      comments: n.edge_media_to_comment?.count ?? 0,
      takenAt: n.taken_at_timestamp ?? 0,
    }));

  const fullName = user.full_name || handle;
  const bio = user.biography || "";
  const externalUrl = user.external_url || null;
  const text = [
    `Nome: ${fullName}`,
    `Bio: ${bio}`,
    externalUrl ? `Link da bio: ${externalUrl}` : "",
    "Posts recentes:",
    ...posts.map((p, i) => `(${i + 1}) ${p.caption.replace(/\s+/g, " ").slice(0, 400)} [${p.likes} curtidas, ${p.comments} comentários]`),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    text: text.slice(0, 12000),
    images: posts.map((p, i) => ({ id: `img${i}`, url: p.image, alt: `post ${i + 1}`, context: p.caption.replace(/\s+/g, " ").slice(0, 200) })),
    links: externalUrl ? [`Link da bio :: ${externalUrl}`] : [],
    base: `https://www.instagram.com/${handle}/`,
    html: "",
    externalUrl,
    fullName,
    bio,
    posts,
  };
}

/** Links da bio que são agregadores (não são o site da marca). */
export function ehAgregadorDeLinks(url: string): boolean {
  return /(linktr\.ee|linktree|beacons\.ai|bio\.link|lnk\.bio|taplink|linkin\.bio|campsite\.bio|wa\.me|whatsapp\.com|api\.whatsapp)/i.test(url);
}

// ---------------------------------------------------------------------------
// Escolha da melhor fonte
// ---------------------------------------------------------------------------

export type FonteLida = { data: SiteData; fonte: "site" | "instagram"; url: string; tentativas: string[] };

/**
 * Decide de onde a Orbi aprende: site primeiro; se não houver site (ou ele
 * vier vazio/bloqueado), o Instagram; e se o Instagram tiver um site no link
 * da bio, tenta esse site também. Devolve null só quando nada deu pra ler.
 */
export async function lerMelhorFonte({ site, instagram }: { site?: string | null; instagram?: string | null }): Promise<FonteLida | null> {
  const tentativas: string[] = [];
  const BOM = 400; // texto mínimo pra considerar a leitura boa

  let lidoSite: SiteData | null = null;
  let urlSite = site?.trim() || "";
  if (urlSite && !/instagram\.com/i.test(urlSite)) {
    lidoSite = await fetchSiteResiliente(urlSite);
    tentativas.push(`site ${urlSite}: ${lidoSite ? `${lidoSite.text.length} caracteres` : "falhou"}`);
    if (lidoSite && lidoSite.text.length >= BOM) return { data: lidoSite, fonte: "site", url: urlSite, tentativas };
  }
  // Se a pessoa colou o link do Instagram no campo de site, usa como Instagram.
  const ig = instagram?.trim() || (/instagram\.com/i.test(urlSite) ? urlSite : "");

  let lidoIg: InstagramData | null = null;
  if (ig) {
    lidoIg = await fetchInstagram(ig);
    tentativas.push(`instagram ${ig}: ${lidoIg ? `${lidoIg.text.length} caracteres, ${lidoIg.posts.length} posts` : "falhou"}`);

    // Sem site informado, mas o Instagram aponta pra um: tenta ele.
    if (!lidoSite && lidoIg?.externalUrl && !ehAgregadorDeLinks(lidoIg.externalUrl)) {
      urlSite = lidoIg.externalUrl;
      lidoSite = await fetchSiteResiliente(urlSite);
      tentativas.push(`site da bio ${urlSite}: ${lidoSite ? `${lidoSite.text.length} caracteres` : "falhou"}`);
      if (lidoSite && lidoSite.text.length >= BOM) {
        // Soma o que o Instagram diz ao texto do site, ajuda no tom e nos destaques.
        lidoSite = { ...lidoSite, text: `${lidoSite.text}\n\nINSTAGRAM DA MARCA:\n${lidoIg.text}`.slice(0, 14000) };
        return { data: lidoSite, fonte: "site", url: urlSite, tentativas };
      }
    }
    if (lidoIg && lidoIg.text.length >= 80) {
      // Site fraco + Instagram: junta os dois textos.
      if (lidoSite && lidoSite.text.length > 0) {
        return {
          data: { ...lidoIg, text: `${lidoIg.text}\n\nSITE:\n${lidoSite.text}`.slice(0, 14000), links: [...lidoIg.links, ...lidoSite.links] },
          fonte: "instagram",
          url: `https://www.instagram.com/${instagramHandle(ig)}/`,
          tentativas,
        };
      }
      return { data: lidoIg, fonte: "instagram", url: `https://www.instagram.com/${instagramHandle(ig)}/`, tentativas };
    }
  }

  // Só sobrou um site fraco: ainda assim usa, a Orbi faz o que der.
  if (lidoSite && lidoSite.text.length >= 80) return { data: lidoSite, fonte: "site", url: urlSite, tentativas };
  return null;
}
