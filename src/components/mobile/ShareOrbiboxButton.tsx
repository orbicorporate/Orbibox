"use client";

import { useState } from "react";

/**
 * Botão de compartilhar de verdade — abre a folha nativa do celular
 * (WhatsApp, Instagram, Mensagens, Copiar…) quando disponível. Em
 * desktop/navegadores sem suporte, copia o link e avisa.
 */
export function ShareOrbiboxButton({
  url,
  title,
  className,
  children,
}: {
  url: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Pessoa cancelou a folha de compartilhamento — não faz nada.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem clipboard também — não tem mais o que fazer por aqui.
    }
  }

  return (
    <button onClick={handleShare} className={className}>
      {copied ? "Link copiado ✓" : children}
    </button>
  );
}
