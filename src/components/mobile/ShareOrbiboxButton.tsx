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
  configHref = "/admin/config/marca",
}: {
  url: string;
  title: string;
  className?: string;
  children: React.ReactNode;
  shareReady?: boolean;
  configHref?: string;
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
    // Sempre abre o modal antes de compartilhar: se já configurou, pergunta se
    // quer revisar a capa/descrição; se não, leva pra configurar.
    setAsking(true);
  }

  return (
    <>
      <button onClick={handleClick} className={className}>
        {copied ? "Link copiado ✓" : children}
      </button>

      {asking && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-on-background/50 p-4 backdrop-blur-sm sm:items-center" onClick={() => setAsking(false)}>
          <div className="w-full max-w-[400px] rounded-[28px] bg-surface-white p-6 shadow-[0_24px_70px_rgba(17,19,24,0.3)]" onClick={(e) => e.stopPropagation()}>
            {/* Ícone de linha, desenhado: o emoji 🖼️ anterior virava um quadro
                dourado colorido no iOS e destoava do resto do painel. */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-text-secondary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="4" width="18" height="13" rx="2.5" />
                <circle cx="8.5" cy="9" r="1.4" />
                <path d="M3 14.5l4.2-3.4a1.6 1.6 0 0 1 2 0L14 15" />
                <path d="M8 21h8" />
              </svg>
            </div>

            {shareReady ? (
              <>
                <p className="mt-5 text-center font-[family-name:var(--font-manrope)] text-[22px] font-semibold leading-tight tracking-[-0.01em]">
                  Confira como seu link aparece
                </p>
                <p className="mt-2.5 text-center text-[15px] leading-relaxed text-text-secondary">
                  No WhatsApp e no Instagram, quem recebe vê primeiro a capa e a descrição, antes de abrir a página.
                </p>
                <Link
                  href={configHref}
                  onClick={() => setAsking(false)}
                  className="mt-6 block rounded-full border border-divider bg-surface-white py-3.5 text-center text-[15px] font-semibold"
                >
                  Ver capa e descrição
                </Link>
                <button
                  onClick={() => { setAsking(false); doShare(); }}
                  className="mt-2.5 w-full rounded-full bg-button-primary py-3.5 text-center text-[15px] font-semibold text-white"
                >
                  Compartilhar agora
                </button>
              </>
            ) : (
              <>
                <p className="mt-5 text-center font-[family-name:var(--font-manrope)] text-[22px] font-semibold leading-tight tracking-[-0.01em]">
                  Seu link ainda não tem capa
                </p>
                <p className="mt-2.5 text-center text-[15px] leading-relaxed text-text-secondary">
                  Sem capa e descrição, o WhatsApp mostra só o endereço cru. Definir leva um minuto e muda a primeira impressão.
                </p>
                <Link
                  href={configHref}
                  onClick={() => setAsking(false)}
                  className="mt-6 block rounded-full bg-button-primary py-3.5 text-center text-[15px] font-semibold text-white"
                >
                  Definir capa e descrição
                </Link>
                <button
                  onClick={() => { setAsking(false); doShare(); }}
                  className="mt-2 w-full rounded-full py-3 text-center text-[14.5px] font-medium text-text-tertiary"
                >
                  Compartilhar assim mesmo
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
