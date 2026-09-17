import { getInspirePhotos } from "@/lib/inspirePhotos";
import type { InspireParaApresentacao } from "@/components/apresentacao/ApresentacaoOrbibox";

const TEMAS = ["restaurante", "moda", "doceria", "arquitetura", "fitness"];

/** Só os temas usados na apresentação, com fotos reais do Inspire-se. */
export async function inspireParaApresentacao(): Promise<InspireParaApresentacao> {
  const tudo = await getInspirePhotos();
  const out: InspireParaApresentacao = {};
  for (const id of TEMAS) if (tudo[id]) out[id] = { photos: tudo[id].photos, titleStyle: tudo[id].titleStyle };
  return out;
}
