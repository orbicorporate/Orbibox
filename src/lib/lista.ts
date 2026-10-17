/**
 * Lista de itens opcional dentro de uma página própria: uma "lojinha de
 * Instagram", com boxes de foto, nome e preço. Sem carrinho, estoque ou
 * variações. O dono escolhe o destino do botão que aparece ao tocar num item.
 */
export type ListaDestino = "whatsapp" | "delivery" | "link" | "nenhum";

export type ListaItem = {
  id: string;
  nome: string;
  preco?: number | null;
  descricao?: string;
  foto?: string | null;
  /** Carrossel: até MAX_FOTOS fotos; a primeira é a capa e fica igual a `foto`. */
  fotos?: string[];
  /** Usado quando o destino da lista é "link". */
  link?: string;
  esgotado?: boolean;
};

export type Lista = {
  titulo: string;
  destino: ListaDestino;
  /** Mostra "Perguntar à Orbi" embaixo do botão principal. Padrão: ligado. */
  orbi?: boolean;
  itens: ListaItem[];
};

export const MAX_LISTA = 60;
export const MAX_FOTOS = 8;

/** Todas as fotos do item, capa primeiro. Itens antigos só têm `foto`. */
export function fotosDoItem(i: Pick<ListaItem, "foto" | "fotos">): string[] {
  const lista = Array.isArray(i.fotos) ? i.fotos.filter((f): f is string => typeof f === "string" && !!f) : [];
  const todas = lista.length > 0 ? lista : i.foto ? [i.foto] : [];
  return todas.slice(0, MAX_FOTOS);
}

export function novoIdLista(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function listaVazia(): Lista {
  return { titulo: "Nossos itens", destino: "whatsapp", itens: [] };
}

export function lerLista(raw: unknown): Lista | null {
  if (!raw || typeof raw !== "object") return null;
  const l = raw as Partial<Lista>;
  if (!Array.isArray(l.itens)) return null;
  const destino: ListaDestino = l.destino === "link" || l.destino === "nenhum" || l.destino === "delivery" ? l.destino : "whatsapp";
  return {
    titulo: typeof l.titulo === "string" ? l.titulo : "",
    destino,
    orbi: l.orbi !== false,
    itens: l.itens
      .filter((i): i is ListaItem => !!i && typeof (i as ListaItem).nome === "string")
      .slice(0, MAX_LISTA)
      .map((i) => ({
        id: String(i.id || novoIdLista()),
        nome: i.nome,
        preco: typeof i.preco === "number" ? i.preco : null,
        descricao: typeof i.descricao === "string" ? i.descricao : "",
        foto: fotosDoItem(i)[0] ?? null,
        fotos: fotosDoItem(i),
        link: typeof i.link === "string" ? i.link : "",
        esgotado: !!i.esgotado,
      })),
  };
}

export function precoDoItem(n: number | null | undefined): string | null {
  if (n == null) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Só abre http(s): aceita "loja.com/x" e completa com https://. */
export function urlSegura(link: string | undefined): string | null {
  const v = (link ?? "").trim();
  if (!v) return null;
  const comProtocolo = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(comProtocolo);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Reduz a foto no aparelho antes de enviar (lado maior até 1200px, JPEG). */
export async function reduzirFoto(file: File, maximo = 1200): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const escala = Math.min(1, maximo / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * escala));
    const h = Math.max(1, Math.round(bmp.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}
