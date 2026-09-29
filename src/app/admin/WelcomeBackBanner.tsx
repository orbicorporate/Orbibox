"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CHAVE = "orbi_last_visit";
const DIAS_PRA_CONSIDERAR_AUSENCIA = 3;

/**
 * Quem sumiu alguns dias e volta pode ficar perdido: não lembra o que já
 * preencheu, não sabe o que ainda falta. Esse banner aparece só nessa
 * hora, resume o que falta (se faltar algo) e manda pra "/admin/pendencias".
 * Guarda a data da última visita no localStorage do navegador, então é por
 * aparelho, não precisa de nenhuma coluna nova no banco pra isso.
 */
export function WelcomeBackBanner({
  businessName,
  pendencias,
}: {
  businessName: string;
  pendencias: { title: string; href: string }[];
}) {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    try {
      const ultima = window.localStorage.getItem(CHAVE);
      const agora = Date.now();
      if (ultima) {
        const dias = (agora - Number(ultima)) / (1000 * 60 * 60 * 24);
        if (dias >= DIAS_PRA_CONSIDERAR_AUSENCIA) setMostrar(true);
      }
      window.localStorage.setItem(CHAVE, String(agora));
    } catch {
      // localStorage indisponível (aba anônima etc.), sem banner, sem drama.
    }
  }, []);

  if (!mostrar) return null;

  const lista = pendencias.slice(0, 3);
  const resto = pendencias.length - lista.length;

  return (
    <div className="apr-pop relative mt-5 overflow-hidden rounded-[24px] border border-divider/80 bg-surface-white px-5 pb-4 pt-5 shadow-[0_4px_24px_rgba(17,19,24,0.05)]">
      {/* Um véu bem leve em degradê no canto, a assinatura da Orbi sem pesar. */}
      <span className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full orbi-gradient opacity-[0.18] blur-2xl" aria-hidden />

      <button
        type="button"
        onClick={() => setMostrar(false)}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-surface-soft"
        aria-label="Fechar"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Bem-vindo de volta</p>
      <p className="relative mt-1 pr-8 font-[family-name:var(--font-manrope)] text-[19px] font-semibold leading-snug tracking-[-0.01em]">
        Que bom te ver, {businessName}
      </p>
      <p className="relative mt-0.5 text-[13px] text-text-secondary">
        {pendencias.length === 0
          ? "Tudo em dia por aqui."
          : `${pendencias.length === 1 ? "Falta 1 coisa" : `Faltam ${pendencias.length} coisas`} pra deixar seu Orbibox completo.`}
      </p>

      {pendencias.length > 0 ? (
        <div className="relative mt-3">
          {lista.map((p, i) => (
            <Link
              key={p.href + p.title}
              href={p.href}
              className={`group flex items-center gap-3 py-3 ${i > 0 ? "border-t border-divider/70" : ""}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-on-background/15 text-[11px] font-semibold text-text-secondary">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] text-on-background">{p.title}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5" aria-hidden>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
          {resto > 0 && (
            <Link href="/admin/pendencias" className="mt-1 flex items-center justify-end gap-1 border-t border-divider/70 pt-3 text-[12.5px] font-medium text-text-secondary">
              Ver todas ({pendencias.length})
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      ) : (
        <p className="relative mt-3 flex items-center gap-2 text-[13px] text-text-secondary">
          <span className="orbi-gradient flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-on-background">✓</span>
          Seu Orbibox está completo. É só divulgar e acompanhar o Pulse.
        </p>
      )}
    </div>
  );
}
