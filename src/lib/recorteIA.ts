import { tirarFundo } from "@/lib/tirarFundo";

let semChave = false;
let cadeiaLocal: Promise<unknown> = Promise.resolve();

/** True quando o servidor não tem a chave da IA configurada. */
export function recorteIAIndisponivel() {
  return semChave;
}

/** Recorte com IA (só o produto, fundo claro e neutro). Devolve um JPEG de até 900 px, ou lança erro. */
export async function recorteComIA(origem: Blob): Promise<Blob> {
  if (semChave) throw new Error("indisponivel");
  const form = new FormData();
  form.append("imagem", origem, "prato.jpg");
  const r = await fetch("/api/recorte-ia", { method: "POST", body: form });
  if (r.status === 501) { semChave = true; throw new Error("indisponivel"); }
  if (!r.ok) throw new Error("falhou");
  const png = await r.blob();
  const bmp = await createImageBitmap(png);
  const lado = Math.min(900, bmp.width);
  const c = document.createElement("canvas");
  c.width = lado; c.height = lado;
  c.getContext("2d")!.drawImage(bmp, 0, 0, lado, lado);
  const jpeg = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.9));
  if (!jpeg) throw new Error("falhou");
  return jpeg;
}

/**
 * Melhor recorte possível: tenta a IA e, se não houver chave ou ela falhar, cai no recorte local
 * (uma foto por vez, porque o modelo local é pesado).
 */
export async function melhorRecorte(recorte: Blob, aoBaixar?: (p: number) => void): Promise<{ blob: Blob; ia: boolean; semFundo: boolean }> {
  try {
    return { blob: await recorteComIA(recorte), ia: true, semFundo: true };
  } catch { /* cai no local */ }
  const vez = cadeiaLocal.then(async () => {
    try { return { blob: await tirarFundo(recorte, aoBaixar), ia: false, semFundo: true }; }
    catch { return { blob: recorte, ia: false, semFundo: false }; }
  });
  cadeiaLocal = vez.catch(() => undefined);
  return vez;
}

/** Roda as tarefas com no máximo `limite` ao mesmo tempo. */
export async function emParalelo<T>(itens: T[], limite: number, fazer: (x: T) => Promise<void>): Promise<void> {
  let k = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (k < itens.length) { const x = itens[k++]; await fazer(x); }
  });
  await Promise.all(trabalhadores);
}
