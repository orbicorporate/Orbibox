export type CorFoto = { cor: number; sat: number; luz: number; sombra: number };
export const COR_ZERO: CorFoto = { cor: 0, sat: 0, luz: 0, sombra: 0 };

export function corMexida(c: CorFoto): boolean {
  return c.cor !== 0 || c.sat !== 0 || c.luz !== 0 || c.sombra !== 0;
}

/** Aplica cor (frio/quente), saturação, luz e sombra direto nos pixels. Cada valor vai de -100 a 100. */
export function aplicarCor(data: ImageData, c: CorFoto): void {
  const px = data.data;
  const ganho = Math.pow(2, (c.luz / 100) * 0.7);
  const tom = c.cor * 0.4;
  const sat = 1 + c.sat / 100;
  const sombra = (c.sombra / 100) * 70;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i] * ganho;
    let g = px[i + 1] * ganho;
    let b = px[i + 2] * ganho;
    if (sombra !== 0) {
      const l = Math.min(1, Math.max(0, (0.299 * r + 0.587 * g + 0.114 * b) / 255));
      const add = sombra * (1 - l) * (1 - l);
      r += add; g += add; b += add;
    }
    r += tom; b -= tom;
    if (sat !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * sat;
      g = gray + (g - gray) * sat;
      b = gray + (b - gray) * sat;
    }
    px[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    px[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    px[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
}

export function desenhar(origem: ImageBitmap, max: number, c: CorFoto, canvas?: HTMLCanvasElement): HTMLCanvasElement {
  const esc = Math.min(1, max / Math.max(origem.width, origem.height));
  const w = Math.max(1, Math.round(origem.width * esc));
  const h = Math.max(1, Math.round(origem.height * esc));
  const cv = canvas ?? document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(origem, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);
  aplicarCor(d, c);
  ctx.putImageData(d, 0, 0);
  return cv;
}

export function paraBlob(cv: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((ok) => cv.toBlob((b) => ok(b), "image/jpeg", 0.9));
}
