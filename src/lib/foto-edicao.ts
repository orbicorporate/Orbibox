/**
 * Edição de foto no próprio aparelho: luz, contraste, sombras, realces, cor,
 * calor, nitidez e vinheta. Tudo direto nos pixels (não depende de ctx.filter,
 * que falha em alguns celulares), com o mesmo cálculo na prévia e no arquivo final.
 */

export type Ajustes = {
  luz: number;
  contraste: number;
  sombras: number;
  realces: number;
  cor: number;
  calor: number;
  nitidez: number;
  vinheta: number;
};

export const ZERO: Ajustes = { luz: 0, contraste: 0, sombras: 0, realces: 0, cor: 0, calor: 0, nitidez: 0, vinheta: 0 };

export type GrupoAjuste = "luz" | "cor" | "efeitos";

export const GRUPOS: { id: GrupoAjuste; rotulo: string; controles: { chave: keyof Ajustes; rotulo: string; min: number; max: number }[] }[] = [
  {
    id: "luz",
    rotulo: "Luz",
    controles: [
      { chave: "luz", rotulo: "Luz", min: -100, max: 100 },
      { chave: "contraste", rotulo: "Contraste", min: -100, max: 100 },
      { chave: "sombras", rotulo: "Sombras", min: -100, max: 100 },
      { chave: "realces", rotulo: "Realces", min: -100, max: 100 },
    ],
  },
  {
    id: "cor",
    rotulo: "Cor",
    controles: [
      { chave: "cor", rotulo: "Cor", min: -100, max: 100 },
      { chave: "calor", rotulo: "Calor", min: -100, max: 100 },
    ],
  },
  {
    id: "efeitos",
    rotulo: "Detalhe",
    controles: [
      { chave: "nitidez", rotulo: "Nitidez", min: 0, max: 100 },
      { chave: "vinheta", rotulo: "Vinheta", min: -100, max: 100 },
    ],
  },
];

export const PREDEFINIDOS: { rotulo: string; valores: Partial<Ajustes> }[] = [
  { rotulo: "Clarear", valores: { luz: 14, sombras: 40, realces: -10, contraste: 6, cor: 6 } },
  { rotulo: "Mais vivo", valores: { contraste: 20, cor: 30, sombras: 12, realces: -10, nitidez: 25 } },
  { rotulo: "Aconchegante", valores: { calor: 32, luz: 6, cor: 12, sombras: 18, vinheta: 18 } },
  { rotulo: "Preto e branco", valores: { cor: -100, contraste: 20, nitidez: 20 } },
];

export function temAjustes(a: Ajustes): boolean {
  return (Object.keys(ZERO) as (keyof Ajustes)[]).some((k) => a[k] !== 0);
}

