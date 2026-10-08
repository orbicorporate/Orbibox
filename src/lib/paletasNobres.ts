// Cores e paletas "nobres" pros cards da página: tons profundos, terrosos e
// metálicos, que combinam entre si e raramente ficam berrantes.

export const NOBRES: { nome: string; hex: string }[] = [
  { nome: "Marfim", hex: "#F1EDE4" },
  { nome: "Areia", hex: "#D9D4C7" },
  { nome: "Pedra", hex: "#B9B3A6" },
  { nome: "Champagne", hex: "#D8C8A0" },
  { nome: "Rosé", hex: "#C28E86" },
  { nome: "Dourado", hex: "#B08D3C" },
  { nome: "Cobre", hex: "#A8643A" },
  { nome: "Terracota", hex: "#A4502F" },
  { nome: "Bordô", hex: "#6E1F3A" },
  { nome: "Ameixa", hex: "#4A2A4F" },
  { nome: "Marinho", hex: "#1B2A4A" },
  { nome: "Petróleo", hex: "#0F4C5C" },
  { nome: "Esmeralda", hex: "#1F5E4B" },
  { nome: "Oliva", hex: "#4F5B3A" },
  { nome: "Grafite", hex: "#3A3F44" },
  { nome: "Carvão", hex: "#1C1F24" },
];

export type PaletaPronta = { id: string; nome: string; descricao: string; cores: string[] };

export const PALETAS_PRONTAS: PaletaPronta[] = [
  { id: "terra", nome: "Terra e brasa", descricao: "Quente, acolhedora", cores: ["#6B2D1A", "#A4502F", "#C28A4A", "#3B2A20", "#E3D3B8"] },
  { id: "bordo", nome: "Bordô clássico", descricao: "Elegante, tradicional", cores: ["#5A1F2E", "#7A2E3F", "#B76E79", "#2B1B20", "#EADBD3"] },
  { id: "floresta", nome: "Floresta", descricao: "Natural, sereno", cores: ["#2E4034", "#3F5B45", "#7A8B5C", "#1E2B24", "#DDE2D0"] },
  { id: "oceano", nome: "Oceano profundo", descricao: "Confiança, calma", cores: ["#14213D", "#0F4C5C", "#2F6F82", "#0B1626", "#D7E3E8"] },
  { id: "grafite", nome: "Grafite e ouro", descricao: "Sofisticado, moderno", cores: ["#1C1F24", "#3A3F44", "#B08D3C", "#8A6A2B", "#EDE6D3"] },
  { id: "champagne", nome: "Champagne", descricao: "Leve, premium", cores: ["#D8C8A0", "#C9B58A", "#8C7A55", "#4A3F2C", "#F4EFE6"] },
  { id: "rose", nome: "Rosé atelier", descricao: "Delicado, autoral", cores: ["#C28E86", "#A56B66", "#6E3F44", "#3A2427", "#F1E2DD"] },
  { id: "ameixa", nome: "Ameixa e prata", descricao: "Criativo, noturno", cores: ["#4A2A4F", "#6B4A73", "#9A8AA6", "#2A1A2E", "#E4DDE8"] },
  { id: "marmore", nome: "Mármore", descricao: "Neutro, atemporal", cores: ["#F1EDE4", "#D9D4C7", "#B9B3A6", "#5C6B73", "#3A3F44"] },
];

/** Reparte as cores de uma paleta entre os cards, repetindo em ciclo. */
export function distribuirCores(chaves: string[], cores: string[], deslocamento = 0): Record<string, string> {
  const out: Record<string, string> = {};
  if (cores.length === 0) return out;
  chaves.forEach((k, i) => { out[k] = cores[(i + deslocamento) % cores.length]; });
  return out;
}

function hexValido(h: unknown): h is string {
  return typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h.trim());
}

function luz(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/** Cores da marca guardadas no DNA da marca, sem os brancos (não pintam nada). */
export function coresDaMarca(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const lista = raw
    .map((c) => (c && typeof c === "object" ? (c as { hex?: unknown }).hex : null))
    .filter(hexValido)
    .map((h) => h.trim().toUpperCase());
  return Array.from(new Set(lista.filter((h) => luz(h) < 0.93))).slice(0, 6);
}

/** Tira as cores dominantes do logo (no navegador), ignorando fundo claro e transparente. */
export async function coresDoLogo(url: string): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((ok, erro) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => ok(i);
    i.onerror = () => erro(new Error("logo"));
    i.src = url;
  });
  const lado = 56;
  const c = document.createElement("canvas");
  c.width = lado;
  c.height = lado;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, lado, lado);
  const px = ctx.getImageData(0, 0, lado, lado).data;
  const baldes = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.93) continue;
    const chave = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const x = baldes.get(chave) ?? { n: 0, r: 0, g: 0, b: 0 };
    x.n++; x.r += r; x.g += g; x.b += b;
    baldes.set(chave, x);
  }
  const lista = [...baldes.values()].map((x) => {
    const r = Math.round(x.r / x.n), g = Math.round(x.g / x.n), b = Math.round(x.b / x.n);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    return { r, g, b, peso: x.n * (0.4 + sat) };
  }).sort((a, b) => b.peso - a.peso);
  const escolhidas: { r: number; g: number; b: number }[] = [];
  for (const cor of lista) {
    if (escolhidas.every((e) => Math.hypot(e.r - cor.r, e.g - cor.g, e.b - cor.b) > 60)) escolhidas.push(cor);
    if (escolhidas.length === 5) break;
  }
  return escolhidas.map(({ r, g, b }) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase());
}
