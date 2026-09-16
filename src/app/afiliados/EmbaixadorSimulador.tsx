"use client";

import { useState, useEffect, useRef } from "react";

// Médias reais dos dois planos (Titânio R$79/R$790, Nióbio R$109/R$981),
// já que a comissão de 30% incide sobre a fatura de verdade na Stripe:
// mensal gera fatura todo mês (comissão recorrente), anual gera UMA fatura
// com o valor cheio (comissão cai de uma vez só, na assinatura).
const PLANO_MEDIO_MENSAL = 94;
const PLANO_MEDIO_ANUAL = 886;
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
  const [ciclo, setCiclo] = useState<"mensal" | "anual">("anual");
  const assinaturas = posParaAssinaturas(pos);

  const porAssinatura = (ciclo === "anual" ? PLANO_MEDIO_ANUAL : PLANO_MEDIO_MENSAL) * COMISSAO;
  const total = assinaturas * porAssinatura;
  const totalAnim = useContador(total);
  const porAssinaturaAnim = useContador(Math.round(porAssinatura));

  return (
    <div className="orbi-card-light relative overflow-hidden rounded-[28px] px-6 py-7">
      <p className="relative text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Simule seu ganho</p>

      <p className="relative mt-3 text-center font-[family-name:var(--font-manrope)] text-[46px] font-semibold leading-none tracking-[-0.03em] text-on-background tabular-nums">
        {brl(totalAnim)}
      </p>
      <p className="relative mt-1 text-center text-[13.5px] text-text-secondary">
        {ciclo === "anual" ? "recebidos de uma vez" : "por mês, recorrente"}
      </p>

      <div className="relative mt-6">
        <div className="flex items-end justify-between">
          <span className="text-[14px] font-medium text-on-background tabular-nums">{assinaturas.toLocaleString("pt-BR")}</span>
          <span className="text-[12px] text-text-tertiary">assinaturas indicadas</span>
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

      <div className="relative mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setCiclo("mensal")}
          className={`flex-1 rounded-2xl border py-2.5 text-[13.5px] font-semibold transition-colors ${
            ciclo === "mensal" ? "border-transparent bg-[#14301F] text-white" : "border-divider bg-white/70 text-on-background"
          }`}
        >
          Assinam o mensal
        </button>
        <button
          type="button"
          onClick={() => setCiclo("anual")}
          className={`flex-1 rounded-2xl border py-2.5 text-[13.5px] font-semibold transition-colors ${
            ciclo === "anual" ? "border-transparent bg-[#14301F] text-white" : "border-divider bg-white/70 text-on-background"
          }`}
        >
          Assinam o anual
        </button>
      </div>

      <div className="relative mt-3 rounded-2xl bg-white/70 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] text-text-secondary">Por assinatura indicada</p>
          <p className="font-[family-name:var(--font-manrope)] text-[17px] font-semibold tracking-[-0.01em] text-on-background tabular-nums">
            {brl(porAssinaturaAnim)}
          </p>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-tertiary">
          {ciclo === "anual"
            ? "O anual é cobrado de uma vez, então sua comissão cai logo na primeira fatura, sem esperar mês a mês."
            : "O mensal renova todo mês, então sua comissão também repete todo mês, enquanto o cliente continuar pagando."}
        </p>
      </div>

      <p className="relative mt-3 text-center text-[11px] leading-relaxed text-text-tertiary">
        Considerando um plano médio de {brl(ciclo === "anual" ? PLANO_MEDIO_ANUAL : PLANO_MEDIO_MENSAL)}
        {ciclo === "anual" ? "/ano" : "/mês"} e 30% de comissão sobre o valor de cada fatura paga.
      </p>
    </div>
  );
}
