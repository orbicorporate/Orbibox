"use client";

/**
 * Confere se uma imagem já está na proporção pedida. Fora da medida (mais de 4%
 * de diferença), quem chama abre o recorte em vez de usar a imagem como veio.
 */
export function proporcaoDaImagem(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function estaNaMedida(url: string, alvo: number): Promise<boolean> {
  const r = await proporcaoDaImagem(url);
  if (!r) return false;
  return Math.abs(r - alvo) / alvo <= 0.04;
}

/** Baixa a imagem como arquivo, para abrir no recorte. */
export async function arquivoDaUrl(url: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], "foto.jpg", { type: blob.type || "image/jpeg" });
}

export const AVISO_FORA_DA_MEDIDA = "Essa imagem está fora da medida. Enquadre para ela caber certinho.";
