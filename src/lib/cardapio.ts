/**
 * Cardápio é uma função própria, separada do Catálogo. Os pratos ficam
 * guardados na configuração do botão de cardápio (smart_boxes.config.secoes),
 * então não mexem em nenhum item do Catálogo.
 */
export type CardapioItem = {
  id: string;
  nome: string;
  descricao?: string;
  preco?: number | null;
  /** "a partir de" quando o prato tem tamanhos com preços diferentes. */
  aPartir?: boolean;
  foto?: string | null;
  /** Enquadramento da foto dentro do quadrado: zoom (1 a 3) e deslocamento em % do quadrado. */
  fotoAjuste?: FotoAjuste | null;
};

export type FotoAjuste = { z: number; x: number; y: number };
export const ZOOM_MAX = 3;

/** Mantém a foto sempre cobrindo o quadrado: o deslocamento máximo cresce com o zoom. */
export function limitarAjuste(a: FotoAjuste): FotoAjuste {
  const z = Math.min(ZOOM_MAX, Math.max(1, Number.isFinite(a.z) ? a.z : 1));
  const m = ((z - 1) / 2) * 100;
  const c = (v: number) => Math.min(m, Math.max(-m, Number.isFinite(v) ? v : 0));
  return { z, x: c(a.x), y: c(a.y) };
}

/** Estilo da imagem para o enquadramento salvo (o mesmo no editor e na página pública). */
export function estiloFoto(a?: FotoAjuste | null): { transform: string } | undefined {
  if (!a || (a.z <= 1 && a.x === 0 && a.y === 0)) return undefined;
  const l = limitarAjuste(a);
  return { transform: `translate(${l.x}%, ${l.y}%) scale(${l.z})` };
}

export type CardapioSecao = {
  id: string;
  nome: string;
  itens: CardapioItem[];
};

export function novoId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function lerSecoes(config: unknown): CardapioSecao[] {
  const bruto = (config as { secoes?: unknown } | null)?.secoes;
  if (!Array.isArray(bruto)) return [];
  return bruto
    .map((s) => {
      const sec = s as Partial<CardapioSecao>;
      const itens = Array.isArray(sec.itens) ? sec.itens : [];
      return {
        id: String(sec.id || novoId()),
        nome: String(sec.nome ?? ""),
        itens: itens
          .filter((i) => i && typeof i.nome === "string")
          .map((i) => ({ id: String(i.id || novoId()), nome: i.nome, descricao: i.descricao || "", preco: typeof i.preco === "number" ? i.preco : null, aPartir: !!i.aPartir, foto: i.foto || null, fotoAjuste: i.fotoAjuste && typeof i.fotoAjuste.z === "number" ? limitarAjuste(i.fotoAjuste) : null })),
      };
    });
}

export function totalItens(secoes: CardapioSecao[]): number {
  return secoes.reduce((n, s) => n + s.itens.filter((i) => i.nome.trim()).length, 0);
}

export function precoCardapio(i: Pick<CardapioItem, "preco" | "aPartir">): string | null {
  if (i.preco == null) return null;
  const v = i.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return i.aPartir ? `A partir de ${v}` : v;
}

/** Um PDF do cardápio (ex.: Cardápio, Bebidas, Sobremesas). */
export type CardapioPdf = { id: string; nome: string; url: string; /** Peso do arquivo em bytes, quando conhecido. */ bytes?: number };

export const MAX_PDFS = 6;

/** Lê os PDFs do botão. Quem só tinha o PDF único (pdf_url) continua funcionando como o primeiro da lista. */
export function lerPdfs(config: unknown): CardapioPdf[] {
  const c = (config ?? {}) as { pdfs?: unknown; pdf_url?: unknown };
  if (Array.isArray(c.pdfs)) {
    const lista = c.pdfs
      .map((p) => p as Partial<CardapioPdf>)
      .filter((p) => typeof p?.url === "string" && p.url)
      .map((p, i) => ({ id: typeof p.id === "string" && p.id ? p.id : `pdf${i}`, nome: typeof p.nome === "string" ? p.nome : "", url: p.url as string, ...(typeof p.bytes === "number" && p.bytes > 0 ? { bytes: p.bytes } : {}) }));
    return lista;
  }
  if (typeof c.pdf_url === "string" && c.pdf_url) return [{ id: "principal", nome: "Cardápio", url: c.pdf_url }];
  return [];
}

/** Cores sugeridas para os botões do cardápio. A primeira é o preto padrão. */
export const CORES_BOTAO = ["#14161B", "#B3261E", "#D9620B", "#B7791F", "#2F7D4F", "#0F766E", "#1D4ED8", "#7C3AED", "#BE185D", "#6B4E3D"];

/** Lê a cor escolhida pelo dono para os botões do cardápio (só aceita #RRGGBB). */
export function lerCorBotoes(config: unknown): string | null {
  const v = (config as { corBotoes?: unknown } | null)?.corBotoes;
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null;
}

export type LayoutItens = "lista" | "cards";

/** Como o dono quer mostrar os pratos para o cliente (padrão: lista). */
export function lerLayoutItens(config: unknown): LayoutItens {
  return (config as { layoutItens?: unknown } | null)?.layoutItens === "cards" ? "cards" : "lista";
}

/** Texto branco ou escuro, o que ler melhor sobre a cor do botão. */
export function textoSobre(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return l > 0.4 ? "#14161B" : "#FFFFFF";
}

/** "2,1 MB" ou "480 KB". */
export function pesoLegivel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Nome único para um arquivo enviado (fora do componente, para manter a renderização pura). */
export function nomeArquivoUnico(prefixo: string, ext: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
}
