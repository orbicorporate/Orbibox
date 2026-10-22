/**
 * Arquivo anexado a uma página de produto: um PDF ou uma imagem (arte, PNG, JPEG).
 * Fica guardado na coluna `images` do item, como { anexo: {...} }, sem mexer no banco.
 * Na página pública vira um botão; ao tocar, o arquivo abre.
 */
export type Anexo = {
  url: string;
  tipo: "pdf" | "imagem";
  titulo: string;
  bytes?: number;
};

export const LIMITE_PDF = 10 * 1024 * 1024;
export const LIMITE_IMAGEM = 20 * 1024 * 1024;
export const TIPOS_ANEXO = "application/pdf,image/png,image/jpeg,image/webp,image/gif";

export function lerAnexo(raw: unknown): Anexo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const a = (raw as { anexo?: Partial<Anexo> }).anexo;
  if (!a || typeof a.url !== "string" || !/^https?:\/\//i.test(a.url)) return null;
  return {
    url: a.url,
    tipo: a.tipo === "pdf" ? "pdf" : "imagem",
    titulo: typeof a.titulo === "string" ? a.titulo : "",
    ...(typeof a.bytes === "number" && a.bytes > 0 ? { bytes: a.bytes } : {}),
  };
}

export function tituloPadraoAnexo(tipo: Anexo["tipo"]): string {
  return tipo === "pdf" ? "Ver PDF" : "Ver imagem";
}
