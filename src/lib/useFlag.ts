"use client";

import { useSyncExternalStore } from "react";

// Marcadores simples guardados no aparelho (ex.: "já escolheu o estilo",
// "escondeu o passo a passo"). Lidos com useSyncExternalStore pra funcionar
// igual no servidor (sempre falso) e no navegador.
const FLAG_EVENT = "orbi-flag";

function lerFlag(chave: string): boolean {
  try {
    return window.localStorage.getItem(chave) === "1";
  } catch {
    return false;
  }
}

export function gravarFlag(chave: string) {
  try {
    window.localStorage.setItem(chave, "1");
  } catch {
    /* sem armazenamento: o passo só não fica marcado */
  }
  window.dispatchEvent(new Event(FLAG_EVENT));
}

function assinarFlags(cb: () => void) {
  window.addEventListener(FLAG_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(FLAG_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useFlag(chave: string): boolean {
  return useSyncExternalStore(assinarFlags, () => lerFlag(chave), () => false);
}
