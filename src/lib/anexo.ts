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

export const MAX_ANEXOS = 4;
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

function umAnexo(a: Partial<Anexo> | undefined): Anexo | null {
  if (!a || typeof a.url !== "string" || !/^https?:\/\//i.test(a.url)) return null;
  return {
    url: a.url,
    tipo: a.tipo === "pdf" ? "pdf" : "imagem",
    titulo: typeof a.titulo === "string" ? a.titulo : "",
    ...(typeof a.bytes === "number" && a.bytes > 0 ? { bytes: a.bytes } : {}),
  };
}

/** Até 4 arquivos. Lê `anexos` e, em páginas antigas, o `anexo` único. */
export function lerAnexos(raw: unknown): Anexo[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const o = raw as { anexo?: Partial<Anexo>; anexos?: Partial<Anexo>[] };
  const lista = Array.isArray(o.anexos) ? o.anexos.map(umAnexo).filter((a): a is Anexo => !!a) : [];
  if (lista.length > 0) return lista.slice(0, MAX_ANEXOS);
  const unico = umAnexo(o.anexo);
  return unico ? [unico] : [];
}

/** Formato salvo em `images`: `anexo` (o primeiro) segue para quem lê o formato antigo. */
export function anexosParaSalvar(lista: Anexo[]): Record<string, unknown> | never[] {
  return lista.length === 0 ? [] : { anexo: lista[0], anexos: lista };
}
