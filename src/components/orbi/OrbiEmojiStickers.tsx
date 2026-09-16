"use client";

/**
 * Selo de emoji "3D bonitinho": um badge de vidro com gradiente da cor do
 * tema, brilho superior recortado e sombra interna/externa, com o emoji
 * centralizado por cima e uma animação leve (quique, pulso, balanço ou
 * aceno), pra dar volume e movimento sem precisar desenhar cada ícone à
 * mão em canvas. Mesma linguagem visual do Pin animado, só que com um
 * emoji dentro em vez de um SVG próprio — base única reusada pelos 8
 * ícones abaixo, pra manter consistência entre eles.
 */
function Sticker({
  size,
  emoji,
  from,
  to,
  animClass,
  fontScale = 0.52,
}: {
  size: number;
  emoji: string;
  from: string;
  to: string;
  animClass: string;
  fontScale?: number;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${animClass}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(155deg, ${from} 0%, ${to} 100%)`,
        boxShadow: "0 3px 10px rgba(17,19,24,0.18), inset 0 1.5px 2px rgba(255,255,255,0.55), inset 0 -3px 6px rgba(0,0,0,0.12)",
      }}
      aria-hidden
    >
      {/* brilho superior, dá o efeito de vidro/3D */}
      <span
        className="pointer-events-none absolute inset-x-[16%] top-[7%] h-[36%] rounded-full"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)" }}
      />
      <span className="relative" style={{ fontSize: size * fontScale, lineHeight: 1 }}>{emoji}</span>
    </span>
  );
}

type IconProps = { size?: number; className?: string };

export function OrbiMoneyIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="💰" from="#FFE79A" to="#F0B429" animClass="orbi-sticker-bounce" /></span>;
}

export function OrbiPercentIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="🏷️" from="#FF9F6E" to="#E4574B" animClass="orbi-sticker-bounce" /></span>;
}

export function OrbiArrowIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="➡️" from="#8FD3FF" to="#2F63C9" animClass="orbi-sticker-nudge" /></span>;
}

export function OrbiHeartIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="❤️" from="#FF9EB8" to="#E4264C" animClass="orbi-sticker-pulse" /></span>;
}

export function OrbiGiftIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="🎁" from="#C495F0" to="#6D28D9" animClass="orbi-sticker-bounce" /></span>;
}

export function OrbiHappyIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="😊" from="#FFE79A" to="#F5A623" animClass="orbi-sticker-bounce" /></span>;
}

export function OrbiDogIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="🐶" from="#F3D2A0" to="#C2884E" animClass="orbi-sticker-wag" /></span>;
}

export function OrbiLeafIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="🍃" from="#A8EFC0" to="#1EA66B" animClass="orbi-sticker-sway" /></span>;
}
