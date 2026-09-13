// Estilo do fundo da tela inicial. Fonte única de verdade pro CSS, usada no
// editor (prévia) e na página pública, pra ficarem idênticos.

export type HeroStyle = "brilho" | "degrade" | "meio" | "cheio";

export const HERO_STYLES: { id: HeroStyle; label: string; desc: string }[] = [
  { id: "brilho", label: "Brilho", desc: "Sutil, um glow atrás do avatar" },
  { id: "degrade", label: "Degradê", desc: "As duas cores fluindo" },
  { id: "meio", label: "Meio a meio", desc: "Metade de cada cor" },
  { id: "cheio", label: "Cheio", desc: "Uma cor sólida" },
];

/** Retorna o valor de `background` (CSS) pro fundo, conforme o estilo.
 * `c1`/`c2` são as duas cores do hero_gradient. */
export function heroBackground(style: string | null | undefined, c1: string, c2: string): string {
  switch (style) {
    case "cheio":
      return c1;
    case "meio":
      // Metade de cada cor, transição curta no meio.
      return `linear-gradient(180deg, ${c1} 0%, ${c1} 48%, ${c2} 52%, ${c2} 100%)`;
    case "degrade":
      return `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)`;
    case "brilho":
    default:
      // Fundo claro da página + glow suave na parte de baixo (comportamento
      // atual). As cores entram com transparência.
      return `radial-gradient(circle at 50% 115%, ${c1}CC, ${c2}66 45%, transparent 72%)`;
  }
}

// Estilos "cheios" (cheio/meio/degradê) cobrem a tela toda com cor forte, então
// pedem um véu claro por cima pra a Orbi e os textos escuros continuarem
// legíveis. O "brilho" não precisa (já é sutil sobre fundo claro).
export function heroPrecisaVeu(style: string | null | undefined): boolean {
  return style === "cheio" || style === "meio" || style === "degrade";
}
