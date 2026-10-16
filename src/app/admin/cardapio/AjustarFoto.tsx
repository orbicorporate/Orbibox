"use client";

import { useRef, useState } from "react";
import { ZOOM_MAX, estiloFoto, limitarAjuste, type FotoAjuste } from "@/lib/cardapio";

const PADRAO: FotoAjuste = { z: 1, x: 0, y: 0 };

/**
 * Enquadra a foto do prato dentro do quadrado: arraste para mover e use o zoom
 * para aproximar. Serve para tirar da vista pedaços do cardápio que vieram no
 * recorte (preço, nome escrito). O resultado vale igual na página do cliente.
 */
export function AjustarFoto({ foto, ajuste, onChange }: { foto: string; ajuste?: FotoAjuste | null; onChange: (a: FotoAjuste | null) => void }) {
  const inicial = ajuste ? limitarAjuste(ajuste) : PADRAO;
  const [a, setA] = useState<FotoAjuste>(inicial);
  const caixa = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const mexido = a.z !== 1 || a.x !== 0 || a.y !== 0;

  function aplicar(prox: FotoAjuste, salvar: boolean) {
    const l = limitarAjuste(prox);
    setA(l);
    if (salvar) onChange(l.z === 1 && l.x === 0 && l.y === 0 ? null : l);
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto} alt="" draggable={false} style={estiloFoto(a)} className="pointer-events-none h-full w-full object-cover" />
      </div>
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
      {mexido && (
        <button type="button" onClick={() => aplicar(PADRAO, true)} className="min-h-[40px] rounded-full bg-surface-white px-4 text-[13px] font-medium text-text-secondary">Voltar ao original</button>
      )}
    </div>
  );
}
