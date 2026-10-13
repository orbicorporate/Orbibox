/** Ícones de linha, finos e sem preenchimento, usados nas telas de criação de promoção. */
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconePresente = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><rect x="3.5" y="9" width="17" height="11" rx="2" /><path d="M2.5 9h19v-2.5a1 1 0 00-1-1h-17a1 1 0 00-1 1V9zM12 5.5V20M12 5.5c-1-2.5-4.5-3-4.5-.8 0 1.4 2 1.8 4.5.8zm0 0c1-2.5 4.5-3 4.5-.8 0 1.4-2 1.8-4.5.8z" /></svg>
);
export const IconeReais = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><circle cx="12" cy="12" r="9" /><path d="M14.5 9.2c-.4-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.5 5 1.3 5 3.8 0 1.1-1.1 1.9-2.5 1.9-1.2 0-2.2-.5-2.6-1.4M12 6.5V8m0 8v1.5" /></svg>
);
export const IconePorcento = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M18.5 5.5l-13 13" /><circle cx="7.5" cy="7.5" r="2.2" /><circle cx="16.5" cy="16.5" r="2.2" /></svg>
);
export const IconePessoas = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19c.5-3.2 3-5 6-5s5.5 1.8 6 5M16 5.6a3 3 0 010 5.8M18 14.3c1.6.6 2.7 2.2 3 4.7" /></svg>
);
export const IconeRelogio = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconeCalendario = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const IconeInfinito = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M12 12c-1.6-2.4-3-3.5-4.7-3.5a3.5 3.5 0 000 7c1.7 0 3.1-1.1 4.7-3.5zm0 0c1.6 2.4 3 3.5 4.7 3.5a3.5 3.5 0 000-7c-1.7 0-3.1 1.1-4.7 3.5z" /></svg>
);
export const IconeLapis = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
);
export const IconeCheck = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const IconeFechar = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconeVoltar = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconeFoto = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="10.5" r="1.7" /><path d="M21 16l-5-4.5L7 19" /></svg>
);
export const IconeEstrela = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8L3.6 9.6l5.8-.8L12 3.5z" /></svg>
);
export const IconeLink = ({ size = 24 }: { size?: number }) => (
  <svg {...base} width={size} height={size}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1" /></svg>
);
