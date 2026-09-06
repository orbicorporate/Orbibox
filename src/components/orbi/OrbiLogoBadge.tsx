/**
 * Logotipo do negócio, com o mesmo acabamento em qualquer lugar que apareça
 * como ícone (box, ou a esfera principal): um pontinho de luz girando ao
 * redor e um brilho reflexivo que varre a imagem — nunca um círculo estático.
 * Reaproveita as mesmas animações CSS do OrbiAvatar (globals.css).
 */
export function OrbiLogoBadge({ logoUrl, size = 44, className = "" }: { logoUrl: string; size?: number; className?: string }) {
  // O ponto de luz e a espessura do brilho são calibrados pra uma esfera de
  // ~96px — escalamos proporcionalmente pra caber bem num ícone pequeno de box.
  const dot = Math.max(4, size * 0.083);
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden>
      <div className="orbi-avatar-ring absolute inset-0 rounded-full">
        <span
          className="orbi-avatar-dot absolute rounded-full"
          style={{ width: dot, height: dot, marginLeft: -dot / 2, top: -dot * 0.4 }}
        />
      </div>
      <div className="relative h-full w-full overflow-hidden rounded-full bg-surface-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        <div className="orbi-avatar-shine pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}
