"use client";

import { useRouter } from "next/navigation";
import { iniciarGuia } from "@/components/guia/GuiaOrbi";

/** Convite para o passo a passo de 1 minuto. Leva ao Catálogo e abre o guia lá, onde o primeiro passo existe. */
export function CartaoTour() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        router.push("/admin/vitrine");
        window.setTimeout(iniciarGuia, 700);
      }}
      className="mt-4 flex w-full items-center gap-3 rounded-[22px] bg-surface-white px-4 py-3.5 text-left ring-1 ring-divider transition-transform active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full orbi-gradient text-[15px] text-white" aria-hidden>✦</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium">Primeira vez aqui? Faça o passo a passo</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-text-tertiary">1 minuto: você cria seu primeiro item e vê como o cliente vê.</span>
      </span>
      <span aria-hidden className="text-text-tertiary">→</span>
    </button>
  );
}
