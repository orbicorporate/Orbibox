import type { ReactNode } from "react";

/**
 * Design compartilhado de todo card em que a Orbi "opina" sobre algo:
 * fundo em degradê claro com luz varrendo (.orbi-card-light), cantos
 * grandes, ícone de dois sparkles + rótulo em caixa alta, e um botão
 * de ação em pílula escura com um sparkle verde no fim.
 *
 * Referência visual: card "ORBI INSIGHT" compartilhado por Pedro
 * (fundo menta clara, sparkle teal, texto 19-20px, CTA preto).
 */

// Sparkle duplo — vai no cabeçalho de todo card (dois tamanhos, cor
// de fechamento do degradê da marca).
export function OrbiSparkle({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M9 1.5l1.9 5.6L16.5 9l-5.6 1.9L9 16.5l-1.9-5.6L1.5 9l5.6-1.9L9 1.5z" fill="#57D9C6" />
      <path d="M21 13.5l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill="#57D9C6" opacity=".7" />
    </svg>
  );
}

// Sparkle simples — vai dentro do botão de ação (cor de início do
// degradê, o verde-limão da marca).
export function OrbiSparkleMini({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 1.5l1.6 5 5 1.6-5 1.6-1.6 5-1.6-5-5-1.6 5-1.6L10 1.5z" fill="#B7F34A" />
    </svg>
  );
}

export function OrbiInsightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`orbi-card-light rounded-[28px] p-6 ${className}`}>{children}</div>;
}

export function OrbiInsightHeader({ label = "Orbi Insight" }: { label?: string }) {
  return (
    <div className="relative flex items-center gap-2">
      <OrbiSparkle />
      <span className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
    </div>
  );
}

export function OrbiInsightMessage({ children }: { children: ReactNode }) {
  return <p className="relative mt-4 text-[19px] leading-relaxed text-on-background">{children}</p>;
}

// className pronta pro botão de ação — usar em <Link>, <a> ou <button>
// pra manter a mesma pílula preta com sparkle em todo lugar.
export const orbiInsightCtaClass =
  "relative mt-5 inline-flex items-center gap-2 rounded-full bg-on-background px-6 py-3.5 text-[14px] font-medium text-white";
