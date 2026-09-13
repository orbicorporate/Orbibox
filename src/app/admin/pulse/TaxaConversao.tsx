"use client";

import { useEffect, useState } from "react";

// Contexto do número: o que significa e o que fazer. Faixas realistas pra
// link-in-bio/catálogo (onde "agir" = tocar em algo, não só olhar).
function contexto(taxa: number, visitas: number) {
  if (visitas < 10) {
    return {
      cor: "#8A8F98",
      titulo: "Ainda são poucas visitas",
      dica: "Com mais gente entrando, esse número fica confiável. Divulgue seu link pra trazer as primeiras visitas.",
    };
  }
  if (taxa >= 60) {
    return {
      cor: "#1F9E4C",
      titulo: "Excelente. Sua página convence.",
      dica: "A maioria de quem entra faz algo. Mantenha a vitrine e os botões sempre atualizados pra continuar assim.",
    };
  }
  if (taxa >= 35) {
    return {
      cor: "#3E8E41",
      titulo: "Está num bom caminho.",
      dica: "Boa parte age ao entrar. Pra subir mais, deixe o botão principal (WhatsApp ou vitrine) bem no topo e com um texto claro.",
    };
  }
  if (taxa >= 15) {
    return {
      cor: "#C2650A",
      titulo: "Dá pra melhorar.",
      dica: "Muita gente entra e sai sem tocar em nada. Revise a primeira dobra: a pessoa entende em 3 segundos o que fazer? Simplifique.",
    };
  }
  return {
    cor: "#C4143A",
    titulo: "Vale ajustar a página.",
    dica: "Quase ninguém age ao entrar. Provável que falte um botão claro logo no topo, ou a página esteja confusa. Comece deixando uma única ação óbvia.",
  };
}

export function TaxaConversao({ taxa, visitas, totalCliques }: { taxa: number; visitas: number; totalCliques: number }) {
  // Anima o número e o arco de 0 até o valor real, ao montar.
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    let raf = 0;
    const inicio = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - inicio) / dur);
      // ease-out
      const eased = 1 - Math.pow(1 - p, 3);
      setAnim(Math.round(taxa * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [taxa]);

  const ctx = contexto(taxa, visitas);
  const circ = 289;

  return (
    <div className="flex flex-col items-center">
      <div className="relative mt-6 flex h-56 w-56 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--divider)" strokeWidth="3" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={ctx.cor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(anim / 100) * circ} ${circ}`}
            style={{ transition: "stroke 0.4s ease" }}
          />
        </svg>
        <div className="text-center">
          <p className="font-[family-name:var(--font-manrope)] text-[52px] font-medium leading-none tabular-nums">{anim}%</p>
          <p className="mt-1 text-[13px] text-text-secondary">de quem entra, age</p>
        </div>
      </div>

      {/* Contexto + o que fazer */}
      <div className="mt-2 w-full rounded-[20px] bg-surface-soft p-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ctx.cor }} />
          <p className="text-[14px] font-semibold" style={{ color: ctx.cor }}>{ctx.titulo}</p>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{ctx.dica}</p>
        {visitas >= 10 && (
          <p className="mt-2 text-[12px] text-text-tertiary">
            {totalCliques} {totalCliques === 1 ? "ação" : "ações"} em {visitas} {visitas === 1 ? "visita" : "visitas"} no período.
          </p>
        )}
      </div>
    </div>
  );
}
