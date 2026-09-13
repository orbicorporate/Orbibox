"use client";

import Link from "next/link";
import { OrbiEntrevista } from "./OrbiEntrevista";

export function ComoOrbiAprende({ businessId, orbiColors, gapsPendentes = 0, onDone }: { businessId: string; orbiColors?: string[] | null; gapsPendentes?: number; onDone?: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E7EAFC] text-[15px]">🧠</span>
        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">Como a Orbi aprende sobre seu negócio</p>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
        Quanto mais ela sabe, melhor atende e cria. Use os dois caminhos abaixo, um, o outro, ou os dois.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {/* Caminho 1: você ensina (a entrevista) */}
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Você ensina</p>
          <OrbiEntrevista businessId={businessId} orbiColors={orbiColors} onDone={onDone} />
        </div>

        {/* Caminho 2: Orbi aprende sozinha com as conversas */}
        <div className="mt-1">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">A Orbi aprende sozinha</p>
          <Link href="/admin/agent/aprendizado" className="flex w-full items-center gap-3.5 rounded-[24px] border border-divider bg-surface-white p-5 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DEF3E3] text-[20px]">💬</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Aprende com as conversas reais</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-text-tertiary">
                {gapsPendentes > 0
                  ? `A Orbi já notou ${gapsPendentes} ${gapsPendentes === 1 ? "coisa que não soube" : "coisas que não soube"} responder. Veja e ensine ela.`
                  : "Conforme os visitantes conversam, a Orbi percebe o que não soube responder e sugere o que você pode ensinar."}
              </span>
            </span>
            {gapsPendentes > 0 ? (
              <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#1F9E4C] px-1.5 text-[12px] font-bold text-white">{gapsPendentes}</span>
            ) : (
              <span className="text-text-tertiary">→</span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
