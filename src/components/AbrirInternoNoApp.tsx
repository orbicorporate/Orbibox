"use client";

import { useEffect } from "react";

/**
 * No app instalado na tela inicial (modo standalone), o iPhone ignora links
 * com target="_blank" que apontam pro próprio site: o toque não faz nada.
 * Aqui, só nesse modo, esses links internos abrem na mesma tela.
 * Links externos (WhatsApp, Maps, ChatGPT) continuam abrindo fora.
 */
export function AbrirInternoNoApp() {
  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as Element | null)?.closest?.("a[target='_blank']") as HTMLAnchorElement | null;
      if (!a || !a.href) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      e.preventDefault();
      location.assign(url.href);
    };
    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, []);
  return null;
}
