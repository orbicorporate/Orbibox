/**
 * Avatar redondo com o logotipo do negócio, no lugar da esfera da Orbi,
 * pra quem prefere a própria marca na tela inicial. Em volta do logo, uma
 * única bolinha de luz na cor da Orbi configurada acende e apaga em posições
 * diferentes, como estrelinhas piscando (uma de cada vez).
 */
const ESTRELAS: { x: number; y: number }[] = [
  { x: 8, y: 14 },
  { x: 96, y: 30 },
  { x: 30, y: 104 },
  { x: 102, y: 82 },
  { x: -4, y: 66 },
  { x: 62, y: -6 },
];

export function OrbiAvatar({ logoUrl, size = 96, className = "", color }: { logoUrl: string; size?: number; className?: string; color?: string | null }) {
  const cor = color || "#B7F34A";
  const k = size / 96;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden>
      <div className="relative h-full w-full overflow-hidden rounded-full bg-background-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      </div>
      {ESTRELAS.map((e, i) => (
        <span
          key={i}
          className="orbi-estrela absolute rounded-full"
          style={{
            left: e.x * k,
            top: e.y * k,
            width: 7,
            height: 7,
            background: cor,
            boxShadow: `0 0 9px 2px ${cor}`,
            animationDelay: `${i * 1.3}s`,
          }}
        />
      ))}
    </div>
  );
}
