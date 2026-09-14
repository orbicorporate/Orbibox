"use client";

import { OrbiParticleSphere } from "./OrbiParticleSphere";

/**
 * A Orbi. Antes era um vídeo 3D em /public: pesava quase 1 MB, tinha cor
 * fixa (ignorando a paleta escolhida em Configurações) e o iOS bloqueava o
 * autoplay em Modo de Baixo Consumo, mostrando um botão de play no meio da
 * tela. Agora é a mesma esfera de partículas do resto do app, desenhada em
 * canvas: sempre fluida, sem download, e respeitando as cores da marca.
 *
 * O contorno orgânico que morfa e o brilho de vidro continuam em CSS.
 */
export function OrbiOrb({
  size = 96,
  className = "",
  colors,
}: {
  size?: number;
  className?: string;
  /** Cores da Orbi do negócio. Sem isso, usa o degradê padrão da marca. */
  colors?: string[] | null;
}) {
  return (
    <div
      className={`orbi-orb relative shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <OrbiParticleSphere size={size} colors={colors ?? undefined} className="h-full w-full" />
    </div>
  );
}
