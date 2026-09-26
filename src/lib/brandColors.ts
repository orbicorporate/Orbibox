import sharp from "sharp";

/**
 * Mede as cores da MARCA direto do site, olhando só para as peças de
 * identidade: logotipo, header/menu, rodapé, botões e as variáveis de cor
 * do tema. Fotos e imagens genéricas do conteúdo são ignoradas de propósito,
 * porque elas puxam a paleta para as cores da foto (céu, comida, pessoas) e
 * não para as cores da marca.
 *
 * Só roda no servidor (usa `sharp` para ler a logo).
 */

export type BrandColor = { hex: string; role: string };
export type BrandColorResult = {
  colors: BrandColor[];
  /** Linhas legíveis do tipo "#E03131 (logo, botões)", úteis para a Orbi e para debug. */
  evidencia: string[];
  confianca: "alta" | "media" | "baixa";
};

type Fonte = "logo" | "botao" | "header" | "rodape" | "tema" | "icone" | "link" | "corpo";

const ROTULO: Record<Fonte, string> = {
  logo: "logo",
  botao: "botões",
  header: "header",
  rodape: "rodapé",
  tema: "cores do tema",
  icone: "ícone do site",
  link: "links",
  corpo: "fundo/texto",
};

type RGB = [number, number, number];
type Amostra = { rgb: RGB; peso: number; fonte: Fonte };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Cor: parse e utilidades
// ---------------------------------------------------------------------------

function hexToRgb(h: string): RGB | null {
  let x = h.replace("#", "").trim();
  if (x.length === 3 || x.length === 4) x = x.slice(0, 3).split("").map((c) => c + c).join("");
  else if (x.length === 8) x = x.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(x)) return null;
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

const COLOR_RE =
  /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)|hsla?\(\s*[\d.]+(?:deg)?\s*[, ]\s*[\d.]+%\s*[, ]\s*[\d.]+%(?:\s*[,/]\s*[\d.]+%?)?\s*\)/gi;

/** Todas as cores que aparecem num valor CSS (ignora as quase transparentes). */
function coresDoValor(valor: string): RGB[] {
  const out: RGB[] = [];
  for (const m of valor.matchAll(COLOR_RE)) {
    const t = m[0].toLowerCase();
    if (t.startsWith("#")) {
      const hex = t.slice(1);
      if ((hex.length === 4 && parseInt(hex[3], 16) < 8) || (hex.length === 8 && parseInt(hex.slice(6), 16) < 128)) continue;
      const rgb = hexToRgb(t);
      if (rgb) out.push(rgb);
      continue;
    }
    const nums = t.match(/[\d.]+%?/g) ?? [];
    const alpha = nums[3] ? (nums[3].endsWith("%") ? parseFloat(nums[3]) / 100 : parseFloat(nums[3])) : 1;
    if (alpha < 0.5) continue;
    if (t.startsWith("rgb")) {
      const v = nums.slice(0, 3).map((n) => (n.endsWith("%") ? (parseFloat(n) * 255) / 100 : parseFloat(n)));
      if (v.every((n) => n >= 0 && n <= 255)) out.push(v.map(Math.round) as RGB);
    } else {
      out.push(hslToRgb(parseFloat(nums[0] ?? "0"), parseFloat(nums[1] ?? "0") / 100, parseFloat(nums[2] ?? "0") / 100));
    }
  }
  // Temas (ex.: Shopify) guardam a cor como "18, 52, 86" dentro de uma variável.
  if (out.length === 0) {
    const trio = valor.trim().match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
    if (trio) {
      const v = trio.slice(1).map(Number);
      if (v.every((n) => n <= 255)) out.push(v as RGB);
    }
  }
  return out;
}

function toHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function hsl([r, g, b]: RGB): { s: number; l: number } {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { s, l };
}

/** Cor "de verdade" (tem saturação e não é quase preto/branco). */
function ehCromatica(rgb: RGB): boolean {
  const { s, l } = hsl(rgb);
  return s >= 0.2 && l > 0.1 && l < 0.93;
}

function distancia(a: RGB, b: RGB): number {
  // Distância RGB ponderada pela percepção (aprox. "redmean").
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

// ---------------------------------------------------------------------------
// Leitura do site
// ---------------------------------------------------------------------------

async function buscarTexto(url: string, ms: number, limite = 1_500_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(ms),
      headers: { "User-Agent": UA, Accept: "text/html,text/css,*/*;q=0.8", "Accept-Language": "pt-BR,pt;q=0.9" },
    });
    if (!res.ok) return null;
    const t = await res.text();
    return t.slice(0, limite);
  } catch {
    return null;
  }
}

