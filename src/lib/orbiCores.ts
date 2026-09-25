/**
 * Escolhe as cores da esfera da Orbi a partir da paleta da marca: as mais
 * vivas (saturadas) e com luminosidade média, que aparecem bem como
 * partículas. Fundos quase brancos e pretos puros ficam de fora. Devolve null
 * quando a paleta não tem cor viva suficiente (aí fica o degradê padrão).
 */
function hsl(hex: string): { s: number; l: number } | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}

export function coresDaOrbi(paleta: { hex: string }[] | null | undefined): string[] | null {
  const candidatas = (paleta ?? [])
    .map((c) => ({ hex: c.hex, v: hsl(c.hex) }))
    .filter((c): c is { hex: string; v: { s: number; l: number } } => !!c.v && c.v.l > 0.12 && c.v.l < 0.86)
    // Nota: saturação pesa mais; luminosidade perto do meio ajuda.
    .map((c) => ({ ...c, nota: c.v.s * 1.4 - Math.abs(c.v.l - 0.5) }))
    .sort((a, b) => b.nota - a.nota);
  const vivas = candidatas.filter((c) => c.v.s > 0.18);
  if (vivas.length === 0) return null;
  if (vivas.length === 1) {
    // Uma cor só: usa ela com uma versão mais escura/mais clara pra dar volume.
    const escura = candidatas.find((c) => c.hex !== vivas[0].hex) ?? vivas[0];
    return [vivas[0].hex, escura.hex];
  }
  return vivas.slice(0, 3).map((c) => c.hex);
}
