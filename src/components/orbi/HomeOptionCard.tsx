import type { CSSProperties, ReactNode } from "react";
import { OrbiParticleSphere } from "./OrbiParticleSphere";
import { OrbiContactDisc } from "./OrbiContactDisc";
import { OrbiGoogleIcon } from "./OrbiGoogleIcon";
import { OrbiMapPin } from "./OrbiMapPin";
import { OrbiLogoBadge } from "./OrbiLogoBadge";
import { OrbiMoneyIcon, OrbiPercentIcon, OrbiArrowIcon, OrbiHeartIcon, OrbiGiftIcon, OrbiHappyIcon, OrbiDogIcon, OrbiLeafIcon, OrbiTicketIcon } from "./OrbiEmojiStickers";
import { isAnimatedIcon, contrastFg } from "@/lib/showcase";

const EMOJI_STICKERS: Record<string, (size: number) => ReactNode> = {
  __money__: (s) => <OrbiMoneyIcon size={s} />,
  __percent__: (s) => <OrbiPercentIcon size={s} />,
  __arrow__: (s) => <OrbiArrowIcon size={s} />,
  __heart__: (s) => <OrbiHeartIcon size={s} />,
  __gift__: (s) => <OrbiGiftIcon size={s} />,
  __happy__: (s) => <OrbiHappyIcon size={s} />,
  __dog__: (s) => <OrbiDogIcon size={s} />,
  __leaf__: (s) => <OrbiLeafIcon size={s} />,
  __ticket__: (s) => <OrbiTicketIcon size={s} />,
};

/** Se a cor própria escolhida pro box é clara o bastante pra precisar de
 * texto/ícone escuro em cima (branco, champagne, marfim etc.) em vez do
 * branco padrão, que ficaria ilegível. */
function needsDarkFg(color?: string | null): boolean {
  return !!color && isCustomBoxColor(color) && contrastFg(color) === "#111318";
}

export type HomeCardLayout = "largo" | "medio";

/** Cor "de verdade" escolhida pro box: descarta o preto padrão (que todo
 * box novo carrega antes de o dono escolher algo) e o transparente (usado
 * pelos boxes fixos que não devem pintar nada). Fonte única de verdade pra
 * decidir tanto se o card inteiro ganha o fundo metalizado quanto se o
 * ícone precisa virar um contorno/fundo translúcido em vez de sólido. */
export function isCustomBoxColor(color?: string | null): boolean {
  return !!color && color !== "transparent" && color.toLowerCase() !== "#111318";
}

