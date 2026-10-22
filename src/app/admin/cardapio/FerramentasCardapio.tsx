"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type LinhaFerramenta = { id: string; titulo: string; texto: string; aoTocar: () => void };

/**
 * Folha "Ferramentas" do Cardápio: o que se usa de vez em quando (colar pratos,
 * copiar do Catálogo, refazer fotos) fica aqui, fora da tela principal.
 * A parte de refazer fotos continua montada depois de aberta, para o trabalho
 * seguir mesmo que a pessoa feche a folha.
 */
export function FerramentasCardapio({
  aberto, aoFechar, linhas, refazer,
}: {
  aberto: boolean;
  aoFechar: () => void;
  linhas: LinhaFerramenta[];
  /** Tela de refazer fotos (null quando não há PDF e pratos para isso). */
  refazer: React.ReactNode | null;
}) {
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [visao, setVisao] = useState<"lista" | "refazer">("lista");
  const [manter, setManter] = useState(false);

  if (!montado) return null;
  if (!aberto && !manter) return null;

  const naLista = visao === "lista" || !refazer;
  return createPortal(
    <div className={aberto ? "" : "hidden"}>
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="fixed inset-0 z-[70] cursor-default bg-black/30" />
      <div role="dialog" aria-modal="true" aria-label="Ferramentas do cardápio" className="fixed inset-x-0 bottom-0 z-[71] mx-auto max-h-[85vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
        <div className="flex items-center justify-between gap-3">
          {naLista ? (
            <span className="text-[17px] font-medium">Ferramentas</span>
          ) : (
            <button type="button" onClick={() => setVisao("lista")} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[14px]">← Ferramentas</button>
          )}
          <button type="button" onClick={aoFechar} className="min-h-[40px] rounded-full bg-surface-soft px-5 text-[14px]">Fechar</button>
        </div>

        {naLista && (
          <ul className="mt-4 flex flex-col gap-2">
            {linhas.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={l.aoTocar} className="flex min-h-[64px] w-full flex-col justify-center rounded-2xl border border-divider px-4 py-3 text-left active:bg-surface-soft">
                  <span className="block text-[15px] font-semibold leading-tight">{l.titulo}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{l.texto}</span>
                </button>
              </li>
            ))}
            {refazer && (
              <li>
                <button type="button" onClick={() => { setManter(true); setVisao("refazer"); }} className="flex min-h-[64px] w-full flex-col justify-center rounded-2xl border border-divider px-4 py-3 text-left active:bg-surface-soft">
                  <span className="block text-[15px] font-semibold leading-tight">Refazer fotos pelo PDF</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">Troca pela foto do PDF</span>
                </button>
              </li>
            )}
          </ul>
        )}

        {manter && refazer && <div className={naLista ? "hidden" : ""}>{refazer}</div>}
      </div>
    </div>,
    document.body,
  );
}
