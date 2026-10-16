/**
 * Tira o fundo da foto de um prato (no navegador, sem enviar a imagem a nenhum
 * servidor de IA) e a coloca centralizada sobre um fundo claro neutro, num
 * quadrado, com uma pequena margem. O modelo é baixado na primeira vez.
 */
export const FUNDO_NEUTRO = "#F4F1EA";

export async function tirarFundo(origem: Blob, aoProgresso?: (fracao: number) => void): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  const png = await removeBackground(origem, {
    model: "isnet_quint8",
    output: { format: "image/png" },
    progress: (_chave, atual, total) => {
      if (total > 0) aoProgresso?.(Math.min(1, atual / total));
    },
  });
  const img = await carregar(png);
  const { w, h } = { w: img.naturalWidth, h: img.naturalHeight };

  // Caixa do que sobrou (pixels com alguma opacidade), para centralizar o prato.
  const leitura = document.createElement("canvas");
  leitura.width = w;
  leitura.height = h;
  const lc = leitura.getContext("2d", { willReadFrequently: true });
  if (!lc) throw new Error("canvas indisponível");
  lc.drawImage(img, 0, 0);
  const dados = lc.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (dados[(y * w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("nada reconhecido");
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;

  const lado = 800;
  const margem = 0.1;
  const area = lado * (1 - margem * 2);
  const esc = Math.min(area / bw, area / bh);
  const dw = bw * esc;
  const dh = bh * esc;
  const saida = document.createElement("canvas");
  saida.width = lado;
  saida.height = lado;
  const sc = saida.getContext("2d");
  if (!sc) throw new Error("canvas indisponível");
  sc.fillStyle = FUNDO_NEUTRO;
  sc.fillRect(0, 0, lado, lado);
  sc.imageSmoothingQuality = "high";
  sc.drawImage(img, x0, y0, bw, bh, (lado - dw) / 2, (lado - dh) / 2, dw, dh);
  return await new Promise<Blob>((ok, falha) => saida.toBlob((b) => (b ? ok(b) : falha(new Error("falha ao gerar imagem"))), "image/jpeg", 0.9));
}

function carregar(b: Blob): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(b);
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(url); ok(i); };
    i.onerror = () => { URL.revokeObjectURL(url); falha(new Error("imagem ilegível")); };
    i.src = url;
  });
}
