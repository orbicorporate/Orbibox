"use client";

import { gravarFlag, useFlag } from "@/lib/useFlag";

export type Passo = { titulo: string; detalhe: string; feito: boolean; onClick: () => void };

/**
 * Passo a passo numerado pra quem está configurando pela primeira vez.
 * Cada passo marca sozinho quando fica pronto; o quadro some quando todos
 * estão feitos ou quando a pessoa toca em "Ocultar".
 */
export function GuiaPassos({ titulo, passos, chave }: { titulo: string; passos: Passo[]; chave: string }) {
  const oculto = useFlag(`guia_off_${chave}`);
  if (oculto || passos.every((p) => p.feito)) return null;
  return (
    <div className="rounded-[22px] border border-divider bg-surface-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-semibold">{titulo}</p>
        <button onClick={() => gravarFlag(`guia_off_${chave}`)} className="text-[12px] text-text-tertiary">Ocultar</button>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {passos.map((p, i) => (
          <button
            key={i}
            onClick={p.onClick}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${p.feito ? "" : "bg-surface-soft active:bg-divider/60"}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                p.feito ? "orbi-gradient text-on-background" : "border border-on-background/20 bg-surface-white text-on-background"
              }`}
            >
              {p.feito ? "✓" : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[14px] font-medium ${p.feito ? "text-text-tertiary line-through decoration-text-tertiary/40" : "text-on-background"}`}>{p.titulo}</span>
              {!p.feito && <span className="block text-[12px] leading-snug text-text-tertiary">{p.detalhe}</span>}
            </span>
            {!p.feito && <span className="shrink-0 text-text-tertiary" aria-hidden>→</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Seção recolhível controlada de fora (o passo a passo abre e rola até ela). */
export function Secao({
  id,
  aberto,
  onToggle,
  icone,
  titulo,
  descricao,
  status,
  children,
}: {
  id: string;
  aberto: boolean;
  onToggle: () => void;
  icone?: React.ReactNode;
  titulo: string;
  descricao: string;
  status?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 rounded-[22px] border border-divider bg-surface-white">
      <button type="button" aria-expanded={aberto} onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        {icone && <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-soft">{icone}</span>}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">{titulo}</span>
            {status}
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-text-tertiary">{descricao}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-text-tertiary transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {aberto && <div className="border-t border-divider px-4 pb-5 pt-4">{children}</div>}
    </div>
  );
}

/** Abre uma seção e rola até ela no próximo quadro. */
export function rolarAte(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}
