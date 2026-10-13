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
      <div className="mt-3 divide-y divide-divider overflow-hidden rounded-[20px] bg-surface-white ring-1 ring-black/[0.06]">
        <Link href="/resumo-semanal" className="flex min-h-[52px] items-center justify-between gap-3 px-4 text-[14px] active:bg-surface-soft">
          <span>Ver em página e salvar em PDF</span>
          <span aria-hidden className="text-text-tertiary">→</span>
        </Link>
        <ResumoEmailToggle businessId={businessId} inicial={emailLigado} />
      </div>
    </section>
  );
}
