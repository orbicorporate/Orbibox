import sharp from "sharp";
import { BOX_COLORS } from "@/lib/showcase";

/**
 * Olha pra uma foto de produto e devolve a chave de uma cor curada (de
 * BOX_COLORS) que combina com ela — baseada na cor predominante do PRODUTO
 * em si, ignorando fundo branco/cinza de estúdio (muito comum em foto de
 * catálogo). Se a foto não tiver uma cor clara de sobra (preto e branco,
 * cinza, etc.), devolve null — o item fica "neutro" mesmo, sem forçar cor.
 *
 * Só roda no servidor (usa `sharp`, processamento nativo de imagem).
 */
export async function extractAccentBoxColor(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());

    // Reduz bem pequeno — só precisamos de uma amostra representativa, não
    // qualidade. Mais rápido e mais barato.
    const { data, info } = await sharp(buf)
      .resize(48, 48, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels; // 3 (RGB) já que removemos alpha
    const totalPixels = data.length / channels;

    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += channels) {
      const pr = data[i], pg = data[i + 1], pb = data[i + 2];
      const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
      const lightness = (max + min) / 2;
      const sat = max === min ? 0 : (max - min) / (255 - Math.abs(2 * lightness - 255));
      // Pula fundo de estúdio: quase branco, quase preto, ou baixa saturação
      // (cinza) — sobra só o que tem "cor de verdade", que costuma ser o produto.
      if (lightness > 235 || lightness < 20 || sat < 0.12) continue;
      r += pr; g += pg; b += pb; count++;
    }

    // Sem cor de sobra o bastante (produto em preto/branco/cinza, ou foto
    // quase toda fundo) — não força nada, deixa neutro.
    if (count < totalPixels * 0.06) return null;

    r /= count; g /= count; b /= count;

    // Acha a cor curada mais próxima (distância euclidiana simples em RGB).
    let bestKey: string | null = null;
    let bestDist = Infinity;
    for (const [key, swatch] of Object.entries(BOX_COLORS)) {
      if (key === "neutro" || key === "claro" || key === "escuro") continue;
      const hex = swatch.bg.replace("#", "");
      if (hex.length !== 6) continue;
      const sr = parseInt(hex.slice(0, 2), 16);
      const sg = parseInt(hex.slice(2, 4), 16);
      const sb = parseInt(hex.slice(4, 6), 16);
      const dist = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
      if (dist < bestDist) { bestDist = dist; bestKey = key; }
    }
    return bestKey;
  } catch {
    // Falha de rede, formato não suportado, timeout — sem problema, o item
    // só fica sem cor de destaque (comportamento de hoje).
    return null;
  }
}
