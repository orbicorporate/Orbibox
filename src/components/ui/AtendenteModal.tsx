"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

const CHAVE = "orbi_atendente";

/** Último nome usado neste aparelho, só para facilitar. Quem libera ainda precisa confirmar o nome. */
function nomeSalvo(): string {
  try { return window.localStorage.getItem(CHAVE) ?? ""; } catch { return ""; }
}

/**
 * Janela que pede o nome de quem está liberando um gift ou voucher no balcão. O nome fica
 * gravado junto com a baixa, para o dono saber quem liberou cada um e evitar fraude interna.
 */
export function AtendenteModal({
  titulo, descricao, confirmar, ocupado = false, onConfirmar, onCancelar,
}: {
  titulo: string;
  descricao?: string;
  confirmar: string;
  ocupado?: boolean;
  onConfirmar: (nome: string) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(nomeSalvo);
  const [erro, setErro] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const idTitulo = useId();
  const idCampo = useId();

  useEffect(() => {
    campo.current?.focus();
    campo.current?.select();
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelar(); };
    window.addEventListener("keydown", aoTeclar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", aoTeclar); document.body.style.overflow = overflow; };
  }, [onCancelar]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const limpo = nome.replace(/\s+/g, " ").trim();
    if (limpo.length < 2) { setErro("Digite o nome de quem está liberando."); campo.current?.focus(); return; }
    try { window.localStorage.setItem(CHAVE, limpo); } catch { /* sem storage */ }
    onConfirmar(limpo.slice(0, 60));
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-on-background/50 backdrop-blur-sm sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onCancelar(); }}>
      <form onSubmit={enviar} role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="w-full max-w-[440px] rounded-t-[28px] bg-surface-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px]">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FCE8EC]" aria-hidden>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4143A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
        </span>
        <h2 id={idTitulo} className="mt-4 font-[family-name:var(--font-manrope)] text-[22px] font-semibold leading-tight tracking-[-0.01em]">{titulo}</h2>
        <p className="mt-1.5 text-[14px] leading-snug text-text-secondary">{descricao ?? "Seu nome fica gravado junto com a liberação. O dono vê quem liberou cada um."}</p>

        <label htmlFor={idCampo} className="mt-5 block text-[13.5px] font-semibold">Seu nome</label>
        <input
          id={idCampo} ref={campo} value={nome} maxLength={60} autoComplete="name" aria-invalid={!!erro} aria-describedby={erro ? `${idCampo}-erro` : undefined}
          onChange={(e) => { setNome(e.target.value); setErro(null); }}
          placeholder="Ex.: Carla"
          className="mt-1.5 min-h-[54px] w-full rounded-2xl border-2 border-divider bg-white px-4 text-[17px] outline-none transition-colors focus:border-on-background focus-visible:ring-4 focus-visible:ring-black/10"
        />
        {erro && <p id={`${idCampo}-erro`} role="alert" className="mt-1.5 text-[13px] text-[#B4321F]">{erro}</p>}

        <button type="submit" disabled={ocupado} className="mt-5 min-h-[54px] w-full rounded-full bg-button-primary text-[15px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60">
          {ocupado ? "Liberando…" : confirmar}
        </button>
        <button type="button" disabled={ocupado} onClick={onCancelar} className="mt-1.5 min-h-[48px] w-full rounded-full text-[14px] font-medium text-text-secondary">Cancelar</button>
      </form>
    </div>,
    document.body,
  );
}
