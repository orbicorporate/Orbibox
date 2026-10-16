/** Um material para o visitante baixar (guia, curso, planilha, documento). */
export type Material = {
  id: string;
  titulo: string;
  descricao: string;
  url: string;
  capa: string | null;
  /** "livre": baixa direto. "contato": pede nome e WhatsApp antes. */
  acesso: "livre" | "contato";
  bytes?: number;
};

export const MAX_MATERIAIS = 20;

export function novoIdMaterial(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function lerMateriais(config: unknown): Material[] {
  const c = (config ?? {}) as { materiais?: unknown };
  if (!Array.isArray(c.materiais)) return [];
  return c.materiais
    .map((m) => m as Partial<Material>)
    .filter((m) => typeof m?.url === "string" && m.url)
    .map((m, i) => ({
      id: typeof m.id === "string" && m.id ? m.id : `mat${i}`,
      titulo: typeof m.titulo === "string" ? m.titulo : "",
      descricao: typeof m.descricao === "string" ? m.descricao : "",
      url: m.url as string,
      capa: typeof m.capa === "string" && m.capa ? m.capa : null,
      acesso: m.acesso === "contato" ? ("contato" as const) : ("livre" as const),
      ...(typeof m.bytes === "number" && m.bytes > 0 ? { bytes: m.bytes } : {}),
    }));
}

/** "PDF", "ZIP", "XLSX"... pela extensão do link; "Arquivo" se não der para saber. */
export function tipoDoArquivo(url: string): string {
  const limpo = url.split("?")[0].split("#")[0];
  const ext = limpo.includes(".") ? limpo.split(".").pop() ?? "" : "";
  return /^[a-z0-9]{2,5}$/i.test(ext) ? ext.toUpperCase() : "Arquivo";
}

/** Nome único para um arquivo enviado (fora do componente, para manter a renderização pura). */
export function nomeUnico(prefixo: string, ext: string): string {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
}
