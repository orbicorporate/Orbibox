/**
 * Cores da marca que servem de fundo de card: primeiro as vivas (a cor que a
 * marca usa de verdade, como o vermelho ou o dourado), depois as bem escuras.
 * Branco, cinzas e tons apagados ficam de fora, porque viram card sem cara de marca.
 */
export function coresDosCards(paleta: string[]): string[] {
  const validas = paleta.filter((h) => /^#[0-9a-f]{6}$/i.test(h));
  const info = validas.map((hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    return { hex, l, s };
  });
  const vivas = info.filter((c) => c.s >= 0.25 && c.l >= 0.15 && c.l <= 0.85).sort((a, b) => b.s - a.s).map((c) => c.hex);
  const escuras = info.filter((c) => c.l < 0.15).map((c) => c.hex);
  const lista = [...vivas, ...escuras];
  return lista.length > 0 ? lista : validas.length > 0 ? validas : ["#111318"];
}
