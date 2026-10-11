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
      <Link href="/resumo-semanal" className="mt-3 flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-divider bg-surface-white px-5 text-[14px] text-on-background active:scale-[0.98]">
        Ver em página e salvar em PDF
      </Link>
      <ResumoEmailToggle businessId={businessId} inicial={emailLigado} />
    </section>
  );
}
