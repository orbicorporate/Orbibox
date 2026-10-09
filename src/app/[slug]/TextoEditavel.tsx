"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * Texto da página que o dono edita ali mesmo: toca, escreve, toca fora e salva.
 * Para o visitante (editavel = false) é só o texto, sem nada a mais.
 */
export function TextoEditavel({
  editavel,
  valor,
  onSalvar,
  children,
  className = "",
  inputClassName = "",
  multilinha = false,
  placeholder,
  rotulo,
}: {
  editavel: boolean;
  valor: string;
  onSalvar: (novo: string) => void;
  children: ReactNode;
  className?: string;
  inputClassName?: string;
  multilinha?: boolean;
  placeholder?: string;
  rotulo: string;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(valor);
  const campo = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  if (!editavel) return <>{children}</>;

  function abrir() {
    setRascunho(valor);
    setEditando(true);
    window.setTimeout(() => campo.current?.focus(), 0);
  }
  function fechar(salvar: boolean) {
    setEditando(false);
    const novo = rascunho.trim();
    if (salvar && novo && novo !== valor.trim()) onSalvar(novo);
  }

  if (editando) {
    const comum = {
      ref: campo,
      value: rascunho,
      placeholder,
      "aria-label": rotulo,
      onChange: (e: { target: { value: string } }) => setRascunho(e.target.value),
      onBlur: () => fechar(true),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Escape") fechar(false);
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          fechar(true);
        }
      },
      className: `w-full rounded-2xl border border-on-background/30 bg-surface-white/80 px-3 py-2 text-center outline-none focus:border-on-background ${inputClassName}`,
    };
    return multilinha ? <textarea rows={3} {...comum} /> : <input {...comum} />;
  }

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={`Editar ${rotulo}`}
      className={`group relative block w-full cursor-text rounded-2xl text-center outline-dashed outline-1 outline-offset-4 outline-black/15 active:outline-black/40 ${className}`}
    >
      {children}
      <span aria-hidden className="absolute -right-1 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-surface-white text-[11px] text-text-secondary shadow ring-1 ring-black/10">✎</span>
    </button>
  );
}
