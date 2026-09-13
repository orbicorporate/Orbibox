"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

/**
 * Botão de compartilhar de verdade, abre a folha nativa do celular
 * (WhatsApp, Instagram, Mensagens, Copiar…) quando disponível. Em
 * desktop/navegadores sem suporte, copia o link e avisa.
 *
 * Quando `shareReady` é `false`, antes de compartilhar abre um aviso
 * perguntando se a pessoa quer configurar a capa e a descrição, pra o link
 * aparecer bonito no WhatsApp/Instagram em vez de "cru".
 */
export function ShareOrbiboxButton({
  url,
  title,
  className,
  children,
  shareReady = true,
}: {
  url: string;
  title: string;
  className?: string;
  children: React.ReactNode;
  shareReady?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);

  async function doShare() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sem clipboard */
    }
  }

  function handleClick() {
    // Se ainda não configurou a capa/descrição, pergunta antes.
    if (!shareReady) {
      setAsking(true);
      return;
    }
    doShare();
  }

  return (
    <>
      <button onClick={handleClick} className={className}>
        {copied ? "Link copiado ✓" : children}
      </button>

      {asking && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-on-background/50 p-4 backdrop-blur-sm sm:items-center" onClick={() => setAsking(false)}>
          <div className="w-full max-w-[400px] rounded-[28px] bg-surface-white p-6 shadow-[0_24px_70px_rgba(17,19,24,0.3)]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7EAFC] text-[26px]">🖼️</div>
            <p className="mt-4 text-center font-[family-name:var(--font-manrope)] text-[20px] font-bold leading-tight">
              Deixa seu link bonito antes?
            </p>
            <p className="mt-2 text-center text-[14px] leading-relaxed text-text-secondary">
              Você ainda não escolheu a capa e a descrição que aparecem quando alguém abre seu link no WhatsApp ou
              Instagram. Configurar leva 1 minuto e faz toda a diferença na primeira impressão.
            </p>

            <Link
              href="/admin/config/marca"
              onClick={() => setAsking(false)}
              className="mt-5 block rounded-full bg-button-primary py-3.5 text-center text-[15px] font-semibold text-white"
            >
              Configurar antes
            </Link>
            <button
              onClick={() => { setAsking(false); doShare(); }}
              className="mt-2.5 w-full rounded-full py-3 text-center text-[14px] font-medium text-text-secondary"
            >
              Compartilhar assim mesmo
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
