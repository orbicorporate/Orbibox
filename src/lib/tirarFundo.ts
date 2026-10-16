/**
 * Tira o fundo da foto de um prato (no navegador, sem enviar a imagem a nenhum
 * servidor de IA) e a coloca centralizada sobre um fundo claro neutro, num
 * quadrado, com uma pequena margem. O modelo é baixado na primeira vez.
 */
export const FUNDO_NEUTRO = "#F4F1EA";

/** Modelo e motor hospedados no próprio site (public/imgly), sem depender de CDN de terceiros. */
const CAMINHO_MODELO = () => `${window.location.origin}/imgly/`;

/** Já funcionou nesta sessão: o modelo está carregado e o limite de espera é menor. */
let modeloPronto = false;
/** Estourou o tempo uma vez: o resto da sessão segue sem tirar o fundo, em vez de travar de novo. */
let indisponivel = false;

export function fundoIndisponivel(): boolean {
  return indisponivel;
}

/** Baixa o modelo antes de precisar, para a primeira foto não esperar. Não faz nada se já deu certo ou falhou. */
export function prepararTirarFundo(aoProgresso?: (fracao: number) => void): void {
  if (modeloPronto || indisponivel || typeof window === "undefined") return;
  void import("@imgly/background-removal")
    .then((m) => m.preload({ model: "small", publicPath: CAMINHO_MODELO(), progress: progresso(aoProgresso) }))
    .then(() => { modeloPronto = true; })
    .catch(() => undefined);
}

/** Junta o andamento de vários arquivos (modelo, motor) numa fração única de 0 a 1. */
function progresso(aoProgresso?: (fracao: number) => void) {
  const itens = new Map<string, { a: number; t: number }>();
  let maior = 0;
  return (chave: string, atual: number, total: number) => {
    if (total > 0) itens.set(chave, { a: atual, t: total });
    let a = 0, t = 0;
    itens.forEach((v) => { a += v.a; t += v.t; });
    // Nunca volta para trás quando um arquivo novo entra na conta.
    if (t > 0) { maior = Math.max(maior, Math.min(1, a / t)); aoProgresso?.(maior); }
  };
}

