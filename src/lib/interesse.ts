/**
 * Sinal de interesse do visitante (virou fã, avaliou, abriu o catálogo ou um produto).
 * Só depois dele o convite "Crie o seu Orbibox" aparece. Vale enquanto a aba estiver aberta.
 */
const CHAVE = "orbibox-interesse";
const EVENTO = "orbibox:interesse";

export function marcarInteresse() {
  try {
    if (sessionStorage.getItem(CHAVE) === "1") return;
    sessionStorage.setItem(CHAVE, "1");
  } catch { /* sem armazenamento: o convite simplesmente não aparece */ }
  window.dispatchEvent(new Event(EVENTO));
}

export function assinarInteresse(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
}

export function temInteresse(): boolean {
  try { return sessionStorage.getItem(CHAVE) === "1"; } catch { return false; }
}
