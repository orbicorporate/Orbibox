"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { addToLogoGallery, parseLogoGallery } from "@/lib/logoGallery";
import { OrbiAvatar, lerEsfera } from "@/components/orbi/OrbiAvatar";

type Estilo = "logo" | "esfera-claro" | "esfera-escuro";

const LADO = 800;

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
function aparar(origem: HTMLCanvasElement): HTMLCanvasElement {
  const w = origem.width, h = origem.height;
  const px = origem.getContext("2d")!.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return origem;
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
  const c = document.createElement("canvas");
  c.width = x1 - x0 + 1;
  c.height = y1 - y0 + 1;
  c.getContext("2d")!.drawImage(origem, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
}

/**
 * Tira o fundo liso do logo: parte das bordas e apaga o que se parece com a
 * cor do fundo (média dos cantos), parando nos traços do desenho. As bordas
 * ganham transparência gradual pra não ficar serrilhado.
 */
function removerFundo(origem: HTMLCanvasElement, tolerancia: number): HTMLCanvasElement {
  const w = origem.width;
  const h = origem.height;
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

  const dist = (i: number) => Math.sqrt((px[i] - r) ** 2 + (px[i + 1] - g) ** 2 + (px[i + 2] - b) ** 2);
  const limite = tolerancia * 4.4; // 0 a 100 vira 0 a ~440 (máximo do RGB)
  const visitado = new Uint8Array(w * h);
  const fila: number[] = [];
  const empurrar = (x: number, y: number) => {
    const p = y * w + x;
    if (visitado[p]) return;
    visitado[p] = 1;
    if (dist(p * 4) <= limite) fila.push(p);
  };
  for (let x = 0; x < w; x++) { empurrar(x, 0); empurrar(x, h - 1); }
  for (let y = 0; y < h; y++) { empurrar(0, y); empurrar(w - 1, y); }

  const apagado = new Uint8Array(w * h);
  while (fila.length) {
    const p = fila.pop()!;
    apagado[p] = 1;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) empurrar(x - 1, y);
    if (x < w - 1) empurrar(x + 1, y);
    if (y > 0) empurrar(x, y - 1);
    if (y < h - 1) empurrar(x, y + 1);
  }

  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (apagado[p]) { px[i + 3] = 0; continue; }
    // Borda: vizinho apagado + cor parecida com o fundo = meio transparente.
    const x = p % w;
    const y = (p - x) / w;
    const vizinho =
      (x > 0 && apagado[p - 1]) || (x < w - 1 && apagado[p + 1]) || (y > 0 && apagado[p - w]) || (y < h - 1 && apagado[p + w]);
    if (vizinho) {
      const d = dist(i);
      if (d < limite * 1.8) px[i + 3] = Math.round(px[i + 3] * Math.min(1, Math.max(0, (d - limite * 0.6) / (limite * 1.2))));
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
  const [semFundo, setSemFundo] = useState(false);
  const [carregando, setCarregando] = useState(!!logoUrl);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [trocou, setTrocou] = useState(false);
  const previa = useRef<HTMLCanvasElement>(null);
  const esferaAtual = lerEsfera(avatar);
  const estiloInicial: Estilo = esferaAtual ? (`esfera-${esferaAtual.tom}` as Estilo) : "logo";
  const escalaInicial = esferaAtual?.escala ?? 100;
  const [estilo, setEstilo] = useState<Estilo>(estiloInicial);
  const [escala, setEscala] = useState(escalaInicial);

  function escolherEstilo(e: Estilo) {
    setEstilo(e);
    // Na esfera o logo fica sobre um disco: o fundo do arquivo atrapalharia, então já tira.
    if (e !== "logo" && !semFundo) setSemFundo(true);
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
    const t = setTimeout(() => setResultado(removerFundo(base, tolerancia)), 120);
    return () => clearTimeout(t);
  }, [base, semFundo, tolerancia]);

  const semMargem = useMemo(() => (semFundo && resultado && estilo !== "logo" ? aparar(resultado) : null), [semFundo, resultado, estilo]);
  const atual = semMargem ?? (semFundo && resultado ? resultado : base);

  // Imagem atual como endereço, pra mostrar a esfera de verdade na prévia.
  const urlPrevia = useMemo(() => (estilo === "logo" || !atual ? null : atual.toDataURL("image/png")), [atual, estilo]);

  // Mostra no quadro de prévia.
  useEffect(() => {
    const c = previa.current;
    if (!c || !atual) return;
    c.width = atual.width;
    c.height = atual.height;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(atual, 0, 0);
  }, [atual]);

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
      const novoAvatar: string | null = estilo !== "logo" ? `${estilo}-${escala}` : estiloInicial !== "logo" ? "logo" : avatar;
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

  const mudou = trocou || semFundo || estilo !== estiloInicial || (estilo !== "logo" && escala !== escalaInicial);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col justify-end bg-black/45" onClick={() => !salvando && onClose()}>
      <div className="mx-auto w-full max-w-[440px] rounded-t-[28px] bg-surface-white px-5 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-divider" />
        <p className="text-center font-[family-name:var(--font-manrope)] text-[18px] font-medium">Logo da sua página</p>

        {urlPrevia && estilo !== "logo" ? (
          <div className="mx-auto mt-6 flex h-[200px] w-[200px] items-center justify-center">
            <OrbiAvatar logoUrl={urlPrevia} size={150} esfera={estilo === "esfera-claro" ? "claro" : "escuro"} escala={escala} />
          </div>
        ) : (
        /* Quadriculado deixa claro o que é transparente. */
        <div
          className="mx-auto mt-4 flex h-[200px] w-[200px] items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: "#fff", backgroundImage: "conic-gradient(#E9E9E4 25%, #fff 0 50%, #E9E9E4 0 75%, #fff 0)", backgroundSize: "20px 20px" }}
        >
          {carregando ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-black/15 border-t-on-background" />
          ) : atual ? (
            <canvas ref={previa} className="h-full w-full object-contain" />
          ) : (
            <span className="px-6 text-center text-[13px] text-text-tertiary">Ainda sem logo. Envie uma imagem.</span>
          )}
        </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { escolherArquivo(e.target.files?.[0]); e.target.value = ""; }} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={salvando} className="mt-4 w-full rounded-full bg-surface-soft py-3 text-[14px] font-medium">
          {base ? "Trocar imagem" : "Enviar logo"}
        </button>

        {base && (
          <div className="mt-3 rounded-2xl border border-divider p-4">
            <p className="text-[14px] font-medium">Aparência</p>
            <p className="mt-0.5 text-[12.5px] text-text-tertiary">Esfera: o logo vai sobre um disco com luz de vidro girando em volta.</p>
            <div role="radiogroup" aria-label="Aparência do logo" className="mt-3 flex flex-wrap gap-2">
              {([["logo", "Logo simples"], ["esfera-claro", "Esfera clara"], ["esfera-escuro", "Esfera escura"]] as const).map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={estilo === v}
                  onClick={() => escolherEstilo(v)}
                  disabled={salvando}
                  className={`min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${estilo === v ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {estilo !== "logo" && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[12.5px] text-text-tertiary">
                  <label htmlFor="logo-tamanho">Tamanho do logo</label>
                  <span className="tabular-nums">{escala}%</span>
                </div>
                <input id="logo-tamanho" type="range" min={50} max={130} step={5} value={escala} onChange={(e) => setEscala(Number(e.target.value))} disabled={salvando} className="mt-1 h-8 w-full accent-[#14161A]" />
                <p className="mt-0.5 text-[12.5px] text-text-tertiary">Aumente para o logo preencher mais a esfera.</p>
              </div>
            )}
          </div>
        )}

        {base && (
          <div className="mt-3 rounded-2xl border border-divider p-4">
            <button type="button" role="switch" aria-checked={semFundo} onClick={() => setSemFundo((v) => !v)} disabled={salvando} className="flex w-full items-center justify-between gap-3 text-left">
              <span>
                <span className="block text-[14px] font-medium">Fundo transparente</span>
                <span className="block text-[12.5px] text-text-tertiary">Tira o fundo liso do logo</span>
              </span>
              <span className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${semFundo ? "bg-on-background" : "bg-divider"}`}>
                <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${semFundo ? "translate-x-5" : ""}`} />
              </span>
            </button>
            {semFundo && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[12px] text-text-tertiary">
                  <span>Mais fiel</span>
                  <span>Tira mais</span>
                </div>
                <input type="range" min={5} max={70} value={tolerancia} onChange={(e) => setTolerancia(Number(e.target.value))} aria-label="Intensidade do recorte" className="mt-1 w-full accent-[#111318]" />
                <p className="mt-1 text-[12px] text-text-tertiary">Se sobrar fundo, aumente. Se comer o desenho, diminua.</p>
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
