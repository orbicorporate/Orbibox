"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { addToLogoGallery, parseLogoGallery } from "@/lib/logoGallery";
import { ESFERAS, OrbiAvatar, lerEsfera, lerLogoEscala, lerSemFundo, type TomEsfera } from "@/components/orbi/OrbiAvatar";

type Estilo = "logo" | "sem-fundo" | `esfera-${TomEsfera}`;

const LADO = 800;

/** Menor e maior tamanho do logo, em %, para cada estilo. */
function limitesEscala(e: Estilo): [number, number] {
  return e === "logo" ? [60, 160] : e === "sem-fundo" ? [50, 160] : [50, 130];
}

/** Toque na prévia de retoque, em fração da largura e da altura (0 a 1). */
type Toque = { x: number; y: number };
/** Quantos pixels em volta do que foi apagado ainda ganham transparência gradual. */
const BANDA = 3;

/** Desenha a imagem num quadrado transparente (sem cortar nada) e devolve os pixels. */
function imagemParaCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const maior = Math.max(img.naturalWidth, img.naturalHeight) || 1;
  const escala = Math.min(1, LADO / maior);
  const w = Math.round(img.naturalWidth * escala);
  const h = Math.round(img.naturalHeight * escala);
  const lado = Math.max(w, h);
  const c = document.createElement("canvas");
  c.width = lado;
  c.height = lado;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, Math.round((lado - w) / 2), Math.round((lado - h) / 2), w, h);
  return c;
}

