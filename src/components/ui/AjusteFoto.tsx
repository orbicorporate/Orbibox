"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PREVIA_MAX = 720;
const FINAL_MAX = 2000;

type Ajustes = { luz: number; contraste: number; cor: number; sombras: number; realces: number };
const ZERO: Ajustes = { luz: 0, contraste: 0, cor: 0, sombras: 0, realces: 0 };

/** Aplica luz, contraste e cor direto nos pixels (não depende de ctx.filter, que falha em alguns celulares). */
function aplicar(dados: ImageData, a: Ajustes) {
  const d = dados.data;
  const luz = a.luz * 2.55;
  const c = 1 + a.contraste / 100;
  const s = 1 + a.cor / 100;
  const sombras = a.sombras * 1.6;
  const realces = a.realces * 1.6;
  for (let i = 0; i < d.length; i += 4) {
    // Sombras mexem mais nos tons escuros e Realces nos claros (curva suave por luminosidade).
    const l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const tom = sombras * (1 - l) * (1 - l) + realces * l * l;
    let r = d[i] + luz + tom;
    let g = d[i + 1] + luz + tom;
    let b = d[i + 2] + luz + tom;
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    b = (b - 128) * c + 128;
    const cinza = 0.299 * r + 0.587 * g + 0.114 * b;
    r = cinza + (r - cinza) * s;
    g = cinza + (g - cinza) * s;
    b = cinza + (b - cinza) * s;
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
}

function desenhar(img: HTMLImageElement, max: number): HTMLCanvasElement {
  const escala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * escala));
  c.height = Math.max(1, Math.round(img.naturalHeight * escala));
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/**
 * Ajuste rápido da foto: clarear, contraste e cor. Roda no próprio aparelho,
 * sem custo e sem esperar a IA. Devolve a foto nova como arquivo.
 */
export function AjusteFoto({ url, onAplicar, onFechar }: { url: string; onAplicar: (arquivo: File) => void; onFechar: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [a, setA] = useState<Ajustes>(ZERO);
  const [aplicando, setAplicando] = useState(false);
  const tela = useRef<HTMLCanvasElement>(null);
  const base = useRef<ImageData | null>(null);

  useEffect(() => {
    let vivo = true;
    let objeto: string | null = null;
    (async () => {
      try {
        const blob = await (await fetch(url)).blob();
        objeto = URL.createObjectURL(blob);
        const el = new Image();
        el.onload = () => { if (vivo) setImg(el); };
        el.onerror = () => { if (vivo) setErro("Não consegui abrir essa foto."); };
        el.src = objeto;
      } catch {
        if (vivo) setErro("Não consegui abrir essa foto.");
      }
    })();
    return () => { vivo = false; if (objeto) URL.revokeObjectURL(objeto); };
  }, [url]);

  useEffect(() => {
    if (!img || !tela.current) return;
    const origem = desenhar(img, PREVIA_MAX);
    base.current = origem.getContext("2d")!.getImageData(0, 0, origem.width, origem.height);
    tela.current.width = origem.width;
    tela.current.height = origem.height;
  }, [img]);

  useEffect(() => {
    const cv = tela.current;
    const original = base.current;
    if (!img || !cv || !original) return;
    const copia = new ImageData(new Uint8ClampedArray(original.data), original.width, original.height);
    aplicar(copia, a);
    cv.getContext("2d")!.putImageData(copia, 0, 0);
  }, [a, img]);

  function confirmar() {
    if (!img) return;
    setAplicando(true);
    window.setTimeout(() => {
      try {
        const c = desenhar(img, FINAL_MAX);
        const ctx = c.getContext("2d")!;
        const dados = ctx.getImageData(0, 0, c.width, c.height);
        aplicar(dados, a);
        ctx.putImageData(dados, 0, 0);
        c.toBlob((b) => {
          setAplicando(false);
          if (!b) return setErro("Não consegui salvar a foto.");
          onAplicar(new File([b], "foto-ajustada.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.92);
      } catch {
        setAplicando(false);
        setErro("Não consegui salvar a foto.");
      }
    }, 30);
  }

  const mudou = a.luz !== 0 || a.contraste !== 0 || a.cor !== 0 || a.sombras !== 0 || a.realces !== 0;
  const controle = (rotulo: string, chave: keyof Ajustes) => (
    <label className="block">
      <span className="flex items-center justify-between text-[13px] font-medium"><span>{rotulo}</span><span className="text-text-tertiary">{a[chave] > 0 ? `+${a[chave]}` : a[chave]}</span></span>
      <input type="range" min={-60} max={60} step={1} value={a[chave]} onChange={(e) => setA((x) => ({ ...x, [chave]: Number(e.target.value) }))} className="mt-1 w-full accent-[#111318]" />
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Ajustar a foto">
      <button aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/45" />
      <div className="relative flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
          <p className="text-[15px] font-semibold">Ajustar a foto</p>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFEDE8] text-[14px]">✕</button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="flex justify-center rounded-2xl bg-[#EFEDE8] p-2">
            {img ? <canvas ref={tela} className="max-h-[300px] w-auto max-w-full rounded-xl" /> : <p className="py-16 text-[13px] text-text-secondary">{erro ?? "Abrindo a foto…"}</p>}
          </div>
          {img && (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setA({ ...ZERO, luz: 18, contraste: 8, cor: 6, sombras: 25 })} className="min-h-[40px] rounded-full bg-[#EFEDE8] px-4 text-[13px] font-medium">Clarear</button>
                <button type="button" onClick={() => setA({ ...ZERO, luz: 4, contraste: 25, cor: 18, sombras: -12, realces: 10 })} className="min-h-[40px] rounded-full bg-[#EFEDE8] px-4 text-[13px] font-medium">Mais vivo</button>
                <button type="button" onClick={() => setA(ZERO)} disabled={!mudou} className="min-h-[40px] rounded-full px-3 text-[13px] text-text-tertiary disabled:opacity-40">Desfazer</button>
              </div>
              {controle("Luz", "luz")}
              {controle("Contraste", "contraste")}
              {controle("Cor", "cor")}
              {controle("Sombras", "sombras")}
              {controle("Realces", "realces")}
            </div>
          )}
          {erro && img && <p role="alert" className="text-[12.5px] text-red-600">{erro}</p>}
        </div>
        <div className="border-t border-divider px-5 py-3.5">
          <button type="button" onClick={confirmar} disabled={!img || !mudou || aplicando} className="min-h-[50px] w-full rounded-full bg-on-background text-[14.5px] font-semibold text-white disabled:opacity-40">
            {aplicando ? "Aplicando…" : "Aplicar na foto"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
