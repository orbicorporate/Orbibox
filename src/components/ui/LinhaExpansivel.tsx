"use client";

import { useState, type ReactNode } from "react";

/**
 * Linha de ação que abre pra baixo: ícone, título, subtítulo e uma setinha.
 * Usada pra esconder o que é opcional (vídeo, prompt de IA) sem poluir a tela.
 */
export function LinhaExpansivel({
  icone,
  titulo,
  subtitulo,
  destaque = false,
  children,
}: {
  icone: ReactNode;
  titulo: string;
  subtitulo: string;
  destaque?: boolean;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className={`rounded-2xl border bg-surface-white transition-colors ${aberto ? "border-on-background/15" : "border-divider"}`}>
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${destaque ? "orbi-gradient text-on-background" : "bg-surface-soft text-on-background"}`}
        >
          {icone}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-on-background">{titulo}</span>
          <span className="block text-[12px] leading-snug text-text-tertiary">{subtitulo}</span>
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 text-text-tertiary transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {aberto && <div className="px-3.5 pb-3.5">{children}</div>}
    </div>
  );
}

/** Prompt pronto pra copiar e colar no ChatGPT (ou outro gerador). */
export function PromptParaIA({ texto, destino }: { texto: string; destino: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sem permissão de área de transferência: o texto continua visível pra copiar na mão */
    }
  }
  return (
    <div>
      <div className="rounded-xl bg-surface-soft p-3">
        <p className="select-text whitespace-pre-wrap text-[13px] leading-relaxed text-on-background">{texto}</p>
      </div>
      <ol className="mt-3 flex flex-col gap-1 text-[12px] text-text-secondary">
        <li>1. Copie o prompt</li>
        <li>2. Cole no ChatGPT e anexe fotos reais como referência</li>
        <li>3. Baixe a imagem e envie {destino}</li>
      </ol>
      <button type="button" onClick={copiar} className="mt-3 w-full rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white">
        {copiado ? "✓ Copiado" : "Copiar prompt"}
      </button>
    </div>
  );
}
