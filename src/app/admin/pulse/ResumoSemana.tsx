import Link from "next/link";
import type { ResumoSemanal } from "@/lib/resumoSemanal";
import { ResumoEmailToggle } from "./ResumoEmailToggle";

/** "Sua semana em palavras": os números traduzidos em frases e uma dica. */
export function ResumoSemana({ resumo, businessId, emailLigado }: { resumo: ResumoSemanal; businessId: string; emailLigado: boolean }) {
  return (
    <div className="mt-5 rounded-[24px] bg-surface-white p-5 shadow-[0_10px_24px_-14px_rgba(17,19,24,0.3)] ring-1 ring-black/[0.06]">
      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Sua semana em palavras</p>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {resumo.frases.map((f) => (
          <p key={f} className="text-[15px] leading-snug">{f}</p>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-surface-soft p-3.5">
        <p className="text-[12px] font-semibold text-text-secondary">O que fazer agora</p>
        <p className="mt-1 text-[14px] leading-snug">{resumo.dica.texto}</p>
        <Link href={resumo.dica.href} className="mt-3 inline-flex rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white">
          {resumo.dica.rotulo} →
        </Link>
      </div>
      <ResumoEmailToggle businessId={businessId} inicial={emailLigado} />
    </div>
  );
}