const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Aplica os ajustes em um ImageData (muda o próprio objeto). */
export function aplicarAjustes(dados: ImageData, a: Ajustes) {
  const d = dados.data;
  const w = dados.width;
  const h = dados.height;

  const ganho = Math.pow(2, (a.luz / 100) * 1.1);
  const ctr = 1 + (a.contraste / 100) * 0.85;
  const sh = (a.sombras / 100) * 0.4;
  const hl = (a.realces / 100) * 0.34;
  const sat = a.cor < 0 ? 1 + a.cor / 100 : 1 + (a.cor / 100) * 0.7;
  const vib = a.cor > 0 ? a.cor / 100 : 0;
  const calor = (a.calor / 100) * 0.09;
  const vig = a.vinheta / 100;
  const cx = w / 2;
  const cy = h / 2;
  const maxd = Math.hypot(cx, cy) || 1;

  const simples = a.luz === 0 && a.contraste === 0 && a.sombras === 0 && a.realces === 0 && a.cor === 0 && a.calor === 0 && vig === 0;

  if (!simples) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        let r = (d[i] / 255) * ganho;
        let g = (d[i + 1] / 255) * ganho;
        let b = (d[i + 2] / 255) * ganho;

        // Sombras mexem nos tons escuros, realces nos claros.
        const lum = c01(0.299 * r + 0.587 * g + 0.114 * b);
        let ws = c01(1 - lum * 2);
        ws *= ws;
        let wh = c01(lum * 2 - 1);
        wh *= wh;
        const delta = sh * ws + hl * wh;
        r += delta;
        g += delta;
        b += delta;

        r = 0.5 + (r - 0.5) * ctr;
        g = 0.5 + (g - 0.5) * ctr;
        b = 0.5 + (b - 0.5) * ctr;

        r += calor;
        b -= calor;

        const lm = 0.299 * r + 0.587 * g + 0.114 * b;
        let s = sat;
        if (vib > 0) {
          const mx = Math.max(r, g, b);
          const mn = Math.min(r, g, b);
          const s0 = c01((mx - mn) / (mx + 0.0001));
          s += vib * (1 - s0) * 0.6;
        }
        r = lm + (r - lm) * s;
        g = lm + (g - lm) * s;
        b = lm + (b - lm) * s;

        if (vig !== 0) {
          const f = Math.hypot(x - cx, y - cy) / maxd;
          const m = 1 - vig * f * f * 0.9;
          r *= m;
          g *= m;
          b *= m;
        }

        d[i] = c01(r) * 255;
        d[i + 1] = c01(g) * 255;
        d[i + 2] = c01(b) * 255;
      }
    }
  }

  if (a.nitidez > 0) afinar(dados, (a.nitidez / 100) * 1.3);
}

/** Máscara de nitidez simples (desfoque 3x3 subtraído). */
function afinar(dados: ImageData, quantidade: number) {
  const d = dados.data;
  const w = dados.width;
  const h = dados.height;
  const orig = new Uint8ClampedArray(d);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const k = i + c;
        const soma =
          orig[k - w * 4 - 4] + orig[k - w * 4] + orig[k - w * 4 + 4] +
          orig[k - 4] + orig[k] + orig[k + 4] +
          orig[k + w * 4 - 4] + orig[k + w * 4] + orig[k + w * 4 + 4];
        const v = orig[k] + quantidade * (orig[k] - soma / 9);
        d[k] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }
}

/** Abre a foto (inclusive de outro endereço) como imagem pronta para desenhar. */
export async function carregarImagem(url: string): Promise<HTMLImageElement> {
  const blob = await (await fetch(url)).blob();
  const objeto = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = objeto;
    await img.decode();
    return img;
  } finally {
    // A imagem já foi decodificada, o endereço temporário pode ir embora.
    setTimeout(() => URL.revokeObjectURL(objeto), 5000);
  }
}

export function desenharEmEscala(img: HTMLImageElement, max: number): HTMLCanvasElement {
  const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * escala));
  c.height = Math.max(1, Math.round(img.naturalHeight * escala));
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** Gera o arquivo final já com os ajustes (WebP quando o aparelho deixa, senão JPEG). */
export async function exportarAjustada(url: string, a: Ajustes, opcoes?: { max?: number; tipo?: string }): Promise<Blob> {
  const img = await carregarImagem(url);
  const c = desenharEmEscala(img, opcoes?.max ?? 2400);
  const ctx = c.getContext("2d")!;
  const dados = ctx.getImageData(0, 0, c.width, c.height);
  aplicarAjustes(dados, a);
  ctx.putImageData(dados, 0, 0);
  const paraBlob = (tipo: string, q: number) => new Promise<Blob | null>((ok) => c.toBlob(ok, tipo, q));
  if (opcoes?.tipo === "image/webp" || !opcoes?.tipo) {
    const webp = await paraBlob("image/webp", 0.88);
    if (webp && webp.type === "image/webp") return webp;
  }
  const jpg = await paraBlob("image/jpeg", 0.92);
  if (!jpg) throw new Error("Não consegui salvar a foto.");
  return jpg;
}
