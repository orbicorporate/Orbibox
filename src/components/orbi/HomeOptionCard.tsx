import type { ReactNode } from "react";
import { OrbiParticleSphere } from "./OrbiParticleSphere";
import { OrbiContactDisc } from "./OrbiContactDisc";
import { OrbiGoogleIcon } from "./OrbiGoogleIcon";
import { OrbiMapPin } from "./OrbiMapPin";
import { OrbiLogoBadge } from "./OrbiLogoBadge";
import { OrbiMoneyIcon, OrbiPercentIcon, OrbiArrowIcon, OrbiHeartIcon, OrbiGiftIcon, OrbiHappyIcon, OrbiDogIcon, OrbiLeafIcon } from "./OrbiEmojiStickers";
import { isAnimatedIcon } from "@/lib/showcase";

const EMOJI_STICKERS: Record<string, (size: number) => ReactNode> = {
  __money__: (s) => <OrbiMoneyIcon size={s} />,
  __percent__: (s) => <OrbiPercentIcon size={s} />,
  __arrow__: (s) => <OrbiArrowIcon size={s} />,
  __heart__: (s) => <OrbiHeartIcon size={s} />,
  __gift__: (s) => <OrbiGiftIcon size={s} />,
  __happy__: (s) => <OrbiHappyIcon size={s} />,
  __dog__: (s) => <OrbiDogIcon size={s} />,
  __leaf__: (s) => <OrbiLeafIcon size={s} />,
};

export type HomeCardLayout = "largo" | "medio";

