"use client";

import type { ReactNode } from "react";

/**
 * Ícones animados desenhados na mão (SVG próprio, gradiente e brilho),
 * mesma linguagem visual do Pin animado: nada de emoji do sistema. Cada
 * um roda com fundo transparente e uma animação leve própria (quique,
 * pulso, aceno, abano ou balanço), puro CSS, sem canvas.
 */
type IconProps = { size?: number; className?: string };

function wrap(svg: ReactNode, size: number, animClass: string) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${animClass}`}
      style={{ width: size, height: size, filter: "drop-shadow(0 2px 3px rgba(17,19,24,0.15))" }}
      aria-hidden
    >
      {svg}
    </span>
  );
}

/** Saco de dinheiro: amarrado em cima, "$" no corpo, degradê dourado. */
export function OrbiMoneyIcon({ size = 36, className = "" }: IconProps) {
  return (
    <span className={className}>
      {wrap(
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M9 4.5h6l1.6 3.2H7.4L9 4.5z" fill="#C98A1F" />
          <path
            d="M6.2 7.9c0-.55.45-1 1-1h9.6c.55 0 1 .45 1 1l1.35 9.15c.4 2.7-3 3.55-7.15 3.55s-7.55-.85-7.15-3.55L6.2 7.9z"
            fill="url(#orbiMoneyGrad)"
          />
          <text x="12" y="17" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#B9790F" fontFamily="system-ui, sans-serif">$</text>
          <defs>
            <linearGradient id="orbiMoneyGrad" x1="6" y1="7" x2="18" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFEBAD" />
              <stop offset="1" stopColor="#F0B429" />
            </linearGradient>
          </defs>
        </svg>,
        size,
        "orbi-sticker-bounce"
      )}
    </span>
  );
}

/** Etiqueta de desconto com "%": mesmo formato de tag de preço, furo e tudo. */
export function OrbiPercentIcon({ size = 36, className = "" }: IconProps) {
  return (
    <span className={className}>
      {wrap(
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 11.6V5c0-1.1.9-2 2-2h6.6c.53 0 1.04.21 1.41.59l8 8a2 2 0 0 1 0 2.82l-6.6 6.6a2 2 0 0 1-2.82 0l-8-8A2 2 0 0 1 3 11.6z"
            fill="url(#orbiTagGrad)"
          />
          <circle cx="7.6" cy="7.6" r="1.5" fill="rgba(255,255,255,0.9)" />
          <text x="14" y="17" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">%</text>
          <defs>
            <linearGradient id="orbiTagGrad" x1="3" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFA46E" />
              <stop offset="1" stopColor="#E4574B" />
            </linearGradient>
          </defs>
        </svg>,
        size,
        "orbi-sticker-bounce"
      )}
    </span>
  );
}

/** Seta num botão arredondado: aceno horizontal, "flexinha" que empurra. */
export function OrbiArrowIcon({ size = 36, className = "" }: IconProps) {
  return (
    <span className={className}>
      {wrap(
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="7" fill="url(#orbiArrowGrad)" />
          <path d="M9 7.8l5.2 4.2L9 16.2" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="orbiArrowGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8FD3FF" />
              <stop offset="1" stopColor="#2F63C9" />
            </linearGradient>
          </defs>
        </svg>,
        size,
        "orbi-sticker-nudge"
      )}
    </span>
  );
}

/** Coração cheio, degradê vermelho/rosa, bate como pulso. */
export function OrbiHeartIcon({ size = 36, className = "" }: IconProps) {
  return (
    <span className={className}>
      {wrap(
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 20.3S3.8 15.4 3.8 9.6C3.8 6.5 6.1 4 9 4c1.6 0 2.9.8 3 2.6C12.1 4.8 13.4 4 15 4c2.9 0 5.2 2.5 5.2 5.6 0 5.8-8.2 10.7-8.2 10.7z"
            fill="url(#orbiHeartGrad)"
          />
          <defs>
            <linearGradient id="orbiHeartGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF9EB8" />
              <stop offset="1" stopColor="#E4264C" />
            </linearGradient>
          </defs>
        </svg>,
        size,
        "orbi-sticker-pulse"
      )}
    </span>
  );
}

/** Presente: caixa com fita, mesma paleta roxa da ferramenta de gift. */
export function OrbiGiftIcon({ size = 36, className = "" }: IconProps) {
  return (
    <span className={className}>
      {wrap(
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="10.5" width="16" height="9.5" rx="1.3" fill="url(#orbiGiftGrad)" />
          <rect x="3" y="7.3" width="18" height="4" rx="1.2" fill="#7A22B0" />
          <rect x="10.7" y="7.3" width="2.6" height="12.7" fill="#FFD65C" />
          <path d="M9.3 7.3c-1.6 0-3-1.15-3-2.65C6.3 3.1 7.4 2 8.7 2c1.7 0 2.7 1.7 3.3 3.1l.3.6-.3.6c-.6 1.4-1.6 3-3.3 3z" fill="#B0309E" />
          <path d="M14.7 7.3c1.6 0 3-1.15 3-2.65C17.7 3.1 16.6 2 15.3 2c-1.7 0-2.7 1.7-3.3 3.1l-.3.6.3.6c.6 1.4 1.6 3 3.3 3z" fill="#B0309E" />
          <defs>
            <linearGradient id="orbiGiftGrad" x1="4" y1="10.5" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C495F0" />
              <stop offset="1" stopColor="#6D28D9" />
            </linearGradient>
          </defs>
        </svg>,
        size,
        "orbi-sticker-bounce"
      )}
    </span>
  );
}

/** Carinha feliz: circulo amarelo, dois olhos e um sorriso curvo. */
export function OrbiHappyIcon({ size = 36, className = "" }: IconProps) {
  return (
    <span className={className}>
      {wrap(
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.5" fill="url(#orbiHappyGrad)" />
          <circle cx="8.6" cy="10.2" r="1.25" fill="#7A4B0A" />
          <circle cx="15.4" cy="10.2" r="1.25" fill="#7A4B0A" />
          <path d="M7.6 13.8c1 1.9 2.9 2.9 4.4 2.9s3.4-1 4.4-2.9" stroke="#7A4B0A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <defs>
            <linearGradient id="orbiHappyGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFE79A" />
              <stop offset="1" stopColor="#F5A623" />
            </linearGradient>
          </defs>
        </svg>,
        size,
        "orbi-sticker-bounce"
      )}
    </span>
  );
}

/** Cachorrinho: carinha redonda com orelhas caídas, focinho e narizinho. */
export function OrbiDogIcon({ size = 36, className = "" }: IconProps) {
  return (
    <span className={className}>
      {wrap(
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M6.3 5.6c-2.2 0-3.9 2.1-3.3 5.3.5 2.8 2.5 4.1 4 3.2l2.1-4.9-2.8-3.6z" fill="url(#orbiDogGrad)" />
          <path d="M17.7 5.6c2.2 0 3.9 2.1 3.3 5.3-.5 2.8-2.5 4.1-4 3.2l-2.1-4.9 2.8-3.6z" fill="url(#orbiDogGrad)" />
          <circle cx="12" cy="13.2" r="7.6" fill="url(#orbiDogGrad)" />
          <ellipse cx="12" cy="16.1" rx="3.3" ry="2.5" fill="#FFF6EA" />
          <circle cx="12" cy="14.6" r="1" fill="#5A3A1E" />
          <circle cx="9.1" cy="12.4" r="1.1" fill="#5A3A1E" />
          <circle cx="14.9" cy="12.4" r="1.1" fill="#5A3A1E" />
          <defs>
            <linearGradient id="orbiDogGrad" x1="4" y1="5" x2="20" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F3D2A0" />
              <stop offset="1" stopColor="#C2884E" />
            </linearGradient>
          </defs>
        </svg>,
        size,
        "orbi-sticker-wag"
      )}
    </span>
  );
}

/** Vouchers/cupom: bilhete com picote e furo, degradê vermelho cereja, pulsa
 * devagar (chama atenção sem cansar), mesma linguagem dos outros selos. */
export function OrbiTicketIcon({ size = 36, className = "" }: IconProps) {
  return (
    <span className={className}>
      {wrap(
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M3 9.2c0-.66.54-1.2 1.2-1.2h15.6c.66 0 1.2.54 1.2 1.2v1.9a1.7 1.7 0 0 0 0 3.4v1.9c0 .66-.54 1.2-1.2 1.2H4.2A1.2 1.2 0 0 1 3 16.6v-1.9a1.7 1.7 0 0 0 0-3.4V9.2z"
            fill="url(#orbiTicketGrad)"
          />
          <path d="M14.6 7.2v9.6" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeDasharray="1.6 1.8" strokeLinecap="round" />
          <circle cx="17.6" cy="12" r="1.15" fill="#fff" />
          <defs>
            <linearGradient id="orbiTicketGrad" x1="3" y1="8" x2="21" y2="17" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E4264C" />
              <stop offset="1" stopColor="#A80F2B" />
            </linearGradient>
          </defs>
        </svg>,
        size,
        "orbi-sticker-pulse"
      )}
    </span>
  );
}

/** Folhinha: silhueta simples com nervura central, degradê verde. */
export function OrbiLeafIcon({ size = 36, className = "" }: IconProps) {
  return (
    <span className={className}>
      {wrap(
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M5 19.5C3.7 11 9 3.8 19.5 3.8c1.4 8.5-5.5 15.7-14.5 15.7z" fill="url(#orbiLeafGrad)" />
          <path d="M6 18.3C9 12.4 13 8.4 18 5.8" stroke="#0B4A2E" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
          <defs>
            <linearGradient id="orbiLeafGrad" x1="4" y1="3.8" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A8EFC0" />
              <stop offset="1" stopColor="#1EA66B" />
            </linearGradient>
          </defs>
        </svg>,
        size,
        "orbi-sticker-sway"
      )}
    </span>
  );
}
