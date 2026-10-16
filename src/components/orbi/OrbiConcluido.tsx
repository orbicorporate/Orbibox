"use client";

import type { ReactNode } from "react";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

/** Verde forte da marca para "deu certo". */
export const VERDE_CONCLUIDO = ["#0E9F4A", "#16C45B", "#3EE07F"];

/**
 * Cartão de conclusão: sempre que a Orbi termina algo, a esfera fica toda
 * verde, forma um ✓ e um anel verde se abre atrás dela.
 */
export function OrbiConcluido({ titulo, texto, children, className = "" }: { titulo: string; texto?: string; children?: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`orbi-concluido-in flex flex-col items-center rounded-[24px] bg-[#E1F3E6] px-5 py-6 text-center ${className}`}>
      <div className="relative flex h-[96px] w-[96px] items-center justify-center">
        <span aria-hidden className="orbi-concluido-anel absolute inset-0 rounded-full bg-[#16C45B]/40" />
        <OrbiParticleSphere size={92} variant="check" holdCheck vivid colors={VERDE_CONCLUIDO} className="relative rounded-full" />
      </div>
      <p className="mt-3 text-[17px] font-semibold text-[#0F6B35]">{titulo}</p>
      {texto && <p className="mt-1 max-w-[320px] text-[13.5px] leading-snug text-[#0F6B35]/85">{texto}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
