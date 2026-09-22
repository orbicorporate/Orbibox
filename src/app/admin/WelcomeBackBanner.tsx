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

  return (
    <div className="apr-pop mt-5 overflow-hidden rounded-[22px] border border-divider bg-surface-white p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full orbi-gradient text-[15px]">👋</span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-tight">Que bom te ver de novo, {businessName}!</p>
          <p className="mt-0.5 text-[12.5px] text-text-tertiary">Aqui vai um resumo rápido do que falta cuidar.</p>
        </div>
      </div>

      {pendencias.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {pendencias.slice(0, 3).map((p) => (
            <Link
              key={p.href + p.title}
              href={p.href}
              className="flex items-center justify-between rounded-2xl bg-surface-soft px-3.5 py-2.5"
            >
              <span className="text-[13px] font-medium">{p.title}</span>
              <span className="text-text-tertiary">›</span>
            </Link>
          ))}
          {pendencias.length > 3 && (
            <Link href="/admin/pendencias" className="text-center text-[12.5px] font-medium text-text-secondary underline">
              +{pendencias.length - 3} outra(s) pendência(s)
            </Link>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-[#E4F7EA] px-3.5 py-2.5 text-[13px] font-medium text-[#1F7A45]">
          ✓ Seu Orbibox está completo, é só continuar divulgando e acompanhando o Pulse.
        </p>
      )}
    </div>
  );
}
