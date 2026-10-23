/**
 * Reduz o peso de um PDF no próprio navegador: cada página vira uma imagem
 * JPEG em resolução de tela e o PDF é remontado com o mesmo tamanho de página.
 * Serve para cardápio feito de imagem (Photoshop, Canva). Texto selecionável e
 * links dentro do PDF se perdem, por isso o dono precisa escolher usar.
 */
const PASSOS = [
  { lado: 1800, qualidade: 0.8 },
  { lado: 1500, qualidade: 0.72 },
  { lado: 1200, qualidade: 0.65 },
];

export async function comprimirPdf(arquivo: File, alvoBytes: number): Promise<File | null> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const { PDFDocument } = await import("pdf-lib");

  const origem = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  if (origem.numPages > 20) return null;

  for (const passo of PASSOS) {
    const saida = await PDFDocument.create();
    for (let n = 1; n <= origem.numPages; n++) {
      const pagina = await origem.getPage(n);
      const base = pagina.getViewport({ scale: 1 });
      const escala = passo.lado / Math.max(base.width, base.height);
      const vp = pagina.getViewport({ scale: escala });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pagina.render({ canvasContext: ctx, viewport: vp }).promise;
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", passo.qualidade));
      canvas.width = 0;
      if (!blob) return null;
      const img = await saida.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const pg = saida.addPage([base.width, base.height]);
      pg.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
    }
    const bytes = await saida.save();
    if (bytes.byteLength <= alvoBytes) {
      return new File([bytes as BlobPart], arquivo.name, { type: "application/pdf" });
    }
  }
  return null;
}

/** PDF acima disso é reduzido sozinho antes de enviar. */
export const PDF_AUTO_BYTES = 4.5 * 1024 * 1024;

/**
 * Regra única para todo upload de PDF: se estiver pesado, reduz no navegador.
 * Se não der para reduzir, devolve o original (quem chama confere o limite).
 */
export async function otimizarPdf(arquivo: File): Promise<{ arquivo: File; reduziu: boolean }> {
  if (arquivo.size <= PDF_AUTO_BYTES) return { arquivo, reduziu: false };
  try {
    const menor = await comprimirPdf(arquivo, PDF_AUTO_BYTES);
    if (menor && menor.size < arquivo.size) return { arquivo: menor, reduziu: true };
  } catch { /* segue com o original */ }
  return { arquivo, reduziu: false };
}
