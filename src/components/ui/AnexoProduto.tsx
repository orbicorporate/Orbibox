"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { pesoLegivel } from "@/lib/cardapio";
import { tituloPadraoAnexo, type Anexo } from "@/lib/anexo";

function Icone({ tipo }: { tipo: Anexo["tipo"] }) {
  return tipo === "pdf" ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 8" />
    </svg>
  );
}

/** Botão do anexo na página do produto: PDF abre em outra aba, imagem abre grande na própria tela. */
export function AnexoProduto({ anexo }: { anexo: Anexo }) {
  const [aberta, setAberta] = useState(false);
  const titulo = anexo.titulo.trim() || tituloPadraoAnexo(anexo.tipo);
  const sub = `${anexo.tipo === "pdf" ? "PDF" : "Imagem"}${anexo.bytes ? ` · ${pesoLegivel(anexo.bytes)}` : ""}`;

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    window.addEventListener("keydown", tecla);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", tecla); };
  }, [aberta]);

  const cartao = (
    <>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${anexo.tipo === "pdf" ? "text-white" : "bg-surface-soft text-on-background"}`} style={anexo.tipo === "pdf" ? { background: "linear-gradient(135deg,#E04A4F 0%,#C4282D 48%,#8A1D22 100%)", boxShadow: "0 8px 20px -8px rgba(138,29,34,0.55)" } : undefined}><Icone tipo={anexo.tipo} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold leading-tight">{titulo}</span>
        <span className="mt-0.5 block truncate text-[12px] text-text-secondary">{sub}</span>
      </span>
      <span className="shrink-0 rounded-full bg-on-background px-4 py-2 text-[12.5px] font-semibold text-white">Abrir</span>
    </>
  );
  const classe = "mt-6 flex w-full items-center gap-3 rounded-full border border-divider bg-white p-2 pr-3 text-left shadow-[0_4px_14px_rgba(17,19,24,0.06)] active:scale-[0.99]";

  return (
    <>
      {anexo.tipo === "pdf" ? (
        <a href={anexo.url} target="_blank" rel="noopener noreferrer" className={classe}>{cartao}</a>
      ) : (
        <button type="button" onClick={() => setAberta(true)} className={classe}>{cartao}</button>
      )}
      {aberta && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[120] flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label={titulo}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="min-w-0 truncate text-[14px] font-medium text-white">{titulo}</p>
            <button type="button" onClick={() => setAberta(false)} className="min-h-[40px] shrink-0 rounded-full bg-white/15 px-5 text-[14px] font-medium text-white active:scale-[0.97]">Fechar</button>
          </div>
          <button type="button" aria-label="Fechar" onClick={() => setAberta(false)} className="flex min-h-0 flex-1 cursor-default items-center justify-center px-3 pb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={anexo.url} alt={titulo} className="max-h-full max-w-full rounded-2xl object-contain" />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
