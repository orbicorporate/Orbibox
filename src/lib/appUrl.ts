// Endereço público oficial do Orbibox. Todos os links gerados pelo app usam este domínio.
export const APP_HOST = "orbibox.app";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || `https://${APP_HOST}`;

/** Origem para links que o usuário compartilha (usar só no navegador). Em teste local mantém o endereço local. */
export function origemPublica(): string {
  if (typeof window === "undefined") return APP_URL;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1") return window.location.origin;
  return APP_URL;
}
