/**
 * Transforma as páginas de um PDF em imagens JPEG no navegador, para a Orbi
 * ler o cardápio como foto. Funciona com PDF de texto e com PDF de imagem.
 */
export const MAX_PAGINAS_LEITURA = 8;

export async function pdfParaImagens(origem: File | Blob): Promise<{ imagens: Blob[]; paginas: number }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await origem.arrayBuffer()) }).promise;
  const imagens: Blob[] = [];
  const total = Math.min(doc.numPages, MAX_PAGINAS_LEITURA);
  for (let n = 1; n <= total; n++) {
    const pagina = await doc.getPage(n);
    const base = pagina.getViewport({ scale: 1 });
    const vp = pagina.getViewport({ scale: 2200 / Math.max(base.width, base.height) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.88));
    canvas.width = 0;
    if (blob) imagens.push(blob);
  }
  return { imagens, paginas: doc.numPages };
}
