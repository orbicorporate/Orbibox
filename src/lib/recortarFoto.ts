/** Posição de uma foto dentro de uma imagem, em fração de 0 a 1. */
export type CaixaFoto = { imagem: number; x: number; y: number; largura: number; altura: number };

const cacheImagens = new Map<string, Promise<ImageBitmap>>();

function carregar(url: string): Promise<ImageBitmap> {
  let p = cacheImagens.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error("imagem");
      return r.blob();
    }).then((b) => createImageBitmap(b));
    cacheImagens.set(url, p);
  }
  return p;
}

/**
 * Recorta a foto de um prato da imagem da página, em quadrado com uma pequena
 * margem, e devolve um JPEG de até 900 px. A qualidade nunca passa da
 * resolução que a imagem original tem.
 */
export async function recortarFoto(urlImagem: string, caixa: CaixaFoto): Promise<Blob | null> {
  const img = await carregar(urlImagem);
  const W = img.width;
  const H = img.height;
  const cx = (caixa.x + caixa.largura / 2) * W;
  const cy = (caixa.y + caixa.altura / 2) * H;
  let lado = Math.max(caixa.largura * W, caixa.altura * H) * 1.06;
  lado = Math.min(lado, W, H);
  const sx = Math.min(Math.max(cx - lado / 2, 0), W - lado);
  const sy = Math.min(Math.max(cy - lado / 2, 0), H - lado);
  if (lado < 80) return null;
  const saida = Math.min(900, Math.round(lado));
  const canvas = document.createElement("canvas");
  canvas.width = saida;
  canvas.height = saida;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, lado, lado, 0, 0, saida, saida);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.9));
  canvas.width = 0;
  return blob;
}