export async function tirarFundo(origem: Blob, aoProgresso?: (fracao: number) => void, cor: string = FUNDO_NEUTRO): Promise<Blob> {
  if (indisponivel) throw new Error("tirar fundo indisponível");
  const { removeBackground } = await import("@imgly/background-removal");
  const limite = modeloPronto ? 45_000 : 150_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const espera = new Promise<never>((_, falha) => {
    timer = setTimeout(() => { indisponivel = true; falha(new Error("tempo esgotado")); }, limite);
  });
  let png: Blob;
  try {
    png = await Promise.race([
      removeBackground(origem, { model: "small", publicPath: CAMINHO_MODELO(), output: { format: "image/png" }, progress: progresso(aoProgresso) }),
      espera,
    ]);
    modeloPronto = true;
  } finally {
    if (timer) clearTimeout(timer);
  }
  const img = await carregar(png);
  const { w, h } = { w: img.naturalWidth, h: img.naturalHeight };

  // Caixa do que sobrou (pixels com alguma opacidade), para centralizar o prato.
  const leitura = document.createElement("canvas");
  leitura.width = w;
  leitura.height = h;
  const lc = leitura.getContext("2d", { willReadFrequently: true });
  if (!lc) throw new Error("canvas indisponível");
  lc.drawImage(img, 0, 0);
  const imagemDados = lc.getImageData(0, 0, w, h);
  limparIntrusos(imagemDados);
  lc.putImageData(imagemDados, 0, 0);
  const dados = imagemDados.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (dados[(y * w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("nada reconhecido");
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;

  const lado = 800;
  const margem = 0.1;
  const area = lado * (1 - margem * 2);
  const esc = Math.min(area / bw, area / bh);
  const dw = bw * esc;
  const dh = bh * esc;
  const saida = document.createElement("canvas");
  saida.width = lado;
  saida.height = lado;
  const sc = saida.getContext("2d");
  if (!sc) throw new Error("canvas indisponível");
  sc.fillStyle = cor;
  sc.fillRect(0, 0, lado, lado);
  sc.imageSmoothingQuality = "high";
  sc.drawImage(img, x0, y0, bw, bh, (lado - dw) / 2, (lado - dh) / 2, dw, dh);
  return await new Promise<Blob>((ok, falha) => saida.toBlob((b) => (b ? ok(b) : falha(new Error("falha ao gerar imagem"))), "image/jpeg", 0.9));
}

/**
 * Depois de tirar o fundo sobram coisas que não são o produto: o círculo do
 * preço, letras do nome, fragmentos de outros itens. Aqui o que sobrou é
 * separado em "ilhas" (pedaços conectados), fica o maior pedaço (o produto) e
 * o que for parte dele (perto e de tamanho relevante), e o resto é apagado.
 * Círculos de cor chapada (selos de preço) nunca ficam.
 */
export function limparIntrusos(img: ImageData): void {
  const { width: w, height: h, data } = img;
  const cel = Math.max(1, Math.ceil(Math.max(w, h) / 220));
  const gw = Math.ceil(w / cel);
  const gh = Math.ceil(h / cel);
  const cheia = new Uint8Array(gw * gh);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) cheia[Math.floor(y / cel) * gw + Math.floor(x / cel)] = 1;
    }
  }
  // Une frestas finas (canudo, fio de calda) dilatando 1 célula só para achar as ilhas.
  const larga = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!cheia[y * gw + x]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) larga[ny * gw + nx] = 1;
      }
    }
  }
  const rot = new Int32Array(gw * gh).fill(-1);
  type Ilha = { id: number; area: number; x0: number; y0: number; x1: number; y1: number; baldes: Map<number, number>; amostras: number };
  const ilhas: Ilha[] = [];
  for (let i = 0; i < gw * gh; i++) {
    if (!larga[i] || rot[i] !== -1) continue;
    const ilha: Ilha = { id: ilhas.length, area: 0, x0: gw, y0: gh, x1: -1, y1: -1, baldes: new Map(), amostras: 0 };
    const fila = [i];
    rot[i] = ilha.id;
    while (fila.length) {
      const c = fila.pop()!;
      const cx = c % gw, cy = Math.floor(c / gw);
      if (cheia[c]) {
        ilha.area++;
        if (cx < ilha.x0) ilha.x0 = cx;
        if (cx > ilha.x1) ilha.x1 = cx;
        if (cy < ilha.y0) ilha.y0 = cy;
        if (cy > ilha.y1) ilha.y1 = cy;
        const px = Math.min(w - 1, cx * cel + (cel >> 1));
        const py = Math.min(h - 1, cy * cel + (cel >> 1));
        const o = (py * w + px) * 4;
        if (data[o + 3] > 128) {
          const b = ((data[o] >> 5) << 6) | ((data[o + 1] >> 5) << 3) | (data[o + 2] >> 5);
          ilha.baldes.set(b, (ilha.baldes.get(b) ?? 0) + 1);
          ilha.amostras++;
        }
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const n = ny * gw + nx;
        if (larga[n] && rot[n] === -1) { rot[n] = ilha.id; fila.push(n); }
      }
    }
    ilhas.push(ilha);
  }
  if (ilhas.length < 2) return;

  const maior = ilhas.reduce((a, b) => (b.area > a.area ? b : a));
  const lado = Math.max(maior.x1 - maior.x0 + 1, maior.y1 - maior.y0 + 1);
  const ficam = new Set<number>([maior.id]);
  for (const il of ilhas) {
    if (il.id === maior.id) continue;
    const bw = il.x1 - il.x0 + 1, bh = il.y1 - il.y0 + 1;
    const encaixe = il.area / (bw * bh);
    const redondo = bw / bh > 0.82 && bw / bh < 1.22 && encaixe > 0.66 && encaixe < 0.9;
    const topo = il.amostras > 0 ? Math.max(...il.baldes.values()) / il.amostras : 0;
    const selo = redondo && topo > 0.6; // círculo de cor chapada: selo de preço
    const gapX = Math.max(0, il.x0 - maior.x1, maior.x0 - il.x1);
    const gapY = Math.max(0, il.y0 - maior.y1, maior.y0 - il.y1);
    const perto = Math.max(gapX, gapY) <= lado * 0.25;
    if (!selo && perto && il.area >= maior.area * 0.2) ficam.add(il.id);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (data[o + 3] === 0) continue;
      const r = rot[Math.floor(y / cel) * gw + Math.floor(x / cel)];
      if (r === -1 || !ficam.has(r)) data[o + 3] = 0;
    }
  }
}

function carregar(b: Blob): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const url = URL.createObjectURL(b);
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(url); ok(i); };
    i.onerror = () => { URL.revokeObjectURL(url); falha(new Error("imagem ilegível")); };
    i.src = url;
  });
}
