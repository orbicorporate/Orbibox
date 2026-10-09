"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

/**
 * Linha fina que expande no próprio lugar: título sempre visível, e ao tocar
 * abre o texto de apoio e o botão que leva à tela certa. Evita sair da Home
 * só pra ler do que se trata.
 */
export function LinhaExpansivel({
  marcador,
  titulo,
  texto,
  rotulo,
  href,
  onAbrirLink,
  onFechar,
  className = "",
}: {
  marcador: ReactNode;
  titulo: string;
  texto: string;
  rotulo: string;
  href: string;
  onAbrirLink?: () => void;
  onFechar?: () => void;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  return (
    <div className={`rounded-2xl bg-surface-white ring-1 ring-black/[0.06] ${className}`}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          aria-controls={id}
          className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 rounded-2xl py-3 pl-4 pr-2 text-left active:opacity-70"
        >
          <span className="flex shrink-0 items-center" aria-hidden>{marcador}</span>
          <span className="min-w-0 flex-1 truncate text-[14px]">{titulo}</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 text-text-tertiary transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {onFechar && (
          <button type="button" onClick={onFechar} aria-label="Fechar" className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-tertiary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>
      <div id={id} className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${aberto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4">
            <p className="text-[13.5px] leading-snug text-text-secondary">{texto}</p>
            <Link href={href} onClick={onAbrirLink} className="mt-3 inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-on-background px-5 text-[14px] font-medium text-white active:scale-[0.98]">
              {rotulo} <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
