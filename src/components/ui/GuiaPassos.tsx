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
  const proximo = passos.findIndex((p) => !p.feito);
  const feitos = passos.filter((p) => p.feito);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <p className="text-[13.5px] font-semibold">
          {titulo} <span className="ml-1 text-[12.5px] font-normal text-text-tertiary">{feitos.length} de {passos.length}</span>
        </p>
        <button onClick={() => gravarFlag(`guia_off_${chave}`)} className="text-[12px] text-text-tertiary">Ocultar</button>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {passos.map((p, i) => (p.feito ? null : <PassoLinha key={i} passo={p} n={i + 1} destaque={i === proximo} />))}
      </div>
      {/* Os feitos viram uma linha discreta, sem ocupar espaço de cartão. */}
      {feitos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-0.5">
          {feitos.map((p) => (
            <button key={p.titulo} onClick={p.onClick} className="inline-flex items-center gap-1 text-[12px] text-text-tertiary">
              <CheckMini /> {p.titulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckMini() {
  return (
    <span className="orbi-gradient flex h-3.5 w-3.5 items-center justify-center rounded-full">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#111318" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

/** Um passo pendente: o próximo ganha um fio em degradê da Orbi, os demais
 * ficam brancos com borda fina. Feito, vira só uma linha riscada. */
export function PassoLinha({ passo: p, n, destaque, fim }: { passo: Passo; n: number; destaque: boolean; fim?: React.ReactNode }) {
  if (p.feito) {
    return (
      <button onClick={p.onClick} className="flex w-full items-center gap-2 px-1 py-1 text-left text-[12.5px] text-text-tertiary">
        <CheckMini /> <span className="line-through decoration-text-tertiary/40">{p.titulo}</span>
      </button>
    );
  }
  const conteudo = (
    <span className="flex w-full items-center gap-3 px-3.5 py-2.5">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold ${
          destaque ? "bg-on-background text-white" : "bg-surface-soft text-text-tertiary"
        }`}
      >
        {n}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[14px] font-medium leading-snug ${destaque ? "text-on-background" : "text-text-secondary"}`}>{p.titulo}</span>
        <span className="block text-[12px] leading-snug text-text-tertiary">{p.detalhe}</span>
      </span>
      {fim ?? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${destaque ? "text-on-background" : "text-text-tertiary"}`} aria-hidden>
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      )}
    </span>
  );
  return destaque ? (
    <button onClick={p.onClick} className="orbi-gradient w-full rounded-2xl p-px text-left shadow-[0_2px_12px_rgba(120,220,160,0.12)] transition-transform active:scale-[0.99]">
      <span className="block rounded-[15px] bg-surface-white">{conteudo}</span>
    </button>
  ) : (
    <button onClick={p.onClick} className="w-full rounded-2xl border border-divider/80 bg-surface-white/70 text-left transition-transform active:scale-[0.99]">
      {conteudo}
    </button>
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
