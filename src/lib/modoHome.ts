"use client";

import { useSyncExternalStore } from "react";

/** Como a tela inicial aparece: "grade" é o Modo Box (cards), "orbita" é o
 * Modo Órbita. O dono escolhe o padrão; cada visitante pode trocar, e a
 * escolha dele fica guardada só no aparelho dele. */
export type ModoHome = "grade" | "orbita";

const EVENTO = "orbibox-modo-home";
const chave = (slug: string) => `orbibox-modo-home:${slug}`;

function ler(slug: string): ModoHome | null {
  try {
    const v = window.localStorage.getItem(chave(slug));
    return v === "grade" || v === "orbita" ? v : null;
  } catch {
    return null;
  }
}

export function guardarModoHome(slug: string, modo: ModoHome) {
  try {
    window.localStorage.setItem(chave(slug), modo);
  } catch {
    /* aba anônima sem storage: vale só até recarregar */
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function esquecerModoHome(slug: string) {
  try {
    window.localStorage.removeItem(chave(slug));
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Escolha do visitante neste aparelho, ou null se ele nunca trocou. */
export function useModoHomeDoVisitante(slug: string): ModoHome | null {
  return useSyncExternalStore(assinar, () => ler(slug), () => null);
}
