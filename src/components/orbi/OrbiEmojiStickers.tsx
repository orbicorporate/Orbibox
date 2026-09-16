"use client";

/**
 * Emoji animado com fundo transparente: sem badge, sem bolha de cor atrás,
 * o emoji sozinho, grande, com uma animação leve (quique, pulso, balanço
 * ou aceno). Segue a mesma regra dos outros ícones animados do app (Pin,
 * Google, disco de contato): herda o fundo do box, nunca ganha um
 * quadradinho de cor por trás. Base única reusada pelos 8 ícones abaixo.
 */
function Sticker({
  size,
  emoji,
  animClass,
}: {
  size: number;
  emoji: string;
  animClass: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${animClass}`}
      style={{ width: size, height: size, fontSize: size * 0.86, lineHeight: 1 }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

type IconProps = { size?: number; className?: string };

export function OrbiMoneyIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="💰" animClass="orbi-sticker-bounce" /></span>;
}

export function OrbiPercentIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="🏷️" animClass="orbi-sticker-bounce" /></span>;
}

export function OrbiArrowIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="➡️" animClass="orbi-sticker-nudge" /></span>;
}

export function OrbiHeartIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="❤️" animClass="orbi-sticker-pulse" /></span>;
}

export function OrbiGiftIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="🎁" animClass="orbi-sticker-bounce" /></span>;
}

export function OrbiHappyIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="😊" animClass="orbi-sticker-bounce" /></span>;
}

export function OrbiDogIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="🐶" animClass="orbi-sticker-wag" /></span>;
}

export function OrbiLeafIcon({ size = 36, className = "" }: IconProps) {
  return <span className={className}><Sticker size={size} emoji="🍃" animClass="orbi-sticker-sway" /></span>;
}
