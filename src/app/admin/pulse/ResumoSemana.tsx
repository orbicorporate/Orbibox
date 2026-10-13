import Link from "next/link";
import type { ResumoSemanal } from "@/lib/resumoSemanal";
import { ResumoEmailToggle } from "./ResumoEmailToggle";
import { ResumoCarrossel } from "./ResumoCarrossel";

/** "Sua semana em palavras": os números em cartões que deslizam, com uma dica no fim. */
export function ResumoSemana({ resumo, businessId, emailLigado }: { resumo: ResumoSemanal; businessId: string; emailLigado: boolean }) {
  return (
    <section className="mt-5">
      <p className="text-[12px] uppercase tracking-[0.12em] text-text-tertiary">Sua semana em palavras</p>
      <ResumoCarrossel resumo={resumo} />
        <div className="mt-3 overflow-hidden rounded-[20px] border border-divider bg-surface-white/70">
        <Link href="/resumo-semanal" className="flex min-h-[48px] items-center justify-between gap-3 px-4 text-[13.5px] text-on-background active:bg-surface-soft">
          Ver em página ou salvar em PDF
          <span aria-hidden className="text-text-tertiary">→</span>
        </Link>
        <div className="border-t border-divider">
          <ResumoEmailToggle businessId={businessId} inicial={emailLigado} />
        </div>
      </div>
    </section>
  );
}
