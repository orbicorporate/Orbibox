/** Linhas finas decorativas, traços brancos bem sutis por cima do degradê
 * do voucher. É só enfeite: fica atrás do conteúdo e não captura toque.
 * Uma faixa de reflexo diagonal reforça o ar metálico do fundo. */
export function VoucherLines({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id="voucherSheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="48%" stopColor="white" stopOpacity="0.10" />
          <stop offset="52%" stopColor="white" stopOpacity="0.10" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Faixa de reflexo, o brilho que "corta" o metal */}
      <path d="M-40 70 L 180 -30 L 230 -30 L 10 70 Z" fill="url(#voucherSheen)" />

      {/* Curvas finas, guilhoché discreto */}
      <path d="M-20 150 C 90 118, 150 178, 250 134 S 390 66, 440 96" stroke="white" strokeOpacity="0.16" strokeWidth="0.75" />
      <path d="M-20 168 C 96 138, 168 196, 268 150 S 410 84, 448 116" stroke="white" strokeOpacity="0.10" strokeWidth="0.75" />
      <path d="M-20 186 C 100 158, 180 214, 286 168 S 420 100, 456 134" stroke="white" strokeOpacity="0.07" strokeWidth="0.75" />

      {/* Anéis concêntricos finos, canto superior */}
      <circle cx="352" cy="24" r="40" stroke="white" strokeOpacity="0.12" strokeWidth="0.75" />
      <circle cx="352" cy="24" r="62" stroke="white" strokeOpacity="0.08" strokeWidth="0.75" />
      <circle cx="352" cy="24" r="84" stroke="white" strokeOpacity="0.05" strokeWidth="0.75" />
    </svg>
  );
}
