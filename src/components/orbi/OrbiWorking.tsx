"use client";

import { OrbiParticleSphere } from "./OrbiParticleSphere";

/**
 * Selo de "IA trabalhando" — a esfera de partículas (assinatura da Orbi) com
 * um texto ao lado. Aparece em qualquer espera de IA: lendo o site,
 * organizando a vitrine, montando a página Sobre, etc. Deixa claro que tem
 * uma IA pensando, não só um spinner qualquer.
 *
 * `variant="bar"` (padrão) ocupa a largura toda, com fundo em degradê suave —
 * bom pra blocos (importação). `variant="inline"` é compacto, pra caber ao
 * lado de um botão.
 */
export function OrbiWorking({
  label = "Orbi está trabalhando…",
  variant = "bar",
}: {
  label?: string;
  variant?: "bar" | "inline";
}) {
  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-2">
        <OrbiParticleSphere size={22} className="rounded-full" />
        <span className="text-[13px] text-text-secondary">{label}</span>
      </span>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-full bg-surface-soft px-4 py-3">
      <OrbiParticleSphere size={30} className="rounded-full" />
      <span className="text-[14px] font-medium text-text-secondary">{label}</span>
    </div>
  );
}
