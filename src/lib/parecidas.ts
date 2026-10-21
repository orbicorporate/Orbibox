/**
 * Assinatura visual simples (dHash de 64 bits) para achar fotos repetidas ou
 * quase iguais, mesmo que tenham sido salvas em arquivos e tamanhos diferentes.
 */

const LIMITE = 6; // bits de diferença aceitos para considerar a mesma foto

function hashDe(img: CanvasImageSource): string {
  const c = document.createElement("canvas");
  c.width = 9;
  c.height = 8;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, 9, 8);
  const d = ctx.getImageData(0, 0, 9, 8).data;
  const g = (x: number, y: number) => {
    const i = (y * 9 + x) * 4;
    return d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  };
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += g(x, y) > g(x + 1, y) ? "1" : "0";
  return bits;
}

export function hashDeUrl(url: string): Promise<string> {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try { ok(hashDe(img)); } catch (e) { falha(e); }
    };
    img.onerror = () => falha(new Error("imagem"));
    // A mesma foto já carregada na tela (sem CORS) fica no cache do navegador sem permissão de leitura, e o
    // canvas recusa os pixels. Um parâmetro a mais faz pedir de novo, já com a permissão.
    img.src = url + (url.includes("?") ? "&" : "?") + "cors=1";
  });
}

export async function hashDeArquivo(f: Blob): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    return await new Promise<string>((ok, falha) => {
      const img = new Image();
      img.onload = () => { try { ok(hashDe(img)); } catch (e) { falha(e); } };
      img.onerror = () => falha(new Error("imagem"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function distancia(a: string, b: string) {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

export function pareceCom(h: string, outros: Iterable<string>) {
  for (const o of outros) if (distancia(h, o) <= LIMITE) return true;
  return false;
}

/** Calcula as assinaturas de várias fotos, poucas por vez. */
export async function calcularHashes(itens: { id: string; url: string }[], atual: Map<string, string>, aoAvancar?: () => void) {
  const fila = itens.filter((i) => !atual.has(i.id));
  let n = 0;
  async function trabalhador() {
    while (n < fila.length) {
      const i = fila[n++];
      try { atual.set(i.id, await hashDeUrl(i.url)); } catch { /* foto sem acesso: ignora */ }
      aoAvancar?.();
    }
  }
  await Promise.all([trabalhador(), trabalhador(), trabalhador(), trabalhador()]);
}

/** Agrupa ids parecidos entre si. Só devolve grupos com 2 ou mais. */
export function agrupar(ids: string[], hashes: Map<string, string>): string[][] {
  const grupos: string[][] = [];
  for (const id of ids) {
    const h = hashes.get(id);
    if (!h) continue;
    const g = grupos.find((gr) => distancia(h, hashes.get(gr[0])!) <= LIMITE);
    if (g) g.push(id);
    else grupos.push([id]);
  }
  return grupos.filter((g) => g.length > 1);
}

/**
 * Separa, entre os arquivos escolhidos, os que já existem na galeria (iguais ou muito parecidos)
 * e os repetidos dentro do próprio lote. Devolve só os novos e quantos foram descartados.
 */
export async function separarRepetidas(
  arquivos: File[],
  existentes: { id: string; url: string }[],
  hashes: Map<string, string>,
): Promise<{ novos: { arquivo: File; hash: string | null }[]; repetidas: number }> {
  await calcularHashes(existentes, hashes);
  const conhecidos = new Set(hashes.values());
  const novos: { arquivo: File; hash: string | null }[] = [];
  let repetidas = 0;
  for (const arquivo of arquivos) {
    const hash = await hashDeArquivo(arquivo).catch(() => null);
    if (hash && pareceCom(hash, conhecidos)) { repetidas++; continue; }
    if (hash) conhecidos.add(hash);
    novos.push({ arquivo, hash });
  }
  return { novos, repetidas };
}
