"use client";

import Link from "next/link";
import { trackClick } from "@/lib/track";
import { COVER_RATIO_BY_SIZE, colorOf, formatPrice, resumoCard, sizeOf, titleFontSize, type BoxSize } from "@/lib/showcase";
import { RATIOS } from "@/components/ui/ImageCropModal";
import { CurtirItem } from "@/components/clube/CurtirItem";

export type ItemCartao = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  price_max: number | null;
  image_url: string | null;
  brand_label: string | null;
  type: string;
  position: number;
  layout_size: string;
  box_color: string;
  footer_color: string | null;
  box_style: string;
  title_placement: string;
  target_url: string | null;
  link_kind: string | null;
};

/**
 * Cartão de item, o mesmo da vitrine (cor, título sobre a foto ou embaixo,
 * rodapé colorido, seta de entrada). A vitrine e a Home usam este componente,
 * assim o item tem a mesma cara nos dois lugares. Na Home, o formato escolhido
 * (destaque, grade, carrossel) define tamanho e proporção.
 */
function CartaoBase({
  item,
  slug,
  businessId,
  sessionId,
  largura,
  tamanho,
  proporcao,
  origem,
  curtir,
}: {
  item: ItemCartao;
  slug: string;
  businessId: string;
  sessionId: string | null;
  /** Classes de largura, ex.: "w-full" ou "w-[calc(50%-10px)]". */
  largura: string;
  /** Força o tamanho de exibição (afeta a fonte do título). */
  tamanho?: BoxSize;
  /** Força a proporção da foto; sem isso vale a do tamanho do item. */
  proporcao?: "quadrado" | "retrato" | "paisagem" | "banner";
  /** "home": veio do Destaque da tela inicial, então o Voltar da página do item volta pra lá. */
  origem?: "home";
  /** Reserva espaço pro coração no canto de baixo. */
  curtir?: boolean;
}) {
    const c = colorOf(item.box_color);
    const colorido = !!item.box_color && item.box_color !== "neutro";
    const fc = item.footer_color ? colorOf(item.footer_color) : null;
    const size: BoxSize = tamanho ?? sizeOf(item.layout_size);
    const ratio = proporcao ?? COVER_RATIO_BY_SIZE[size];
    // Mesma correção de sempre: "tem foto" é só ter uma URL.
    const photo = !!item.image_url;
    // Categoria de loja vai direto pro site do dono (decisão já tomada).
    // Produto e serviço abrem a página interna, com carrossel, descrição e CTAs.
    // "nenhum" = card só de vitrine, não clicável.
    const destino = item.link_kind === "nenhum"
      ? null
      : item.link_kind === "categoria-interna"
        ? item.target_url
      : item.link_kind === "categoria"
        ? item.target_url
        : item.target_url && item.link_kind === "externo"
          ? item.target_url
          : `/${slug}/p/${item.id}${origem === "home" ? "?de=home" : ""}`;
    const isExterno = item.link_kind === "categoria" || item.link_kind === "externo";
    const kindClique: "categoria" | "produto" | "link" =
      item.link_kind === "categoria" ? "categoria" : item.link_kind === "produto" ? "produto" : "link";
    const priceLabel = formatPrice(item);

    const miolo = (
      <>
        {photo ? (
        <div className="relative" style={{ aspectRatio: RATIOS[ratio].value }}>
          {photo && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url!}
                alt={item.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = "none";
                  if (img.parentElement) img.parentElement.style.backgroundColor = c.bg;
                }}
                onLoad={(e) => {
                  // Mesmo problema do editor: link que "carrega" mas devolve arquivo vazio.
                  const img = e.currentTarget;
                  if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                    img.style.display = "none";
                    if (img.parentElement) img.parentElement.style.backgroundColor = c.bg;
                  }
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              {item.title_placement === "sobre" && (
                <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-5 pt-12 ${curtir ? "pr-16" : ""}`}>
                  <p className="font-[family-name:var(--font-manrope)] font-semibold leading-[1.05] text-white" style={{ fontSize: titleFontSize(item.title, size) }}>
                    {item.title}
                  </p>
                  {item.description?.trim() && (
                    <p className="mt-1.5 line-clamp-1 text-[13px] leading-snug text-white/85">{resumoCard(item.description)}</p>
                  )}
                  {priceLabel && <p className="mt-1.5 text-[14px] font-medium text-white/90">{priceLabel}</p>}
                </div>
              )}
            </>
          )}
          {destino && photo && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border-[1.5px] border-white/90 bg-black/15 py-1 pl-3 pr-2.5 text-[12px] font-medium text-white backdrop-blur-[2px] [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              Entrar
              <span aria-hidden>{isExterno ? "↗" : "›"}</span>
            </span>
          )}
        </div>
        ) : (
          // Sem foto: só o rodapé. Nome, descrição e preço em um cartão branco, sem o quadrado colorido.
          // Neutro = branco. Qualquer outra cor escolhida em "Cor do card" pinta o cartão inteiro.
          <div
            className="flex min-h-[148px] flex-col justify-end gap-1 p-4 text-left"
            style={colorido ? { backgroundColor: c.bg, backgroundImage: c.degrade ?? undefined, color: c.fg } : undefined}
          >
            {/* Nome sempre embaixo, alinhado à esquerda: o topo fica livre para o lápis e o X do dono. */}
            <div className={`flex items-end justify-between gap-3 ${curtir ? "pr-11" : ""}`}>
              <div className="min-w-0">
                <p className="line-clamp-2 font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight">{item.title}</p>
                {item.description?.trim() && (
                  <p className={`mt-1 line-clamp-2 text-[13px] leading-snug ${colorido ? "opacity-75" : "text-text-secondary"}`}>{resumoCard(item.description)}</p>
                )}
                {priceLabel && (
                  <p className={`mt-1 font-[family-name:var(--font-manrope)] text-[14px] font-medium ${colorido ? "opacity-85" : "text-text-secondary"}`}>{priceLabel}</p>
                )}
              </div>
              {destino && !curtir && (
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorido ? "bg-white/25" : "bg-surface-soft text-on-background"}`} aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    {isExterno ? (<><path d="M7 17L17 7" /><path d="M8 7h9v9" /></>) : (<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>)}
                  </svg>
                </span>
              )}
            </div>
          </div>
        )}
        {photo && item.title_placement !== "sobre" && (
          <div className={`flex items-center justify-between gap-3 p-4 ${curtir ? "pr-16" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight" style={fc ? { color: fc.fg } : undefined}>{item.title}</p>
              {item.description?.trim() && (
                <p className={`mt-0.5 line-clamp-1 text-[13px] leading-snug ${fc ? "" : "text-text-tertiary"}`} style={fc ? { color: fc.fg, opacity: 0.7 } : undefined}>{resumoCard(item.description)}</p>
              )}
              {priceLabel && (
                <p className={`mt-0.5 font-[family-name:var(--font-manrope)] text-[15px] font-medium ${fc ? "" : "text-text-secondary"}`} style={fc ? { color: fc.fg, opacity: 0.85 } : undefined}>{priceLabel}</p>
              )}
            </div>
          </div>
        )}
      </>
    );

    const classe = `block text-left overflow-hidden rounded-[24px] bg-surface-white shadow-[0_2px_14px_rgba(17,19,24,0.06)] ${largura}`;
    const cardStyle = photo && fc && item.title_placement !== "sobre" ? { backgroundColor: fc.bg } : undefined;

    if (!destino) {
      return (
        <div className={classe} style={cardStyle}>
          {miolo}
        </div>
      );
    }
    return isExterno ? (
      <a
        key={item.id}
        href={destino}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick({ businessId, kind: kindClique, contentItemId: item.id, sessionId, targetUrl: destino })}
        className={classe}
        style={cardStyle}
      >
        {miolo}
      </a>
    ) : (
      <Link
        key={item.id}
        href={destino}
        onClick={() => { if (item.link_kind !== "categoria-interna") trackClick({ businessId, kind: "produto", contentItemId: item.id, sessionId, targetUrl: destino }); }}
        className={classe}
        style={cardStyle}
      >
        {miolo}
      </Link>
    );

}

export function CartaoItem(props: Parameters<typeof CartaoBase>[0]) {
  if (!props.curtir) return <CartaoBase {...props} />;
  return (
    <div className={`relative ${props.largura}`}>
      <CartaoBase {...props} largura="w-full" />
      <CurtirItem businessId={props.businessId} alvo="item" id={props.item.id} titulo={props.item.title} className="absolute bottom-3 right-3 z-10" />
    </div>
  );
}
