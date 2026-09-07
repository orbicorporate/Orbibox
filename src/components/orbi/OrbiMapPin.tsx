/**
 * Pin de mapa animado — quica suavemente com uma sombra pulsando embaixo,
 * como um marcador "pousando" no lugar. CSS puro (leve), sem canvas.
 */
export function OrbiMapPin({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`relative inline-flex flex-col items-center ${className}`} style={{ width: size, height: size * 1.15 }} aria-hidden>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="orbi-pin-icon"
        style={{ filter: "drop-shadow(0 2px 3px rgba(17,19,24,0.15))" }}
      >
        <path
          d="M12 2C7.58 2 4 5.58 4 10c0 5.25 6.6 11.14 7.28 11.73a1.1 1.1 0 0 0 1.44 0C13.4 21.14 20 15.25 20 10c0-4.42-3.58-8-8-8z"
          fill="url(#orbiPinGrad)"
        />
        <circle cx="12" cy="10" r="3.4" fill="white" />
        <defs>
          <linearGradient id="orbiPinGrad" x1="4" y1="2" x2="20" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--orbi-gradient-start)" />
            <stop offset="1" stopColor="var(--orbi-gradient-end)" />
          </linearGradient>
        </defs>
      </svg>
      <span className="orbi-pin-shadow mt-[-2px] h-1.5 w-3.5 rounded-full bg-on-background" />
    </span>
  );
}
