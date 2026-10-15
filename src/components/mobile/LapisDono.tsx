"use client";

import { AbrirEditor } from "./EditarNoLugar";

/**
 * Lápis redondo que só o dono vê quando navega pela própria página.
 * Abre o editor daquela parte num painel por cima, sem sair da tela.
 */
export function LapisDono({ href, rotulo, className = "" }: { href: string; rotulo: string; className?: string }) {
  return (
    <AbrirEditor
      href={href}
      rotulo={rotulo}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-divider bg-surface-white/90 text-text-secondary shadow-md backdrop-blur active:scale-95 ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
    </AbrirEditor>
  );
}