/** Corta as margens transparentes em volta do desenho, para o logo ocupar a esfera. */
function aparar(origem: HTMLCanvasElement, margem = 0.02): HTMLCanvasElement {
  const w = origem.width, h = origem.height;
  const px = origem.getContext("2d")!.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return origem;
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * margem);
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
  const c = document.createElement("canvas");
  c.width = x1 - x0 + 1;
  c.height = y1 - y0 + 1;
  c.getContext("2d")!.drawImage(origem, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

/**
 * Tira o fundo liso e deixa o logo solto na página: parte das bordas e apaga o que se parece com a
 * cor do fundo (média dos cantos), parando nos traços do desenho. As bordas
 * ganham transparência gradual pra não ficar serrilhado.
 */
function removerFundo(entrada: HTMLCanvasElement, tolerancia: number, toques: Toque[] = []): HTMLCanvasElement {
  // Se a imagem já tem margem transparente em volta de um retângulo de fundo, corta até o desenho.
  const origem = aparar(entrada, 0);
  const w = origem.width;
  const h = origem.height;
  const total = w * h;
  const saida = document.createElement("canvas");
  saida.width = w;
  saida.height = h;
  const ctx = saida.getContext("2d")!;
  ctx.drawImage(origem, 0, 0);
  const dados = ctx.getImageData(0, 0, w, h);
  const px = dados.data;

  // Cor do fundo: média dos pixels opacos nos quatro cantos.
  let r = 0, g = 0, b = 0, n = 0;
  for (const [x0, y0] of [[0, 0], [w - 4, 0], [0, h - 4], [w - 4, h - 4]]) {
    for (let y = y0; y < y0 + 4; y++) for (let x = x0; x < x0 + 4; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] > 200) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
    }
  }
  if (n === 0) return saida; // já é transparente nas bordas
  r /= n; g /= n; b /= n;

  // Distância de cada pixel até a cor do fundo, calculada uma vez só.
  const dist = new Float32Array(total);
  for (let p = 0; p < total; p++) {
    const i = p * 4;
    const dr = px[i] - r, dg = px[i + 1] - g, db = px[i + 2] - b;
    dist[p] = Math.sqrt(dr * dr + dg * dg + db * db);
  }
  const limite = tolerancia * 4.4; // 0 a 100 vira 0 a ~440 (máximo do RGB)
  // Miolos fechados (dentro de letras e laços) são mais difíceis: o antisserrilhado deixa um tom claro, não o fundo exato.
  const limiteBolsao = limite * 1.3;

  const apagado = new Uint8Array(total);
  const fila = new Int32Array(total);

  // Preenche a partir de `sementes`, andando só por vizinhos que passam em `ok`. Devolve quantos pixels pegou (ficam em fila[0..n)).
  const espalhar = (sementes: number[], ok: (p: number) => boolean, marca: Uint8Array, teto = total): number => {
    let fim = 0;
    for (const s0 of sementes) if (!marca[s0] && ok(s0)) { marca[s0] = 1; fila[fim++] = s0; }
    for (let ini = 0; ini < fim && fim <= teto; ini++) {
      const q = fila[ini];
      const x = q % w;
      if (x > 0) { const t = q - 1; if (!marca[t] && ok(t)) { marca[t] = 1; fila[fim++] = t; } }
      if (x < w - 1) { const t = q + 1; if (!marca[t] && ok(t)) { marca[t] = 1; fila[fim++] = t; } }
      if (q >= w) { const t = q - w; if (!marca[t] && ok(t)) { marca[t] = 1; fila[fim++] = t; } }
      if (q < total - w) { const t = q + w; if (!marca[t] && ok(t)) { marca[t] = 1; fila[fim++] = t; } }
    }
    return fim;
  };

  // Fundo ligado às bordas.
  const bordas: number[] = [];
  for (let x = 0; x < w; x++) { bordas.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { bordas.push(y * w, y * w + w - 1); }
  espalhar(bordas, (p) => dist[p] <= limite, apagado);

  // Bolsões fechados da cor do fundo (dentro de letras, buracos do desenho): somem se forem pequenos.
  const visto = new Uint8Array(total);
  const maxBolsao = total * 0.04;
  for (let s0 = 0; s0 < total; s0++) {
    if (apagado[s0] || visto[s0] || dist[s0] > limiteBolsao) continue;
    // Percorre o bolsão inteiro (marca tudo como visto), pra não recomeçar do mesmo lugar.
    const cont = espalhar([s0], (p) => !apagado[p] && dist[p] <= limiteBolsao, visto);
    if (cont <= maxBolsao) for (let k = 0; k < cont; k++) apagado[fila[k]] = 1;
  }

  // Retoque manual: cada toque apaga a mancha ligada de cor parecida com o ponto tocado.
  for (const t of toques) {
    const tx = Math.min(w - 1, Math.max(0, Math.round(t.x * (w - 1))));
    const ty = Math.min(h - 1, Math.max(0, Math.round(t.y * (h - 1))));
    const p0 = ty * w + tx;
    if (apagado[p0]) continue;
    const cr = px[p0 * 4], cg = px[p0 * 4 + 1], cb = px[p0 * 4 + 2];
    const lim = Math.max(limite * 0.55, 28);
    const parecido = (q: number) => {
      const i = q * 4;
      const dr = px[i] - cr, dg = px[i + 1] - cg, db = px[i + 2] - cb;
      return Math.sqrt(dr * dr + dg * dg + db * db) <= lim;
    };
    const cont = espalhar([p0], (q) => !apagado[q] && parecido(q), new Uint8Array(total), total * 0.25);
    for (let k = 0; k < cont; k++) apagado[fila[k]] = 1;
  }

  // Faixa de BANDA pixels em volta do apagado: é onde sobra o halo claro da borda do desenho.
  const nivel = new Uint8Array(total);
  let atual: number[] = [];
  for (let p = 0; p < total; p++) {
    if (apagado[p]) continue;
    const x = p % w;
    if ((x > 0 && apagado[p - 1]) || (x < w - 1 && apagado[p + 1]) || (p >= w && apagado[p - w]) || (p < total - w && apagado[p + w])) { nivel[p] = 1; atual.push(p); }
  }
  for (let k = 2; k <= BANDA; k++) {
    const prox: number[] = [];
    for (const q of atual) {
      const x = q % w;
      const viz = [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, q >= w ? q - w : -1, q < total - w ? q + w : -1];
      for (const v of viz) if (v >= 0 && !apagado[v] && !nivel[v]) { nivel[v] = k; prox.push(v); }
    }
    atual = prox;
  }

  for (let p = 0; p < total; p++) {
    const i = p * 4;
    if (apagado[p]) { px[i + 3] = 0; continue; }
    if (nivel[p] === 0) continue;
    // Perto do apagado: cor parecida com o fundo vira meio transparente, tirando o resto de branco da cor.
    const d = dist[p];
    if (d < limite * 1.8) {
      const a = Math.min(1, Math.max(0, (d - limite * 0.6) / (limite * 1.2)));
      if (a > 0.04) {
        px[i] = Math.max(0, Math.min(255, (px[i] - r * (1 - a)) / a));
        px[i + 1] = Math.max(0, Math.min(255, (px[i + 1] - g * (1 - a)) / a));
        px[i + 2] = Math.max(0, Math.min(255, (px[i + 2] - b * (1 - a)) / a));
      }
      px[i + 3] = Math.round(px[i + 3] * a);
    }
  }
  ctx.putImageData(dados, 0, 0);
  return saida;
}

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error("imagem"));
    img.src = src;
  });
}

