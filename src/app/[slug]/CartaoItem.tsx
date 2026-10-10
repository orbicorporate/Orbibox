"use client";

import Link from "next/link";
import { trackClick } from "@/lib/track";
import { COVER_RATIO_BY_SIZE, colorOf, formatPrice, sizeOf, titleFontSize, type BoxSize } from "@/lib/showcase";
import { RATIOS } from "@/components/ui/ImageCropModal";

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
export function CartaoItem({
  item,
  slug,
  businessId,
  sessionId,
  largura,
  tamanho,
  proporcao,
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
}) {
    const c = colorOf(item.box_color);
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
      : item.link_kind === "categoria"
        ? item.target_url
        : item.target_url && item.link_kind === "externo"
          ? item.target_url
          : `/${slug}/p/${item.id}`;
    const isExterno = item.link_kind === "categoria" || item.link_kind === "externo";
    const kindClique: "categoria" | "produto" | "link" =
      item.link_kind === "categoria" ? "categoria" : item.link_kind === "produto" ? "produto" : "link";
    const priceLabel = formatPrice(item);

    const miolo = (
      <>
        <div className="relative" style={{ aspectRatio: RATIOS[ratio].value }}>
          {photo ? (
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
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-5 pt-12">
                  <p className="font-[family-name:var(--font-manrope)] font-semibold leading-[1.05] text-white" style={{ fontSize: titleFontSize(item.title, size) }}>
                    {item.title}
                  </p>
                  {item.description?.trim() && (
                    <p className="mt-1.5 line-clamp-1 text-[13px] leading-snug text-white/85">{item.description}</p>
                  )}
                  {priceLabel && <p className="mt-1.5 text-[14px] font-medium text-white/90">{priceLabel}</p>}
                </div>
              )}
            </>
          ) : (
            // Sem foto: o nome vira o conteúdo do box, centralizado, sem
            // rodapé branco repetindo a mesma informação embaixo. A fonte
            // se ajusta ao formato do card e ao tamanho do título, pra
            // título longo em card pequeno não estourar nem ficar apertado.
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center" style={{ backgroundColor: c.bg }}>
              <span
                className="font-[family-name:var(--font-open-sans)] font-bold leading-snug"
                style={{ color: c.fg, fontSize: titleFontSize(item.title, size) }}
              >
                {item.title}
              </span>
              {priceLabel && (
                <span className="font-[family-name:var(--font-open-sans)] text-[14px]" style={{ color: c.fg }}>
                  {priceLabel}
                </span>
              )}

            </div>
          )}
          {/* Sem foto já mostra a tag/o destino dentro do próprio box, a setinha
              no canto só faz sentido quando tem foto por cima e nada mais avisa. */}
          {/* Sem foto: só a setinha no canto, pulsando e acendendo,
              pra não disputar espaço com o nome no meio do box. */}
          {destino && !photo && (
            <span className="orbi-seta-pulsa pointer-events-none absolute right-4 top-4" style={{ color: c.fg }} aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                {isExterno ? (
                  <>
                    <path d="M7 17L17 7" />
                    <path d="M8 7h9v9" />
                  </>
                ) : (
                  <>
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </>
                )}
              </svg>
            </span>
          )}
          {destino && photo && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border-[1.5px] border-white/90 bg-black/15 py-1 pl-3 pr-2.5 text-[12px] font-medium text-white backdrop-blur-[2px] [text-shadow:0_1px_3px_rgba(0,0,0,0.35)]">
              Entrar
              <span aria-hidden>{isExterno ? "↗" : "›"}</span>
            </span>
          )}
        </div>
        {photo && item.title_placement !== "sobre" && (
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight" style={fc ? { color: fc.fg } : undefined}>{item.title}</p>
              {item.description?.trim() && (
                <p className={`mt-0.5 line-clamp-1 text-[13px] leading-snug ${fc ? "" : "text-text-tertiary"}`} style={fc ? { color: fc.fg, opacity: 0.7 } : undefined}>{item.description}</p>
              )}
              {priceLabel && (
                <p className={`mt-0.5 font-[family-name:var(--font-manrope)] text-[15px] font-medium ${fc ? "" : "text-text-secondary"}`} style={fc ? { color: fc.fg, opacity: 0.85 } : undefined}>{priceLabel}</p>
              )}
            </div>
            {destino && (
              size === "medio" ? (
                // Card pequeno: só a bolinha com a seta, pro título respirar.
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-current text-[13px]" style={{ color: fc ? fc.fg : "#111318" }}>
                  {isExterno ? "↗" : "→"}
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-current px-3 py-1 text-[12px] font-medium" style={{ color: fc ? fc.fg : "#111318" }}>
                  {isExterno
                    ? (item.link_kind === "categoria" ? "Ver" : "Entrar")
                    : "Entrar"}
                  <span aria-hidden>{isExterno ? "↗" : "→"}</span>
                </span>
              )
            )}
          </div>
        )}
      </>
    );

    const classe = `block overflow-hidden rounded-[24px] bg-surface-white shadow-[0_2px_14px_rgba(17,19,24,0.06)] ${largura}`;
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
        onClick={() => trackClick({ businessId, kind: "produto", contentItemId: item.id, sessionId, targetUrl: destino })}
        className={classe}
        style={cardStyle}
      >
        {miolo}
      </Link>
    );

}
