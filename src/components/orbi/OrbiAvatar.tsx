/**
 * Avatar redondo com o logotipo do negócio, no lugar da esfera da Orbi —
 * pra quem prefere a própria marca na tela inicial. Ganha um pontinho de luz
 * girando ao redor e um brilho reflexivo que varre a imagem, pra não ficar
 * um círculo estático e sem vida.
 */
export function OrbiAvatar({ logoUrl, size = 96, className = "" }: { logoUrl: string; size?: number; className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden>
      <div className="orbi-avatar-ring absolute inset-0 rounded-full">
        <span className="orbi-avatar-dot absolute rounded-full" />
      </div>
      <div className="relative h-full w-full overflow-hidden rounded-full bg-surface-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        <div className="orbi-avatar-shine pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}