/** Ícone de um box da Home, igual nos dois lugares (site real e preview do admin). */
export function HomeIcon({
  icon,
  boxLogo,
  color,
  orbiColors,
  businessLogo,
}: {
  icon: string;
  boxLogo?: string | null;
  color?: string;
  orbiColors: string[] | null;
  businessLogo?: string | null;
}) {
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[16px] ${icon === "__logo__" ? "" : "overflow-hidden"} ${isAnimatedIcon(icon) ? "" : color && color !== "transparent" ? "text-white" : "bg-surface-soft"}`}
      style={isAnimatedIcon(icon) ? { background: "transparent" } : color && color !== "transparent" ? { backgroundColor: color } : color === "transparent" ? { background: "transparent" } : undefined}
    >
      {icon === "__orb__" ? (
        <OrbiParticleSphere size={48} colors={orbiColors ?? undefined} className="rounded-full" />
      ) : icon === "__orbcheck__" ? (
        <OrbiParticleSphere size={48} variant="check" colors={orbiColors ?? undefined} className="rounded-full" />
      ) : icon === "__orbwa__" || icon === "__wadisc__" ? (
        <OrbiContactDisc size={48} className="rounded-full" />
      ) : icon === "__google__" ? (
        <OrbiGoogleIcon size={48} className="rounded-full" />
      ) : icon === "__pin__" ? (
        <OrbiMapPin size={32} />
      ) : EMOJI_STICKERS[icon] ? (
        EMOJI_STICKERS[icon](42)
      ) : icon === "__logo__" && (boxLogo || businessLogo) ? (
        <OrbiLogoBadge logoUrl={boxLogo || businessLogo!} size={44} />
      ) : (
        icon
      )}
    </span>
  );
}

/** Classes do "casco" do card, únicas pros dois formatos, fonte única de
 * verdade pra não desalinhar visual entre a Home real e o preview do admin.
 * `cupom` troca o fundo branco pelo degradê cereja com reflexo animado. */
export function homeCardShellClass(layout: HomeCardLayout, ai?: boolean, cupom?: boolean) {
  const ring = ai ? " ring-1 ring-orbi-gradient-start/60" : "";
  const bg = cupom ? "cupom-box text-white shadow-[0_10px_30px_rgba(204,23,57,0.4)]" : "bg-surface-white shadow-[0_2px_12px_rgba(17,19,24,0.05)]";
  if (layout === "largo") {
    return `flex w-full items-center gap-4 rounded-[24px] p-5 text-left ${bg}${ring}`;
  }
  return `flex h-full min-h-[168px] w-full flex-col justify-between rounded-[24px] p-5 text-left ${bg}${ring}`;
}

/** Miolo do card (ícone + título + descrição + indicador), igual nos dois
 * formatos e nos dois lugares que usam. `titleNode` deixa a Home trocar o
 * título por um campo de edição inline sem duplicar o resto do card. */
export function HomeOptionCardContent({
  layout,
  icon,
  boxLogo,
  color,
  orbiColors,
  businessLogo,
  title,
  titleNode,
  ai,
  description,
  stars,
  cupom,
  addressIndicator,
}: {
  layout: HomeCardLayout;
  icon: string;
  boxLogo?: string | null;
  color?: string;
  orbiColors: string[] | null;
  businessLogo?: string | null;
  title?: string;
  titleNode?: ReactNode;
  ai?: boolean;
  description: string;
  stars?: boolean;
  cupom?: boolean;
  addressIndicator?: ReactNode;
}) {
  const renderedTitle = titleNode ?? (
    <>
      {title}
      {ai ? <span className="orbi-gradient-text"> ✦</span> : null}
    </>
  );
  const descClass = cupom ? "text-white/85" : "text-text-tertiary";

  if (layout === "largo") {
    return (
      <>
        {cupom ? (
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-[22px]">🎟️</span>
        ) : (
          <HomeIcon icon={icon} boxLogo={boxLogo} color={color} orbiColors={orbiColors} businessLogo={businessLogo} />
        )}
        <span className="relative min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">{renderedTitle}</span>
          {stars && <span className="mt-0.5 block text-[14px] tracking-[2px] text-[#FBBC05]">★★★★★</span>}
          <span className={`mt-0.5 line-clamp-2 block text-[13px] ${descClass}`}>{description}</span>
        </span>
        <span className={`relative shrink-0 ${cupom ? "text-white/80" : "text-text-tertiary"}`}>{addressIndicator ?? "→"}</span>
      </>
    );
  }

  return (
    <>
      {cupom ? (
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-[22px]">🎟️</span>
      ) : (
        <HomeIcon icon={icon} boxLogo={boxLogo} color={color} orbiColors={orbiColors} businessLogo={businessLogo} />
      )}
      <span className="relative">
        <span className="flex min-h-[48px] items-end text-[19px] font-semibold leading-tight">{renderedTitle}</span>
        {stars && <span className="mt-0.5 block text-[13px] tracking-[2px] text-[#FBBC05]">★★★★★</span>}
        <span className={`mt-1 line-clamp-2 block text-[13px] leading-snug ${descClass}`}>{description}</span>
      </span>
    </>
  );
}

/** Card completo, sem interação, pro preview do admin. Na Home real, a
 * interatividade (clique, edição, setinhas) é montada em volta desse mesmo
 * conteúdo, então os dois nunca desalinham visualmente. */
export function HomeOptionCardPreview({
  layout,
  icon,
  boxLogo,
  color,
  orbiColors,
  businessLogo,
  title,
  ai,
  description,
  stars,
  cupom,
  className = "",
}: {
  layout: HomeCardLayout;
  icon: string;
  boxLogo?: string | null;
  color?: string;
  orbiColors: string[] | null;
  businessLogo?: string | null;
  title: string;
  ai?: boolean;
  description: string;
  stars?: boolean;
  cupom?: boolean;
  className?: string;
}) {
  return (
    <div className={`${homeCardShellClass(layout, ai, cupom)} ${className}`}>
      <HomeOptionCardContent
        layout={layout}
        icon={icon}
        boxLogo={boxLogo}
        color={color}
        orbiColors={orbiColors}
        businessLogo={businessLogo}
        title={title}
        ai={ai}
        description={description}
        stars={stars}
        cupom={cupom}
      />
    </div>
  );
}