/**
 * Editor do logotipo direto na página: trocar a imagem e tirar o fundo
 * (deixa transparente). Só aparece pro dono, no modo de edição.
 */
export function LogoEditor({
  businessId,
  logoUrl,
  avatar = null,
  onClose,
  onSaved,
}: {
  businessId: string;
  logoUrl: string | null;
  /** Valor atual de businesses.hero_avatar. */
  avatar?: string | null;
  onClose: () => void;
  onSaved: (url: string, avatar: string | null) => void;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [base, setBase] = useState<HTMLCanvasElement | null>(null); // imagem sem alteração
  const [resultado, setResultado] = useState<HTMLCanvasElement | null>(null); // com fundo removido
  const [tolerancia, setTolerancia] = useState(28);
  const [toques, setToques] = useState<Toque[]>([]);
  const [semFundo, setSemFundo] = useState(false);
  const [carregando, setCarregando] = useState(!!logoUrl);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [trocou, setTrocou] = useState(false);
  const esferaAtual = lerEsfera(avatar);
  const soltoAtual = lerSemFundo(avatar);
  const estiloInicial: Estilo = soltoAtual ? "sem-fundo" : esferaAtual ? (`esfera-${esferaAtual.tom}` as Estilo) : "logo";
  const escalaInicial = esferaAtual?.escala ?? soltoAtual?.escala ?? lerLogoEscala(avatar) ?? 100;
  const [estilo, setEstilo] = useState<Estilo>(estiloInicial);
  const [escala, setEscala] = useState(escalaInicial);

  const ultimaEsfera = useRef<Estilo>("esfera-claro");
  const [autoLigou, setAutoLigou] = useState(false);
  function escolherEstilo(e: Estilo) {
    if (e.startsWith("esfera")) ultimaEsfera.current = e;
    setEstilo(e);
    const [min, max] = limitesEscala(e);
    setEscala((v) => Math.min(max, Math.max(min, v)));
    // Solto e esfera ficam por cima da página ou de um disco: o fundo do arquivo atrapalharia, então já tira.
    if (e !== "logo" && !semFundo) { setSemFundo(true); setAutoLigou(true); }
  }

  useEffect(() => {
    if (!logoUrl) return;
    let vivo = true;
    carregar(logoUrl)
      .then((img) => { if (vivo) { setBase(imagemParaCanvas(img)); setCarregando(false); } })
      .catch(() => { if (vivo) { setErro("Não consegui abrir o logo atual. Envie uma imagem nova."); setCarregando(false); } });
    return () => { vivo = false; };
  }, [logoUrl]);

  // Refaz o recorte quando muda a intensidade (com um respiro pra não travar o slider).
  useEffect(() => {
    if (!base || !semFundo) return;
    const t = setTimeout(() => setResultado(removerFundo(base, tolerancia, toques)), 120);
    return () => clearTimeout(t);
  }, [base, semFundo, tolerancia, toques]);

  const semMargem = useMemo(() => (semFundo && resultado && estilo !== "logo" ? aparar(resultado) : null), [semFundo, resultado, estilo]);
  const atual = semMargem ?? (semFundo && resultado ? resultado : base);

  // Imagem atual como endereço, pra mostrar a esfera de verdade na prévia.
  const urlRetoque = useMemo(() => (semFundo && resultado ? resultado.toDataURL("image/png") : null), [semFundo, resultado]);
  const urlPrevia = useMemo(() => (atual ? atual.toDataURL("image/png") : null), [atual]);

  const escolherArquivo = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setErro("Imagem muito grande, o limite é 20 MB."); return; }
    setErro(null);
    setCarregando(true);
    const url = URL.createObjectURL(file);
    try {
      const img = await carregar(url);
      setBase(imagemParaCanvas(img));
      setSemFundo(false);
      setResultado(null);
      setToques([]);
      setTrocou(true);
    } catch {
      setErro("Não consegui abrir essa imagem.");
    } finally {
      URL.revokeObjectURL(url);
      setCarregando(false);
    }
  }, []);

  async function salvar() {
    if (!atual || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      let url = logoUrl;
      // Só envia imagem nova quando a imagem mudou (trocou o arquivo ou tirou o fundo).
      if (trocou || semFundo || !url) {
        const blob: Blob | null = await new Promise((ok) => atual.toBlob(ok, "image/png"));
        if (!blob) throw new Error("blob");
        const path = `${businessId}/logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        const { error: upErr } = await supabase.storage.from("box-images").upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: "image/png" });
        if (upErr) throw upErr;
        url = supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl;
      }
      // Esfera clara ou escura guarda o estilo em hero_avatar; voltar ao logo simples só mexe se já era esfera.
      const novoAvatar: string | null =
        estilo === "sem-fundo" ? `sem-fundo-${escala}`
        : estilo !== "logo" ? `${estilo}-${escala}`
        : escala !== 100 ? `logo-${escala}`
        : estiloInicial !== "logo" || /^logo-\d+$/.test(avatar ?? "") ? "logo"
        : avatar;
      const campos: { logo_url: string; hero_avatar?: string | null } = { logo_url: url! };
      if (novoAvatar !== avatar) campos.hero_avatar = novoAvatar;
      const { error } = await supabase.from("businesses").update(campos).eq("id", businessId);
      if (error) throw error;
      if (url !== logoUrl) {
        const { data } = await supabase.from("businesses").select("logo_gallery").eq("id", businessId).maybeSingle();
        await addToLogoGallery(supabase, businessId, parseLogoGallery(data?.logo_gallery), url!);
      }
      onSaved(url!, novoAvatar);
    } catch {
      setErro("Não consegui salvar o logo. Tente de novo.");
      setSalvando(false);
    }
  }

  const mudou = trocou || semFundo || estilo !== estiloInicial || escala !== escalaInicial;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/45" onClick={() => !salvando && onClose()}>
      <div className="mx-auto max-h-[94dvh] w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-t-[28px] bg-surface-white px-5 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-divider" />
        <p className="text-center font-[family-name:var(--font-manrope)] text-[18px] font-medium">Logo da sua página</p>

        <div className="mx-auto mt-4 flex h-[210px] w-full items-center justify-center">
          {carregando ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-black/15 border-t-on-background" />
          ) : !urlPrevia ? (
            <span className="px-6 text-center text-[13px] text-text-tertiary">Ainda sem logo. Envie uma imagem.</span>
          ) : estilo === "sem-fundo" ? (
            <div
              className="flex h-[200px] w-[200px] items-center justify-center overflow-hidden rounded-3xl p-3 ring-1 ring-black/10"
              style={{ backgroundColor: "#fff", backgroundImage: "conic-gradient(#E9E9E4 25%, #fff 0 50%, #E9E9E4 0 75%, #fff 0)", backgroundSize: "20px 20px" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urlPrevia} alt="" className="h-full w-full object-contain" style={{ transform: `scale(${escala / 100})` }} />
            </div>
          ) : (
            <OrbiAvatar logoUrl={urlPrevia} size={150} esfera={estilo === "logo" ? undefined : (estilo.slice(7) as TomEsfera)} escala={escala} />
          )}
        </div>
        {urlPrevia && !carregando && (
          <p className="mt-1 text-center text-[12px] text-text-tertiary">{estilo === "sem-fundo" ? "Prévia. O quadriculado é a parte transparente." : "Prévia de como fica na sua página."}</p>
        )}

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { escolherArquivo(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={salvando} className="mt-4 w-full rounded-full bg-surface-soft py-3 text-[14px] font-medium">
          {base ? "Trocar imagem" : "Enviar logo"}
        </button>

        {base && (
          <div className="mt-3 rounded-2xl border border-divider p-4">
            <p className="text-[14px] font-medium">1. Estilo</p>
            <div role="radiogroup" aria-label="Estilo do logo" className="mt-3 flex flex-wrap gap-2">
              {([["logo", "Logo simples"], ["sem-fundo", "Sem fundo"], ["esfera", "Esfera"]] as const).map(([v, t]) => {
                const ativo = v === "esfera" ? estilo.startsWith("esfera") : estilo === v;
                return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => escolherEstilo(v === "esfera" ? (estilo.startsWith("esfera") ? estilo : ultimaEsfera.current) : v)}
                  disabled={salvando}
                  className={`min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${ativo ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
                >
                  {t}
                </button>
                );
              })}
            </div>
            <p className="mt-2 text-[12.5px] text-text-tertiary">
              {estilo === "logo" ? "A imagem preenche um círculo com anel de luz girando." : estilo === "sem-fundo" ? "Só o desenho do logo, solto na página, sem círculo." : "O logo sobre um disco colorido com luz de vidro."}
            </p>
            {estilo.startsWith("esfera") && (
              <div className="mt-4">
                <p className="text-[12.5px] text-text-tertiary">Cor da esfera: {ESFERAS.find((e) => `esfera-${e.id}` === estilo)?.nome}</p>
                <div role="radiogroup" aria-label="Cor da esfera" className="mt-2 flex flex-wrap gap-2.5">
                  {ESFERAS.map((e) => {
                    const sel = estilo === `esfera-${e.id}`;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        role="radio"
                        aria-checked={sel}
                        aria-label={e.nome}
                        title={e.nome}
                        onClick={() => escolherEstilo(`esfera-${e.id}`)}
                        disabled={salvando}
                        className={`h-9 w-9 rounded-full ring-offset-2 transition active:scale-95 ${sel ? "ring-2 ring-on-background" : "ring-1 ring-black/10"}`}
                        style={{ background: `radial-gradient(circle at 35% 25%, ${e.de}, ${e.ate} 74%)` }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {base && (
          <div className="mt-3 rounded-2xl border border-divider p-4">
            <div className="flex items-center justify-between text-[14px] font-medium">
              <label htmlFor="logo-tamanho">2. Tamanho do logo</label>
              <span className="tabular-nums text-text-tertiary">{escala}%</span>
            </div>
            <input id="logo-tamanho" type="range" min={limitesEscala(estilo)[0]} max={limitesEscala(estilo)[1]} step={5} value={escala} onChange={(e) => setEscala(Number(e.target.value))} disabled={salvando} className="mt-1 h-8 w-full accent-[#14161A]" />
            <p className="text-[12.5px] text-text-tertiary">Arraste para a direita para aumentar o logo, para a esquerda para diminuir.</p>
          </div>
        )}

        {base && (
          <div className="mt-3 rounded-2xl border border-divider p-4">
            <button type="button" role="switch" aria-checked={semFundo} onClick={() => { setSemFundo((v) => !v); setAutoLigou(false); }} disabled={salvando} className="flex w-full items-center justify-between gap-3 text-left">
              <span>
                <span className="block text-[14px] font-medium">3. Remover o fundo da imagem</span>
                <span className="block text-[12.5px] text-text-tertiary">Apaga a cor lisa em volta do desenho, como o branco. A prévia acima mostra o resultado.</span>
              </span>
              <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${semFundo ? "bg-on-background" : "bg-divider"}`}>
                <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${semFundo ? "translate-x-5" : ""}`} />
              </span>
            </button>
            {semFundo && autoLigou && <p className="mt-2 rounded-xl bg-surface-soft px-3 py-2 text-[12.5px] text-text-secondary">Ligado automaticamente, porque esse estilo precisa do logo sem fundo.</p>}
            {semFundo && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[13px] font-medium">
                  <label htmlFor="logo-limpeza">Quanto fundo remover</label>
                </div>
                <input id="logo-limpeza" type="range" min={5} max={70} value={tolerancia} onChange={(e) => setTolerancia(Number(e.target.value))} className="mt-1 w-full accent-[#111318]" />
                <div className="flex justify-between text-[12px] text-text-tertiary"><span>Menos</span><span>Mais</span></div>
                <p className="mt-1 text-[12px] text-text-tertiary">Sobrou fundo em volta? Vá para Mais. Começou a apagar o desenho? Volte para Menos.</p>
                {urlRetoque && (
                  <div className="mt-4 border-t border-divider pt-4">
                    <p className="text-[13px] font-medium">Retocar</p>
                    <p className="mt-0.5 text-[12px] text-text-tertiary">Ficou fundo dentro de uma letra ou num canto? Toque nele para apagar.</p>
                    <div
                      className="relative mt-2 w-full max-w-[320px] overflow-hidden rounded-2xl ring-1 ring-black/10"
                      style={{ backgroundColor: "#fff", backgroundImage: "conic-gradient(#E9E9E4 25%, #fff 0 50%, #E9E9E4 0 75%, #fff 0)", backgroundSize: "16px 16px" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urlRetoque}
                        alt="Logo com fundo transparente. Toque numa parte para apagar."
                        draggable={false}
                        className="block h-auto w-full cursor-crosshair select-none"
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setToques((t) => [...t, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }]);
                        }}
                      />
                    </div>
                    {toques.length > 0 && (
                      <button type="button" onClick={() => setToques((t) => t.slice(0, -1))} className="mt-2 min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary">
                        Desfazer último toque ({toques.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {erro && <p role="alert" className="mt-3 text-[13px] text-red-600">{erro}</p>}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} disabled={salvando} className="flex-1 rounded-full border border-divider py-3 text-[14px] font-medium">Cancelar</button>
          <button type="button" onClick={salvar} disabled={salvando || !atual || !mudou} className="flex-1 rounded-full bg-button-primary py-3 text-[14px] font-medium text-white disabled:opacity-40">
            {salvando ? "Salvando…" : "Salvar logo"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