async function buscarHtml(url: string): Promise<{ html: string; base: string } | null> {
  const limpo = url.trim().replace(/\/+$/, "");
  const semProto = limpo.replace(/^https?:\/\//i, "");
  const host = semProto.split("/")[0];
  const resto = semProto.slice(host.length);
  const hostAlt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  for (const v of [`https://${host}${resto}`, `https://${hostAlt}${resto}`, `http://${host}${resto}`]) {
    const html = await buscarTexto(v, 8000);
    if (html && html.length > 200) return { html, base: v };
  }
  return null;
}

function absoluta(src: string, base: string): string | null {
  try {
    const u = new URL(src.replace(/&amp;/g, "&"), base);
    return u.protocol.startsWith("http") ? u.href : null;
  } catch {
    return null;
  }
}

function attr(tag: string, nome: string): string {
  return tag.match(new RegExp(`\\b${nome}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ?? "";
}

// ---------------------------------------------------------------------------
// CSS: regras de header, rodapé, botões, logo e variáveis do tema
// ---------------------------------------------------------------------------

const SEL_BOTAO = /(^|[\s.#\-_>+~,])(btn|button|botao|cta|wp-block-button|elementor-button|shopify-payment-button)|\bbutton\b|type=["']?submit/;
const SEL_HEADER = /header|navbar|\bnav\b|topbar|top-bar|masthead|announcement|site-nav|main-menu|\bmenu\b/;
const SEL_RODAPE = /footer|rodape|rodapé/;
const SEL_LOGO = /logo|site-title|site-branding|\bbrand\b|navbar-brand/;

// Variáveis de cor que costumam ser a identidade do tema.
const VAR_MARCA = /(primary|primaria|primária|brand|marca|accent|destaque|secondary|secundaria|theme|button|btn|cta|highlight|main|e-global-color|color-base-accent|color-button|header|footer|link)/;
// Paletas "de fábrica" (WordPress, Bootstrap) não são a marca do cliente.
const VAR_IGNORAR = /^--(wp--preset|bs-(blue|indigo|purple|pink|red|orange|yellow|green|teal|cyan|gray|white|black|dark|light|info|warning|danger|success)|tw-)/;

function lerCss(css: string, add: (valor: string, fonte: Fonte, peso: number) => void) {
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const m of limpo.matchAll(/([^{}]{1,600})\{([^{}]*)\}/g)) {
    const seletor = m[1].trim().toLowerCase();
    if (seletor.startsWith("@")) continue;
    const corpo = m[2];
    const hover = /:hover|:focus|:active/.test(seletor) ? 0.5 : 1;

    const declaracoes = corpo.split(";").map((d) => {
      const i = d.indexOf(":");
      return i < 0 ? null : { prop: d.slice(0, i).trim().toLowerCase(), valor: d.slice(i + 1).trim() };
    }).filter((d): d is { prop: string; valor: string } => !!d && !!d.valor);

    // Variáveis do tema (:root, html, body, ou qualquer lugar com nome de marca).
    for (const { prop, valor } of declaracoes) {
      if (!prop.startsWith("--")) continue;
      if (VAR_IGNORAR.test(prop) || !VAR_MARCA.test(prop)) continue;
      const forte = /primary|primaria|brand|marca|accent|e-global-color-(primary|accent|secondary)|button|btn|cta/.test(prop);
      add(valor, "tema", forte ? 5 : 2.5);
    }

    let fonte: Fonte | null = null;
    if (SEL_LOGO.test(seletor)) fonte = "logo";
    else if (SEL_BOTAO.test(seletor)) fonte = "botao";
    else if (SEL_RODAPE.test(seletor)) fonte = "rodape";
    else if (SEL_HEADER.test(seletor)) fonte = "header";
    else if (/^(html|body)$/.test(seletor)) fonte = "corpo";
    else if (/^a(:hover|:focus)?$/.test(seletor)) fonte = "link";
    if (!fonte) continue;

    for (const { prop, valor } of declaracoes) {
      if (valor.includes("var(") && coresDoValor(valor).length === 0) continue;
      const ehFundo = prop === "background" || prop === "background-color" || prop === "background-image";
      const ehTexto = prop === "color" || prop === "fill";
      const ehBorda = prop.startsWith("border") && (prop.endsWith("color") || prop === "border" || prop === "border-bottom" || prop === "border-top");
      if (!ehFundo && !ehTexto && !ehBorda) continue;

      let peso = 0;
      if (fonte === "botao") peso = ehFundo ? 5 : ehBorda ? 3 : 0.8; // texto de botão costuma ser branco
      else if (fonte === "logo") peso = ehTexto || ehFundo ? 5 : 2;
      else if (fonte === "header" || fonte === "rodape") peso = ehFundo ? 4 : ehBorda ? 1.5 : 1.5;
      else if (fonte === "link") peso = ehTexto ? 1.5 : 0;
      else if (fonte === "corpo") peso = ehFundo ? 1.5 : 1;
      if (peso > 0) add(valor, fonte, peso * hover);
    }
  }
}

/** Estilos inline e classes utilitárias (ex.: Tailwind bg-[#123456]) nas peças de marca. */
function lerHtmlInline(html: string, add: (valor: string, fonte: Fonte, peso: number) => void) {
  for (const m of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const nome = m[1].toLowerCase();
    const atributos = m[2];
    const classe = (attr(atributos, "class") + " " + attr(atributos, "id")).toLowerCase();
    let fonte: Fonte | null = null;
    if (SEL_LOGO.test(classe)) fonte = "logo";
    else if (nome === "button" || SEL_BOTAO.test(" " + classe)) fonte = "botao";
    else if (nome === "footer" || SEL_RODAPE.test(classe)) fonte = "rodape";
    else if (nome === "header" || nome === "nav" || SEL_HEADER.test(classe)) fonte = "header";
    if (!fonte) continue;

    const style = attr(atributos, "style");
    if (style) {
      for (const d of style.split(";")) {
        const i = d.indexOf(":");
        if (i < 0) continue;
        const prop = d.slice(0, i).trim().toLowerCase();
        const valor = d.slice(i + 1);
        if (prop.startsWith("background")) add(valor, fonte, fonte === "botao" ? 5 : 4);
        else if (prop === "color" || prop === "fill") add(valor, fonte, fonte === "logo" ? 5 : 1);
        else if (prop.startsWith("border")) add(valor, fonte, 2);
      }
    }
    for (const t of classe.matchAll(/\b(bg|text|border|fill)-\[(#[0-9a-f]{3,8}|rgba?\([^\]]+\))\]/gi)) {
      add(t[2].replace(/_/g, " "), fonte, t[1] === "bg" ? (fonte === "botao" ? 5 : 4) : 1.5);
    }
  }
}

// ---------------------------------------------------------------------------
// Logotipo: acha a logo (e só a logo) e mede as cores dela
// ---------------------------------------------------------------------------

function acharLogos(html: string, base: string): { imagens: string[]; svgs: string[]; icone: string | null } {
  const imagens: string[] = [];
  const svgs: string[] = [];

  // 1) <img> que se declara logo (src, alt, class, id) ou que está dentro de um bloco "logo".
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (imagens.length >= 2) break;
    const tag = m[0];
    const src = attr(tag, "data-src") || attr(tag, "src") || attr(tag, "data-lazy-src");
    if (!src || src.startsWith("data:image/gif")) continue;
    const proprio = [src, attr(tag, "alt"), attr(tag, "class"), attr(tag, "id")].join(" ").toLowerCase();
    const antes = html.slice(Math.max(0, m.index! - 300), m.index).toLowerCase();
    const blocoLogo = /class=["'][^"']*(logo|site-branding|navbar-brand|custom-logo)[^"']*["'][^<]*$/.test(antes) || /<a[^>]*(logo|brand)[^>]*>\s*(<[^>]+>\s*)*$/.test(antes);
    if (/logo|logotipo|marca/.test(proprio) || blocoLogo) {
      const u = absoluta(src, base);
      if (u && !imagens.includes(u)) imagens.push(u);
    }
  }

  // 2) <svg> inline dentro de um bloco de logo.
  for (const m of html.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)) {
    if (svgs.length >= 1) break;
    const abre = m[0].slice(0, 300).toLowerCase();
    const antes = html.slice(Math.max(0, m.index! - 300), m.index).toLowerCase();
    if (/logo|brand/.test(abre) || /(logo|site-branding|navbar-brand)[^<]*$/.test(antes) || /<a[^>]*(logo|brand)[^>]*>\s*$/.test(antes)) {
      if (m[0].length < 200_000) svgs.push(m[0]);
    }
  }

  // 3) Sem nada declarado: primeira imagem (ou svg) dentro do <header>.
  if (imagens.length === 0 && svgs.length === 0) {
    const header = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0];
    if (header) {
      const img = header.match(/<img\b[^>]*>/i)?.[0];
      const src = img ? attr(img, "data-src") || attr(img, "src") : "";
      const u = src ? absoluta(src, base) : null;
      if (u) imagens.push(u);
      else {
        const svg = header.match(/<svg\b[\s\S]*?<\/svg>/i)?.[0];
        if (svg && svg.length < 200_000) svgs.push(svg);
      }
    }
  }

  // Ícone do site (apple-touch-icon / favicon): quase sempre a marca, peso menor.
  let icone: string | null = null;
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attr(m[0], "rel").toLowerCase();
    if (!/icon/.test(rel)) continue;
    const u = absoluta(attr(m[0], "href"), base);
    if (!u) continue;
    if (rel.includes("apple-touch-icon")) { icone = u; break; }
    if (!icone && !/\.ico(\?|$)/i.test(u)) icone = u;
  }

  return { imagens, svgs, icone };
}

/** Cores predominantes de uma imagem de logo (ignora transparência e fundo branco). */
async function coresDaImagem(buf: Buffer): Promise<{ rgb: RGB; fatia: number }[]> {
  const { data, info } = await sharp(buf, { density: 96 })
    .resize(64, 64, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const baldes = new Map<number, { r: number; g: number; b: number; n: number }>();
  let opacos = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const { l } = hsl([r, g, b]);
    if (l > 0.95) continue; // fundo branco da arte
    opacos++;
    const chave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bk = baldes.get(chave) ?? { r: 0, g: 0, b: 0, n: 0 };
    bk.r += r; bk.g += g; bk.b += b; bk.n++;
    baldes.set(chave, bk);
  }
  if (opacos < 20) return [];

  // Junta baldes vizinhos para o anti-aliasing não espalhar uma cor em várias.
  const grupos: { rgb: RGB; n: number }[] = [];
  for (const bk of [...baldes.values()].sort((a, b) => b.n - a.n)) {
    const rgb: RGB = [Math.round(bk.r / bk.n), Math.round(bk.g / bk.n), Math.round(bk.b / bk.n)];
    const g = grupos.find((x) => distancia(x.rgb, rgb) < 60);
    if (g) g.n += bk.n;
    else grupos.push({ rgb, n: bk.n });
  }
  return grupos
    .map((g) => ({ rgb: g.rgb, fatia: g.n / opacos }))
    .filter((g) => g.fatia >= 0.06)
    .sort((a, b) => b.fatia - a.fatia)
    .slice(0, 4);
}

async function baixar(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 8_000_000 ? null : buf;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------

export async function extrairCoresDaMarca(siteUrl: string): Promise<BrandColorResult | null> {
  const pagina = await buscarHtml(siteUrl);
  if (!pagina) return null;
  const { html, base } = pagina;

  const amostras: Amostra[] = [];
  const add = (valor: string, fonte: Fonte, peso: number) => {
    for (const rgb of coresDoValor(valor)) amostras.push({ rgb, peso, fonte });
  };

  // meta theme-color: a cor que o próprio site escolheu para a barra do navegador.
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const nome = (attr(m[0], "name") || attr(m[0], "property")).toLowerCase();
    if (nome === "theme-color" || nome === "msapplication-tilecolor") add(attr(m[0], "content"), "tema", 5);
  }

  // CSS: blocos <style> + as primeiras folhas de estilo do próprio site.
  const estilos = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const folhas: string[] = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/stylesheet/i.test(attr(m[0], "rel"))) continue;
    const u = absoluta(attr(m[0], "href"), base);
    // Fontes e bibliotecas de terceiros não dizem nada da marca.
    if (!u || /fonts\.googleapis|fontawesome|font-awesome|bootstrap(\.min)?\.css|cdnjs|jsdelivr|unpkg/i.test(u)) continue;
    folhas.push(u);
    if (folhas.length >= 5) break;
  }
  const baixadas = await Promise.all(folhas.map((u) => buscarTexto(u, 5000, 600_000)));
  for (const css of [...estilos, ...baixadas]) if (css) lerCss(css, add);
  lerHtmlInline(html, add);

  // Logo: a fonte mais confiável de todas.
  const { imagens, svgs, icone } = acharLogos(html, base);
  const leituras: Promise<void>[] = [];
  const medir = async (buf: Buffer | null, fonte: Fonte, pesoMax: number) => {
    if (!buf) return;
    try {
      for (const c of await coresDaImagem(buf)) amostras.push({ rgb: c.rgb, peso: pesoMax * Math.min(1, 0.35 + c.fatia), fonte });
    } catch {
      /* imagem que o sharp não entende: segue sem ela */
    }
  };
  imagens.forEach((u) => leituras.push(baixar(u).then((b) => medir(b, "logo", 8))));
  svgs.forEach((s) => leituras.push(medir(Buffer.from(s), "logo", 8)));
  if (icone) leituras.push(baixar(icone).then((b) => medir(b, "icone", 3)));
  await Promise.all(leituras);

  if (amostras.length === 0) return null;
  return montarPaleta(amostras);
}

type Grupo = { rgb: RGB; melhorPeso: number; score: number; porFonte: Map<Fonte, number> };

function agrupar(amostras: Amostra[], raio: number): Grupo[] {
  const grupos: Grupo[] = [];
  for (const a of amostras) {
    let g = grupos.find((x) => distancia(x.rgb, a.rgb) < raio);
    if (!g) {
      g = { rgb: a.rgb, melhorPeso: 0, score: 0, porFonte: new Map() };
      grupos.push(g);
    }
    // Cada tipo de peça contribui no máximo 3x o próprio peso: um CSS que
    // repete a mesma cor 200 vezes não vira "a cor da marca" sozinho.
    const atual = g.porFonte.get(a.fonte) ?? 0;
    const teto = a.peso * 3;
    const soma = Math.min(teto, atual + a.peso);
    g.score += Math.max(0, soma - atual);
    g.porFonte.set(a.fonte, soma);
    if (a.peso > g.melhorPeso) {
      g.melhorPeso = a.peso;
      g.rgb = a.rgb;
    }
  }
  // Aparecer em mais de um tipo de peça (ex.: logo + botão) é o sinal mais forte.
  for (const g of grupos) g.score *= 1 + 0.25 * (g.porFonte.size - 1);
  return grupos.sort((a, b) => b.score - a.score);
}

function montarPaleta(amostras: Amostra[]): BrandColorResult {
  const cromaticas = agrupar(amostras.filter((a) => ehCromatica(a.rgb)), 70).filter((g) => g.score >= 3);
  const neutras = amostras.filter((a) => !ehCromatica(a.rgb));
  const escuras = agrupar(neutras.filter((a) => hsl(a.rgb).l < 0.3 && a.fonte !== "corpo"), 40).filter((g) => g.score >= 3);
  const claras = agrupar(neutras.filter((a) => hsl(a.rgb).l > 0.9), 25);

  const marca = cromaticas.slice(0, 3);
  const escura = escuras[0];
  // Fundo: um claro que o site realmente usa (header/rodapé/corpo); branco se não houver.
  const fundo = claras.find((g) => g.porFonte.has("corpo") || g.porFonte.has("header") || g.porFonte.has("rodape") || g.porFonte.has("tema"));

  const escolhidas: { g: Grupo | null; hex: string }[] = [];
  const push = (g: Grupo | null | undefined, hex?: string) => {
    if (!g && !hex) return;
    const h = hex ?? toHex(g!.rgb);
    if (!escolhidas.some((e) => e.hex === h)) escolhidas.push({ g: g ?? null, hex: h });
  };

  if (marca.length > 0) {
    push(marca[0]);                              // cor principal da marca
    push(marca[1] ?? escura);                    // destaque (2ª cor da marca ou o escuro do site)
    push(fundo, fundo ? undefined : "#FFFFFF");  // fundo claro
    if (marca[1]) push(escura);
    push(marca[2]);
  } else if (escura) {
    // Marca preto e branco: é isso mesmo, não inventamos cor.
    push(escura);
    push(escuras[1]);
    push(fundo, fundo ? undefined : "#FFFFFF");
  }

  const roles = ["primary", "accent", "background", "detail", "detail"];
  const colors = escolhidas.slice(0, 5).map((e, i) => ({ hex: e.hex, role: roles[i] }));

  const evidencia = escolhidas
    .filter((e) => e.g)
    .map((e) => `${e.hex} (${[...e.g!.porFonte.keys()].map((f) => ROTULO[f]).join(", ")})`);

  const principal = marca[0] ?? escura;
  const confiavel = principal && ["logo", "botao", "header", "rodape", "tema"].filter((f) => principal.porFonte.has(f as Fonte)).length;
  const confianca: BrandColorResult["confianca"] =
    !principal ? "baixa" : principal.porFonte.has("logo") || (confiavel ?? 0) >= 2 ? "alta" : "media";

  return { colors, evidencia, confianca };
}
