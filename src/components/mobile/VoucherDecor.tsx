/** Linhas finas decorativas — traços brancos bem sutis por cima do degradê
 * do cupom. É só enfeite: fica atrás do conteúdo e não captura toque. */
export function VoucherLines({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      fill="none"
    >
      <path d="M-20 160 C 80 120, 140 190, 240 140 S 380 60, 430 90" stroke="white" strokeOpacity="0.18" strokeWidth="1" />
      <path d="M-20 185 C 90 150, 160 215, 260 165 S 400 90, 440 120" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
      <path d="M260 -10 C 300 40, 250 90, 300 140 S 380 190, 420 210" stroke="white" strokeOpacity="0.14" strokeWidth="1" />
      <circle cx="340" cy="30" r="46" stroke="white" strokeOpacity="0.10" strokeWidth="1" />
      <circle cx="340" cy="30" r="70" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
    </svg>
  );
}
