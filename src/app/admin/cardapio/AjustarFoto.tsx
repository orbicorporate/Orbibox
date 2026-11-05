"use client";

import { useEffect, useRef, useState } from "react";
import { OrbiMiniVerde } from "@/components/orbi/OrbiConcluido";
import { tirarFundo } from "@/lib/tirarFundo";
import { COR_ZERO, corMexida, desenhar, paraBlob, type CorFoto } from "@/lib/corFoto";
import { ZOOM_MAX, estiloFoto, limitarAjuste, type FotoAjuste } from "@/lib/cardapio";

const PADRAO: FotoAjuste = { z: 1, x: 0, y: 0 };

/**
 * Enquadra a foto do prato dentro do quadrado: arraste para mover e use o zoom
 * para aproximar. Serve para tirar da vista pedaços do cardápio que vieram no
 * recorte (preço, nome escrito). O resultado vale igual na página do cliente.
 */
export function AjustarFoto({ foto, ajuste, onChange, onNovaFoto }: { foto: string; ajuste?: FotoAjuste | null; onChange: (a: FotoAjuste | null) => void; onNovaFoto: (b: Blob, manterAjuste?: boolean) => Promise<boolean> }) {
  const inicial = ajuste ? limitarAjuste(ajuste) : PADRAO;
  const [a, setA] = useState<FotoAjuste>(inicial);
  const caixa = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [fundo, setFundo] = useState<{ fase: "parado" | "baixando" | "tirando" | "enviando"; pct: number; erro: string | null }>({ fase: "parado", pct: 0, erro: null });
  const [cor, setCor] = useState<CorFoto>(COR_ZERO);
  const [aba, setAba] = useState<"quadro" | "cor">("quadro");
  const [salvandoCor, setSalvandoCor] = useState(false);
  const [erroCor, setErroCor] = useState<string | null>(null);
  const bmp = useRef<ImageBitmap | null>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const [pronta, setPronta] = useState(false);
  const mexido = a.z !== 1 || a.x !== 0 || a.y !== 0;

  useEffect(() => {
    if (aba !== "cor" || bmp.current) return;
    let vivo = true;
    fetch(foto, { mode: "cors" })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => createImageBitmap(b))
      .then((m) => { if (vivo) { bmp.current = m; setPronta(true); } })
      .catch(() => { if (vivo) setErroCor("Não consegui abrir essa foto para editar a cor."); });
    return () => { vivo = false; };
  }, [aba, foto]);

  useEffect(() => {
    if (aba === "cor" && pronta && bmp.current && tela.current) desenhar(bmp.current, 480, cor, tela.current);
  }, [aba, pronta, cor]);

  async function salvarCor() {
    if (!bmp.current) return;
    setSalvandoCor(true);
    setErroCor(null);
    const b = await paraBlob(desenhar(bmp.current, 2000, cor));
    const ok = b ? await onNovaFoto(b, true) : false;
    setSalvandoCor(false);
    if (!ok) setErroCor("Não consegui salvar a foto. Tente de novo.");
  }

  function aplicar(prox: FotoAjuste, salvar: boolean) {
    const l = limitarAjuste(prox);
    setA(l);
    if (salvar) onChange(l.z === 1 && l.x === 0 && l.y === 0 ? null : l);
  }

  async function semFundo() {
    setFundo({ fase: "baixando", pct: 0, erro: null });
    try {
      const r = await fetch(foto, { mode: "cors" });
      if (!r.ok) throw new Error("leitura");
      const original = await r.blob();
      const pronto = await tirarFundo(original, (p) => setFundo((f) => (f.fase === "parado" ? f : { ...f, fase: p >= 1 ? "tirando" : "baixando", pct: p })));
      setFundo((f) => ({ ...f, fase: "enviando" }));
      const ok = await onNovaFoto(pronto);
      setFundo({ fase: "parado", pct: 0, erro: ok ? null : "Não consegui salvar a foto nova. Tente de novo." });
    } catch {
      setFundo({ fase: "parado", pct: 0, erro: "Não consegui tirar o fundo dessa foto. Tente com outra foto ou ajuste o enquadramento." });
    }
  }

  function baixo(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrasto.current = { px: e.clientX, py: e.clientY, x: a.x, y: a.y };
  }
  function move(e: React.PointerEvent) {
    const d = arrasto.current;
    const w = caixa.current?.clientWidth;
    if (!d || !w) return;
    aplicar({ z: a.z, x: d.x + ((e.clientX - d.px) / w) * 100, y: d.y + ((e.clientY - d.py) / w) * 100 }, false);
  }
  function solta() {
    if (!arrasto.current) return;
    arrasto.current = null;
    aplicar(a, true);
  }
  function tecla(e: React.KeyboardEvent) {
    const passo = e.shiftKey ? 8 : 3;
    const m: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
    const v = m[e.key];
    if (!v) return;
    e.preventDefault();
    aplicar({ z: a.z, x: a.x + v[0], y: a.y + v[1] }, true);
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-soft p-3.5">
      <div
        ref={caixa}
        role="group"
        tabIndex={0}
        aria-label="Enquadramento da foto. Arraste ou use as setas para mover"
        onPointerDown={baixo}
        onPointerMove={move}
        onPointerUp={solta}
        onPointerCancel={solta}
        onKeyDown={tecla}
        className="relative h-[176px] w-[176px] cursor-grab touch-none select-none overflow-hidden rounded-[26px] bg-surface-white ring-1 ring-black/10 active:cursor-grabbing"
      >
        {aba === "cor" && pronta ? (
          <canvas ref={tela} style={estiloFoto(a)} className="pointer-events-none h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" draggable={false} style={estiloFoto(a)} className="pointer-events-none h-full w-full object-cover" />
        )}
      </div>
      <div role="tablist" className="flex gap-1 rounded-full bg-surface-white p-1 ring-1 ring-black/5">
        {([["quadro", "Enquadrar"], ["cor", "Cor e luz"]] as const).map(([k, n]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={`min-h-[36px] rounded-full px-4 text-[13px] font-medium transition-colors ${aba === k ? "bg-on-background text-white" : "text-text-secondary"}`}>{n}</button>
        ))}
      </div>
      {aba === "quadro" ? (
        <>
        <p className="text-center text-[12.5px] leading-snug text-text-tertiary">Arraste a foto para mover e aproxime com o zoom para tirar o que sobrou do cardápio.</p>
        <label className="flex w-full max-w-[260px] items-center gap-3 text-[13px] text-text-secondary">
          Zoom
          <input
            type="range"
            min={1}
            max={ZOOM_MAX}
            step={0.05}
            value={a.z}
            onChange={(e) => aplicar({ ...a, z: Number(e.target.value) }, true)}
            aria-label="Zoom da foto"
            className="h-11 min-w-0 flex-1 accent-[#111318]"
          />
        </label>
        <div className="flex w-full max-w-[260px] flex-col items-center gap-1.5">
          <button type="button" onClick={semFundo} disabled={fundo.fase !== "parado"} className={`min-h-[44px] w-full rounded-full px-5 text-[13.5px] font-semibold active:scale-[0.98] ${fundo.fase !== "parado" ? "bg-surface-white text-on-background ring-1 ring-black/10" : "bg-on-background text-white"}`}>
            {fundo.fase === "parado" ? "Tirar fundo" : <span className="inline-flex items-center gap-2"><OrbiMiniVerde size={18} progresso={fundo.fase === "baixando" ? fundo.pct * 0.7 : fundo.fase === "tirando" ? 0.85 : 0.97} />{fundo.fase === "baixando" ? (fundo.pct > 0 ? `Preparando… ${Math.round(fundo.pct * 100)}%` : "Preparando…") : fundo.fase === "tirando" ? "Tirando o fundo…" : "Salvando…"}</span>}
          </button>
          <p className="text-center text-[12px] leading-snug text-text-tertiary">Recorta só o prato e deixa um fundo claro e neutro. Na primeira vez pode levar um pouco mais para preparar.</p>
          {fundo.erro && <p role="alert" className="text-center text-[12.5px] text-red-600">{fundo.erro}</p>}
        </div>
        </>
      ) : (
        <div className="flex w-full max-w-[260px] flex-col gap-1">
          {([["cor", "Cor", "frio", "quente"], ["sat", "Saturação", "", ""], ["luz", "Luz", "", ""], ["sombra", "Sombra", "", ""]] as const).map(([k, n]) => (
            <label key={k} className="flex flex-col text-[13px] text-text-secondary">
              <span className="flex items-center justify-between">{n}<span className="tabular-nums text-text-tertiary">{cor[k] > 0 ? "+" : ""}{cor[k]}</span></span>
              <input type="range" min={-100} max={100} step={1} value={cor[k]} disabled={!pronta} onChange={(e) => setCor({ ...cor, [k]: Number(e.target.value) })} onDoubleClick={() => setCor({ ...cor, [k]: 0 })} aria-label={n} className="h-9 w-full accent-[#111318] disabled:opacity-50" />
            </label>
          ))}
          {!pronta && !erroCor && <p className="text-center text-[12px] text-text-tertiary">Abrindo a foto…</p>}
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => setCor(COR_ZERO)} disabled={!corMexida(cor)} className="min-h-[44px] flex-1 rounded-full bg-surface-white px-4 text-[13.5px] font-medium text-text-secondary ring-1 ring-black/10 disabled:opacity-50">Zerar</button>
            <button type="button" onClick={salvarCor} disabled={!corMexida(cor) || salvandoCor || !pronta} className="min-h-[44px] flex-1 rounded-full bg-on-background px-4 text-[13.5px] font-semibold text-white disabled:opacity-40 active:scale-[0.98]">{salvandoCor ? "Salvando…" : "Aplicar"}</button>
          </div>
          {erroCor && <p role="alert" className="text-center text-[12.5px] text-red-600">{erroCor}</p>}
        </div>
      )}
      {mexido && (
        <button type="button" onClick={() => aplicar(PADRAO, true)} className="min-h-[40px] rounded-full bg-surface-white px-4 text-[13px] font-medium text-text-secondary">Voltar ao original</button>
      )}
    </div>
  );
}
