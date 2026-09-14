"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * "Como funciona" dos vouchers. Antes era um card grande no meio da página,
 * que empurrava tudo pra baixo mesmo pra quem já sabia. Agora é um botão
 * pequeno no topo (que treme pra ser notado) e o conteúdo abre em folha.
 */
export function VoucherExplainer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="orbi-shake-cta flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-surface-white px-3.5 py-2 text-[13px] font-semibold text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.08)]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 18h6M10 21h4" />
          <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
        </svg>
        Como funciona
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end bg-on-background/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto max-h-[86vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-background-main px-5 pb-8 pt-4"
            onClick={(e) => e.stopPropagation()}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="mx-auto mb-4 block h-1.5 w-12 cursor-pointer rounded-full bg-divider"
            />
            <p className="font-[family-name:var(--font-manrope)] text-[22px] font-semibold tracking-[-0.01em]">
              Como funcionam os vouchers
            </p>
            <div className="mt-4 flex flex-col gap-4">{children}</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full cursor-pointer rounded-full bg-on-background py-3.5 text-[15px] font-semibold text-white"
            >
              Entendi
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
