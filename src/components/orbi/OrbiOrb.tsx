"use client";

import { ORBI_VIDEO } from "./orbiVideo";

/**
 * A Orbi — esfera líquida em vídeo.
 * O fundo do vídeo foi clareado para branco puro; `mix-blend-mode: multiply`
 * faz esse branco desaparecer sobre o fundo claro do app, deixando só a esfera.
 */
export function OrbiOrb({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`orbi-orb relative shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <video
        src={ORBI_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        className="orbi-orb__video h-full w-full object-cover"
      />
    </div>
  );
}
