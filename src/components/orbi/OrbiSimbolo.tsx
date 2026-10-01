"use client";

import { OrbiParticleSphere } from "./OrbiParticleSphere";

/**
 * O símbolo da Orbi: a mesma esfera de partículas do botão flutuante,
 * boiando de leve. Regra da marca: sempre que um ícone representa a IA,
 * é ela que aparece (nada de estrelinha genérica num quadrado degradê).
 */
export function OrbiSimbolo({ size = 44, colors, className = "" }: { size?: number; colors?: string[] | null; className?: string }) {
  return (
    <span
      className={`orbi-simbolo inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size, filter: `drop-shadow(0 ${Math.max(2, size / 14)}px ${Math.max(4, size / 5)}px rgba(0,0,0,0.18))` }}
      aria-hidden
    >
      <OrbiParticleSphere size={size} colors={colors ?? undefined} vivid className="rounded-full" />
    </span>
  );
}
