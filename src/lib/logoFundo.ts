/**
 * Cor de fundo de um logo quadrado. Olha só a moldura da imagem (as bordas): se ela é toda
 * opaca e quase de uma cor só, essa é a cor de fundo do logo. Logo com borda transparente,
 * ou com fotos/degradês nas bordas, devolve null (não tem "fundo" para repetir).
 * Função pura: roda no navegador (canvas) e no servidor (sharp) com o mesmo resultado.
 */
export function fundoDosPixels(data: ArrayLike<number>, w: number, h: number): string | null {
  const amostras: number[][] = [];
  const pegar = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    amostras.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
  };
  const g = Math.max(1, Math.round(Math.min(w, h) * 0.04)); // espessura da moldura
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < g || y < g || x >= w - g || y >= h - g) pegar(x, y);
    }
  }
  if (amostras.length === 0) return null;
  const opacas = amostras.filter((p) => p[3] > 200);
  if (opacas.length / amostras.length < 0.9) return null;
  const med = (c: number) => {
    const v = opacas.map((p) => p[c]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const [r, gg, b] = [med(0), med(1), med(2)];
  const perto = opacas.filter((p) => Math.abs(p[0] - r) + Math.abs(p[1] - gg) + Math.abs(p[2] - b) < 48).length;
  if (perto / opacas.length < 0.88) return null;
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(gg)}${hex(b)}`;
}
