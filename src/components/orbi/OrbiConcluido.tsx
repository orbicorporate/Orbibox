"use client";

import type { ReactNode } from "react";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

/** Verde forte da marca para "deu certo". */
export const VERDE_CONCLUIDO = ["#0E9F4A", "#16C45B", "#3EE07F"];

/**
 * Esfera que se enche de verde de baixo para cima. Enquanto a Orbi trabalha
 * ("carregando"), o verde sobe devagar e quase enche; ao concluir ("cheio") a
 * esfera aparece toda verde.
 */
export function OrbiEncher({ size, estado, colors, progresso }: { size: number; estado: "carregando" | "cheio"; colors?: string[]; progresso?: number }) {
  const medido = typeof progresso === "number";
  return (
    <div className="relative rounded-full" style={{ width: size, height: size }}>
      <OrbiParticleSphere size={size} vivid colors={colors} className="absolute inset-0 rounded-full" />
      <div aria-hidden className={`absolute inset-0 ${estado === "carregando" && !medido ? "orbi-encher" : ""}`} style={estado === "cheio" ? { clipPath: "inset(0)" } : medido ? { clipPath: `inset(${(1 - Math.min(1, Math.max(0, progresso))) * 100}% 0 0 0)`, transition: "clip-path 400ms cubic-bezier(0.23, 1, 0.32, 1)" } : { clipPath: "inset(100% 0 0 0)" }}>
        <OrbiParticleSphere size={size} vivid colors={VERDE_CONCLUIDO} className="rounded-full" />
      </div>
    </div>
  );
}

/**
 * Cartão de conclusão: sempre que a Orbi termina algo, a esfera fica toda
 * verde e um anel verde se abre atrás dela.
 */
export function OrbiConcluido({ titulo, texto, children, className = "" }: { titulo: string; texto?: string; children?: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`orbi-concluido-in flex flex-col items-center rounded-[24px] bg-[#E1F3E6] px-5 py-6 text-center ${className}`}>
      <div className="relative flex h-[96px] w-[96px] items-center justify-center">
        <span aria-hidden className="orbi-concluido-anel absolute inset-0 rounded-full bg-[#16C45B]/40" />
        <OrbiParticleSphere size={92} vivid colors={VERDE_CONCLUIDO} className="relative rounded-full" />
      </div>
      <p className="mt-3 text-[17px] font-semibold text-[#0F6B35]">{titulo}</p>
      {texto && <p className="mt-1 max-w-[320px] text-[13.5px] leading-snug text-[#0F6B35]/85">{texto}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

/**
 * Orbi pequena para dentro de botões e linhas: a própria esfera da Orbi se
 * enchendo de verde forte de baixo para cima. Com "progresso" (0 a 1) mostra o
 * avanço real; sem ele, sobe devagar enquanto a espera dura. Os botões de
 * carregamento ficam claros, sem fundo escuro, para a esfera aparecer bem.
 */
export function OrbiMiniVerde({ size = 18, progresso, className = "" }: { size?: number; progresso?: number; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 ${className}`}>
      <OrbiEncher size={Math.max(26, size + 6)} estado="carregando" progresso={progresso} />
    </span>
  );
}
