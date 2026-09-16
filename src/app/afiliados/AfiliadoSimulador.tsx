"use client";

import { useState, useEffect, useRef } from "react";

const PLANO_MEDIO = 100; // R$ médio por assinatura/mês
const COMISSAO = 0.3;

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/** Número que "corre" até o alvo, pra dar vida à troca de valor. */
function useContador(alvo: number, dur = 500) {
  const [v, setV] = useState(alvo);
  const anterior = useRef(alvo);
  useEffect(() => {
    const de = anterior.current;
    const ate = alvo;
    anterior.current = alvo;
    if (de === ate) return;
    let raf = 0;
    const t0 = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(de + (ate - de) * eased));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, dur]);
  return v;
}

// Escala do slider: de 10 a 10.000, mas em passos que crescem (10, 50, 100…)
// pra a régua ir de pouco a muito sem 1000 paradas.
const NIVEIS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export function AfiliadoSimulador() {
  const [idx, setIdx] = useState(3); // começa em 100 assinaturas
  const assinaturas = NIVEIS[idx];

  const porMes = assinaturas * PLANO_MEDIO * COMISSAO;
  const porAno = porMes * 12;

  const mesAnim = useContador(porMes);
  const anoAnim = useContador(porAno);

  return (
    <div className="orbi-card-light relative overflow-hidden rounded-[28px] px-6 py-7">
      <p className="relative text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Simule seu ganho</p>

      {/* Valor por mês, o número que importa, bem grande */}
      <p className="relative mt-3 text-center font-[family-name:var(--font-manrope)] text-[46px] font-bold leading-none tracking-[-0.03em] text-on-background">
        {brl(mesAnim)}
      </p>
      <p className="relative mt-1 text-center text-[13.5px] text-text-secondary">por mês, recorrente</p>

      {/* Slider */}
      <div className="relative mt-6">
        <div className="flex items-end justify-between">
          <span className="text-[13px] font-semibold text-on-background">{assinaturas.toLocaleString("pt-BR")}</span>
          <span className="text-[12px] text-text-tertiary">{assinaturas === 1 ? "assinatura ativa" : "assinaturas ativas"}</span>
        </div>
        <input
          type="range"
          min={0}
          max={NIVEIS.length - 1}
          step={1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="afiliado-range mt-2 w-full"
          aria-label="Número de assinaturas indicadas"
        />
        <div className="mt-1 flex justify-between text-[10.5px] text-text-tertiary">
          <span>10</span>
          <span>10 mil</span>
        </div>
      </div>

      {/* Por ano, o reforço */}
      <div className="relative mt-5 rounded-2xl bg-white/70 px-4 py-3 text-center">
        <p className="text-[12px] text-text-secondary">Isso dá, em um ano</p>
        <p className="mt-0.5 font-[family-name:var(--font-manrope)] text-[24px] font-bold tracking-[-0.02em] text-on-background">{brl(anoAnim)}</p>
      </div>

      <p className="relative mt-3 text-center text-[11px] leading-relaxed text-text-tertiary">
        Considerando um plano médio de R$ 100/mês e 30% de comissão. Enquanto o cliente paga, você ganha.
      </p>
    </div>
  );
}
