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
};

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
          .map((i) => ({ id: String(i.id || novoId()), nome: i.nome, descricao: i.descricao || "", preco: typeof i.preco === "number" ? i.preco : null, aPartir: !!i.aPartir, foto: i.foto || null })),
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
export type CardapioPdf = { id: string; nome: string; url: string };

export const MAX_PDFS = 6;

/** Lê os PDFs do botão. Quem só tinha o PDF único (pdf_url) continua funcionando como o primeiro da lista. */
export function lerPdfs(config: unknown): CardapioPdf[] {
  const c = (config ?? {}) as { pdfs?: unknown; pdf_url?: unknown };
  if (Array.isArray(c.pdfs)) {
    const lista = c.pdfs
      .map((p) => p as Partial<CardapioPdf>)
      .filter((p) => typeof p?.url === "string" && p.url)
      .map((p, i) => ({ id: typeof p.id === "string" && p.id ? p.id : `pdf${i}`, nome: typeof p.nome === "string" ? p.nome : "", url: p.url as string }));
    return lista;
  }
  if (typeof c.pdf_url === "string" && c.pdf_url) return [{ id: "principal", nome: "Cardápio", url: c.pdf_url }];
  return [];
}
