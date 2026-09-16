"use client";

import { useState, useEffect, useRef } from "react";

const PLANO_MEDIO = 100; // R$ médio por assinatura/mês
const COMISSAO = 0.3;
const MIN = 10;
const MAX = 10000;

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// Slider fluido (0 a 1000) mapeado numa curva exponencial de 10 a 10 mil,
// pra a régua correr suave e ainda cobrir toda a faixa. Arredonda o
// resultado pra um número "redondo" conforme a magnitude.
function posParaAssinaturas(pos: number) {
  const t = pos / 1000;
  const bruto = MIN * Math.pow(MAX / MIN, t);
  if (bruto < 100) return Math.round(bruto / 5) * 5;
  if (bruto < 1000) return Math.round(bruto / 10) * 10;
  return Math.round(bruto / 50) * 50;
}

/** Número que "corre" até o alvo, pra dar vida à troca de valor. */
function useContador(alvo: number, dur = 380) {
  const [v, setV] = useState(alvo);
  const anterior = useRef(alvo);
  useEffect(() => {
    const de = anterior.current;
    anterior.current = alvo;
    if (de === alvo) return;
    let raf = 0;
    const t0 = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(de + (alvo - de) * eased));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, dur]);
  return v;
}

export function EmbaixadorSimulador() {
  const [pos, setPos] = useState(600); // começa em ~1000 assinaturas
  const assinaturas = posParaAssinaturas(pos);

  const porMes = assinaturas * PLANO_MEDIO * COMISSAO;
  const porAno = porMes * 12;

  const mesAnim = useContador(porMes);
  const anoAnim = useContador(porAno);

  return (
    <div className="orbi-card-light relative overflow-hidden rounded-[28px] px-6 py-7">
      <p className="relative text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Simule seu ganho</p>

      <p className="relative mt-3 text-center font-[family-name:var(--font-manrope)] text-[46px] font-semibold leading-none tracking-[-0.03em] text-on-background tabular-nums">
        {brl(mesAnim)}
      </p>
      <p className="relative mt-1 text-center text-[13.5px] text-text-secondary">por mês, recorrente</p>

      <div className="relative mt-6">
        <div className="flex items-end justify-between">
          <span className="text-[14px] font-medium text-on-background tabular-nums">{assinaturas.toLocaleString("pt-BR")}</span>
          <span className="text-[12px] text-text-tertiary">{assinaturas === 1 ? "assinatura ativa" : "assinaturas ativas"}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="afiliado-range mt-2.5 w-full"
          aria-label="Número de assinaturas indicadas"
        />
        <div className="mt-1.5 flex justify-between text-[10.5px] text-text-tertiary">
          <span>10</span>
          <span>10 mil</span>
        </div>
      </div>

      <div className="relative mt-5 rounded-2xl bg-white/70 px-4 py-3 text-center">
        <p className="text-[12px] text-text-secondary">Isso dá, em um ano</p>
        <p className="mt-0.5 font-[family-name:var(--font-manrope)] text-[24px] font-semibold tracking-[-0.02em] text-on-background tabular-nums">{brl(anoAnim)}</p>
      </div>

      <p className="relative mt-3 text-center text-[11px] leading-relaxed text-text-tertiary">
        Considerando um plano médio de R$ 100/mês e 30% de comissão. Enquanto o cliente paga, você ganha.
      </p>
    </div>
  );
}
