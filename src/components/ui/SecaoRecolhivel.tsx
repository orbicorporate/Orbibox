"use client";

import { useState } from "react";

/**
 * Tag de estado de um campo. Vermelha quando ainda não foi preenchido,
 * neutra quando é opcional e a Orbi cobre sozinha, verde quando está
 * configurado. A ideia é a pessoa bater o olho e saber o que falta.
 */
export function StatusTag({ preenchido, opcional = false }: { preenchido: boolean; opcional?: boolean }) {
  if (preenchido) {
    return (
      <span className="shrink-0 rounded-full bg-[#DEF3E3] px-2.5 py-1 text-[11px] font-semibold text-[#1F7A3D]">
        Configurado
      </span>
    );
  }
  if (opcional) {
    return (
      <span className="shrink-0 rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-semibold text-text-tertiary">
        Opcional
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-[#FDE7E7] px-2.5 py-1 text-[11px] font-semibold text-[#C0392B]">
      Ainda não configurado
    </span>
  );
}

/**
 * Card que recolhe o conteúdo atrás de um cabeçalho clicável, mostrando
 * no topo se aquilo já está preenchido. Começa fechado quando já está
 * configurado ou é opcional, e aberto quando falta algo obrigatório.
 */
export function SecaoRecolhivel({
  titulo,
  descricao,
  preenchido,
  opcional = false,
  children,
}: {
  titulo: string;
  descricao: string;
  preenchido: boolean;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(!preenchido && !opcional);

  return (
    <div className="rounded-[28px] bg-surface-white p-6 shadow-[0_2px_16px_rgba(17,19,24,0.05)]">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex w-full cursor-pointer items-start gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">{titulo}</span>
            <StatusTag preenchido={preenchido} opcional={opcional} />
          </span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-text-secondary">{descricao}</span>
        </span>
        <span className={`mt-0.5 shrink-0 text-text-tertiary transition-transform ${aberto ? "rotate-90" : ""}`}>
          →
        </span>
      </button>

      {aberto && <div className="mt-4">{children}</div>}
    </div>
  );
}
