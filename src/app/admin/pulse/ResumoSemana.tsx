import type { ResumoSemanal } from "@/lib/resumoSemanal";
import { ResumoEmailToggle } from "./ResumoEmailToggle";
import { ResumoCarrossel } from "./ResumoCarrossel";

/** "Sua semana em palavras": os números em cartões que deslizam, com uma dica no fim. */
export function ResumoSemana({ resumo, businessId, emailLigado }: { resumo: ResumoSemanal; businessId: string; emailLigado: boolean }) {
  return (
    <section className="mt-5">
      <p className="text-[12px] uppercase tracking-[0.12em] text-text-tertiary">Sua semana em palavras</p>
      <ResumoCarrossel resumo={resumo} />
      <ResumoEmailToggle businessId={businessId} inicial={emailLigado} />
    </section>
  );
}