/** Ícone de um box da Home, igual nos dois lugares (site real e preview do admin). */
export function HomeIcon({
  icon,
  boxLogo,
  color,
  orbiColors,
  businessLogo,
  cupom,
}: {
  icon: string;
  boxLogo?: string | null;
  color?: string;
  orbiColors: string[] | null;
  businessLogo?: string | null;
  cupom?: boolean;
}) {
  if (icon === "__none__") return null;
  const custom = isCustomBoxColor(color);
  const dark = needsDarkFg(color);
  // Sem a "bola" atrás: o ícone fica solto no box, só com a cor do texto certa.
  const tom = custom ? (dark ? "text-[#111318]" : "text-white") : cupom ? "text-white" : color && color !== "transparent" ? "text-white" : "text-on-background";
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center text-[22px] ${icon === "__logo__" ? "" : "overflow-hidden"} ${isAnimatedIcon(icon) || icon === "__logo__" ? "" : tom}`}
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
        <OrbiLogoBadge logoUrl={boxLogo || businessLogo!} size={44} ringColor={color} />
      ) : (
        icon
      )}
    </span>
  );
}

/** Classes do "casco" do card, únicas pros dois formatos, fonte única de
 * verdade pra não desalinhar visual entre a Home real e o preview do admin.
 * `cupom` troca o fundo branco pelo degradê cereja padrão do box de
 * Vouchers; se o dono escolher uma cor própria pra ele (mesma regra dos
 * outros boxes), essa cor tem prioridade sobre o vermelho padrão. */
export function homeCardShellClass(layout: HomeCardLayout, ai?: boolean, cupom?: boolean, color?: string | null) {
  const ring = ""; // sem a linha verde em volta do box da Orbi
  const custom = isCustomBoxColor(color);
  const dark = needsDarkFg(color);
  const bg = custom
    ? `box-metal ${dark ? "text-[#111318]" : "text-white"} shadow-[0_2px_10px_rgba(17,19,24,0.10)]`
    : cupom
      ? "cupom-box text-white shadow-[0_2px_10px_rgba(204,23,57,0.18)]"
      : "bg-surface-white border border-[#111318]/10 shadow-[0_1px_4px_rgba(17,19,24,0.04)]";
  if (layout === "largo") {
    return `flex w-full items-end gap-4 rounded-[22px] p-4 text-left ${bg}${ring}`;
  }
  return `flex h-full min-h-[116px] w-full flex-col justify-between rounded-[22px] p-4 text-left ${bg}${ring}`;
}

/** Estilo inline que acompanha `homeCardShellClass`: só a cor escolhida
 * entra como custom property, pro `.box-metal` (globals.css) montar o
 * degradê metalizado em cima dela. */
export function homeCardShellStyle(color?: string | null): CSSProperties | undefined {
  if (!isCustomBoxColor(color)) return undefined;
  return { "--box-color": color } as CSSProperties;
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
  onIconClick,
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
  /** No modo de edição da página: toque no ícone abre as opções de ícone. */
  onIconClick?: () => void;
}) {
  const iconeNode = onIconClick ? (
    <span
      role="button"
      tabIndex={0}
      aria-label="Trocar o ícone"
      onClick={(e) => { e.stopPropagation(); onIconClick(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onIconClick(); } }}
      className="relative w-fit shrink-0 cursor-pointer self-start rounded-full active:opacity-60"
    >
      {icon === "__none__" ? (
        <span className="flex h-12 w-12 items-center justify-center text-[20px] opacity-50" aria-hidden>＋</span>
      ) : (
        <HomeIcon icon={icon} boxLogo={boxLogo} color={color} orbiColors={orbiColors} businessLogo={businessLogo} cupom={cupom} />
      )}
    </span>
  ) : (
    <HomeIcon icon={icon} boxLogo={boxLogo} color={color} orbiColors={orbiColors} businessLogo={businessLogo} cupom={cupom} />
  );
  const renderedTitle = titleNode ?? (
    <>
      {title}
      {ai ? <span className="orbi-gradient-text"> ✦</span> : null}
    </>
  );
  const custom = isCustomBoxColor(color);
  const dark = needsDarkFg(color);
  const onDarkOrRed = cupom || custom;
  // Experimento minimalista: só o título aparece no box. A descrição continua
  // no dado (e no editor), só não é mostrada aqui.
  void description;

  if (layout === "largo") {
    return (
      <>
        {iconeNode}
        <span className="relative min-w-0 flex-1">
          <span className="block text-[16px] font-normal">{renderedTitle}</span>
          {stars && <span className="mt-0.5 block text-[14px] tracking-[2px] text-[#FBBC05]">★★★★★</span>}
        </span>
        <span className={`relative shrink-0 ${onDarkOrRed ? (dark ? "text-[#111318]/80" : "text-white/80") : "text-text-tertiary"}`}>{addressIndicator ?? "→"}</span>
      </>
    );
  }

  return (
    <>
      {iconeNode}
      <span className="relative mt-auto">
        <span className="flex min-h-[40px] items-end text-[17px] font-normal leading-tight">{renderedTitle}</span>
        {stars && <span className="mt-0.5 block text-[13px] tracking-[2px] text-[#FBBC05]">★★★★★</span>}
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
    <div className={`${homeCardShellClass(layout, ai, cupom, color)} ${className}`} style={homeCardShellStyle(color)}>
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
