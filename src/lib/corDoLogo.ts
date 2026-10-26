"use client";

/**
 * Cor que mais marca o logo: média dos pixels coloridos (ignora branco, preto,
 * cinza e transparente). Devolve "r, g, b" para usar com transparência, ou null
 * se a imagem não deixar ler (CORS) ou não tiver cor.
 */
export function corDoLogo(img: HTMLImageElement): string | null {
  try {
    const c = document.createElement("canvas");
    const t = 48;
    c.width = t;
    c.height = t;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, t, t);
    const d = ctx.getImageData(0, 0, t, t).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      const max = Math.max(d[i], d[i + 1], d[i + 2]), min = Math.min(d[i], d[i + 1], d[i + 2]);
      if (max - min < 40 || max < 40 || min > 225) continue;
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
    if (n < 20) return null;
    return `${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)}`;
  } catch {
    return null;
  }
}
