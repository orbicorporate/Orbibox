import type { ThemeBox } from "@/lib/vitrineThemes";

// Ritmo de tamanhos numa grade de 2 colunas que fecha todas as linhas, sem
// buraco: todo "alto" (2 linhas) vem sempre acompanhado de dois "medio" na
// coluna vizinha antes de qualquer box de 2 colunas. O padrão termina numa
// linha completa, então repetir é seguro.
export const SIZE_RHYTHM: ThemeBox["size"][] = [
  "destaque",
  "alto", "medio", "medio",
  "largo",
  "medio", "alto", "medio",
  "medio", "medio",
  "largo",
];

/** Gera o tamanho de cada foto seguindo o ritmo e conserta a cauda pra não
 * sobrar espaço vago no fim: (1) um "alto" final sem os dois "medio" que
 * fecham a coluna ao lado vira "medio"; (2) se a última linha ficar pela
 * metade, o último box vira "largo" e fecha a linha. Simula a colocação
 * automática da grade de 2 colunas (mesma regra do CSS) pra decidir. */
export function tamanhosSemBuraco(n: number): ThemeBox["size"][] {
  const sizes = Array.from({ length: n }, (_, i) => SIZE_RHYTHM[i % SIZE_RHYTHM.length]);
  const ultimoAlto = sizes.lastIndexOf("alto");
  if (ultimoAlto !== -1) {
    let ini = ultimoAlto;
    while (ini > 0 && sizes[ini - 1] === "medio") ini--;
    let fim = ultimoAlto;
    while (fim + 1 < n && sizes[fim + 1] === "medio") fim++;
    if (fim - ini < 2) sizes[ultimoAlto] = "medio";
  }
  const ocupado = new Set<string>();
  let r = 0, c = 0;
  for (const s of sizes) {
    const w = s === "destaque" || s === "largo" ? 2 : 1;
    const h = s === "alto" ? 2 : 1;
    let rr = r, cc = c;
    for (;;) {
      let livre = cc + w <= 2;
      if (livre) for (let dy = 0; dy < h && livre; dy++) for (let dx = 0; dx < w; dx++) if (ocupado.has(`${rr + dy},${cc + dx}`)) { livre = false; break; }
      if (livre) break;
      cc++;
      if (cc >= 2) { cc = 0; rr++; }
    }
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) ocupado.add(`${rr + dy},${cc + dx}`);
    r = rr; c = cc + w;
    if (c >= 2) { c = 0; r++; }
  }
  let linhas = 0;
  for (const k of ocupado) linhas = Math.max(linhas, Number(k.split(",")[0]) + 1);
  let temBuraco = false;
  for (let y = 0; y < linhas && !temBuraco; y++) for (let x = 0; x < 2; x++) if (!ocupado.has(`${y},${x}`)) { temBuraco = true; break; }
  if (temBuraco && n > 0 && sizes[n - 1] === "medio") sizes[n - 1] = "largo";
  return sizes;
}
