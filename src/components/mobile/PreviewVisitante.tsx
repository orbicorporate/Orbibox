"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

/**
 * Espiada rápida na página pública, sem sair da tela de edição. Abre a
 * página de verdade num quadro de celular, então o que aparece aqui é
 * exatamente o que o visitante vê. Fecha e você continua onde estava.
 */
export function PreviewVisitante({ slug, className = "" }: { slug: string; className?: string }) {
  const [aberto, setAberto] = useState(false);
  // Muda a cada abertura pra forçar o iframe a recarregar, senão a prévia
  // fica com o conteúdo de antes das últimas edições.
  const [versao, setVersao] = useState(0);

  function abrir() {
    setVersao((v) => v + 1);
    setAberto(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={className || "flex cursor-pointer items-center gap-2 rounded-full bg-on-background px-4 py-2 text-[13px] font-semibold text-white"}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Ver como visitante
      </button>

      {aberto && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-on-background/60 p-4 backdrop-blur-sm"
          onClick={() => setAberto(false)}
        >
          <div className="flex w-full max-w-[420px] items-center justify-between px-1 pb-3">
            <p className="text-[13px] font-medium text-white/90">Assim o visitante vê</p>
            <div className="flex items-center gap-2">
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-white/20 px-3.5 py-1.5 text-[12.5px] font-medium text-white backdrop-blur-sm"
              >
                Abrir ↗
              </a>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="h-[min(78vh,760px)] w-full max-w-[420px] overflow-hidden rounded-[32px] border-[6px] border-[#1a1a1a] bg-background-main shadow-2xl"
          >
            <iframe
              key={versao}
              src={`/${slug}`}
              title="Prévia da sua página"
              className="h-full w-full border-0"
            />
          </div>

          <p className="mt-3 text-center text-[12px] text-white/70">Toque fora pra fechar</p>
        </div>,
        document.body
      )}
    </>
  );
}
