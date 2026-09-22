"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trackClick, whatsappLink } from "@/lib/track";
import { COVER_RATIO_BY_SIZE, formatPrice, sizeOf, youtubeId, instagramReelId } from "@/lib/showcase";
import { RATIOS } from "@/components/ui/ImageCropModal";

type Business = {
  id: string;
  name: string;
  slug: string;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  contact_email: string | null;
};

type Item = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  price_max: number | null;
  image_url: string | null;
  gallery_urls: string[];
  brand_label: string | null;
  target_url: string | null;
  link_kind: string | null;
  layout_size: string;
  type: string;
  highlights: string[] | null;
  orbi_hook: string | null;
};

// Rótulo da categoria lá em cima da capa, só aparece quando o tipo do item
// tem um nome de sobra que faça sentido mostrar (produto/serviço); link
// solto não ganha rótulo, não ajudaria em nada.
const EYEBROW_LABEL: Record<string, string> = { product: "Produtos", service: "Serviços" };

// A Orbi já escreve a descrição de serviços em bullets ("• algo"), um por
// linha, quando melhora o texto (versão antiga, antes do campo "highlights"
// existir). Continua separado em intro (linhas soltas) + checklist (linhas
// com bullet) só como reserva, pra item antigo sem nada no campo novo não
// perder a listinha. Item novo usa "highlights" direto, editável campo a
// campo no painel, sem depender de parsear texto solto.
function splitDescription(description: string | null): { intro: string[]; checklist: string[] } {
  const lines = (description ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const intro: string[] = [];
  const checklist: string[] = [];
  for (const line of lines) {
    if (line.startsWith("•")) checklist.push(line.replace(/^•\s*/, ""));
    else intro.push(line);
  }
  return { intro, checklist };
}

export function ProductView({ business, item }: { business: Business; item: Item }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  // A capa (image_url) só aparece sozinha quando não há carrossel próprio , 
  // se já existem outras fotos (gallery_urls), elas bastam e a capa não se repete.
  const images = item.gallery_urls.length > 0 ? item.gallery_urls : [item.image_url].filter((u): u is string => !!u);
  // Mesmo formato escolhido no box, retrato ou paisagem, nunca mais o
  // quadrado fixo de antes. Consistente com a Vitrine e a grade pública.
  const ratio = COVER_RATIO_BY_SIZE[sizeOf(item.layout_size)];
  const aspectRatio = RATIOS[ratio].value;

  // Abrir a página do item já conta como interesse, mesmo tipo de clique de sempre.
  useEffect(() => {
    trackClick({ businessId: business.id, kind: "produto", contentItemId: item.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conta rolagem de carrossel uma única vez por visita à página (evita
  // registrar um evento por pixel arrastado, só a intenção de folhear).
  const scrolledRef = useRef(false);

  return (
    <main className="mx-auto min-h-screen max-w-[440px] bg-background-main pb-16">
      {/* Voltar, fora da imagem, igual qualquer app, não sobrepõe a foto.
          Usa o histórico de verdade quando existe (ex: veio da Vitrine ou
          de uma busca), então volta pra tela de onde a pessoa realmente
          saiu, não sempre pro início do site; só cai pro início quando não
          há de onde voltar (link direto, aba nova). "Ver vitrine" sempre
          leva pro catálogo, útil sobretudo pra quem chegou aqui por uma
          recomendação da Orbi no chat e quer continuar olhando produtos. */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) router.back();
            else router.push(`/${business.slug}`);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[16px]"
          aria-label="Voltar"
        >
          ←
        </button>
        <Link
          href={`/${business.slug}?tab=vitrine`}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-soft px-3.5 py-2 text-[13px] font-medium text-text-secondary"
        >
          <span aria-hidden>⊞</span> Ver vitrine
        </Link>
      </div>

      {/* Carrossel estilo post: quadrado, cantos arredondados, com respiro nas laterais.
          A altura acompanha o slide atual, foto (retrato) e vídeo (paisagem)
          raramente têm a mesma proporção, então em vez de deixar sobrar um
          vazio embaixo do mais baixo, o carrossel inteiro muda de altura
          conforme a pessoa folheia. */}
      <div className="px-4 pt-3">
        {images.length > 0 ? (() => {
          const slideAspects = images.map((src) => {
            const ytId = youtubeId(src);
            const igId = instagramReelId(src);
            return ytId ? 16 / 9 : igId ? 9 / 16 : aspectRatio;
          });
          return (
          <div
            className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto no-scrollbar transition-[aspect-ratio] duration-300 ease-out"
            style={{ aspectRatio: slideAspects[active] ?? aspectRatio }}
            onScroll={(e) => {
              const w = e.currentTarget.clientWidth || 1;
              setActive(Math.round(e.currentTarget.scrollLeft / w));
              if (!scrolledRef.current) {
                scrolledRef.current = true;
                trackClick({ businessId: business.id, kind: "carrossel", contentItemId: item.id });
              }
            }}
          >
            {images.map((src, i) => {
              const ytId = youtubeId(src);
              const igId = instagramReelId(src);
              return (
                <div key={i} className="relative h-full w-full shrink-0 snap-center overflow-hidden rounded-[22px] bg-surface-soft">
                  {ytId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                      title={`${item.title}, vídeo ${i + 1}`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : igId ? (
                    <iframe
                      src={`https://www.instagram.com/reel/${igId}/embed`}
                      title={`${item.title}, reels ${i + 1}`}
                      className="h-full w-full"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={item.title} className="h-full w-full object-cover" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          );
        })() : (
          <div className="flex w-full items-center justify-center rounded-[22px] bg-surface-soft text-[13px] text-text-tertiary" style={{ aspectRatio }}>
            sem foto
          </div>
        )}

        {images.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === active ? "bg-on-background" : "bg-on-background/25"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="px-6 pt-6">
        {(item.brand_label || EYEBROW_LABEL[item.type]) && (
          <p className="text-[13px] font-medium uppercase tracking-wide text-text-tertiary">
            {item.brand_label || EYEBROW_LABEL[item.type]}
          </p>
        )}
        <h1 className="mt-1 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight">{item.title}</h1>
        {formatPrice(item) && (
          <p className="mt-2 font-[family-name:var(--font-manrope)] text-[20px] font-medium">{formatPrice(item)}</p>
        )}

        {(() => {
          const { intro, checklist: legacyChecklist } = splitDescription(item.description);
          // "highlights" (campo próprio, editável linha a linha no painel) é
          // a fonte de verdade. Item antigo sem nada nesse campo ainda usa o
          // que a Orbi escreveu como bullet dentro da descrição, pra não
          // sumir com a lista de quem já tinha.
          const diferenciais = item.highlights && item.highlights.length > 0 ? item.highlights : legacyChecklist;
          return (
            <>
              {intro.length > 0 && (
                <div className="mt-4 flex flex-col gap-2 text-[15px] leading-relaxed text-text-secondary">
                  {intro.map((line, i) => <p key={i}>{line}</p>)}
                </div>
              )}
              {diferenciais.length > 0 && (
                <div className="mt-5">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Diferenciais</p>
                  <div className="mt-2.5 flex flex-col">
                    {diferenciais.map((line, i) => (
                      <div key={i} className={`flex items-start gap-2.5 py-2.5 text-[14.5px] leading-snug ${i > 0 ? "border-t border-divider" : ""}`}>
                        <span className="orbi-gradient mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]">✓</span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {item.orbi_hook?.trim() && (
          <a
            href={`/${business.slug}?chat=1&msg=${encodeURIComponent(item.orbi_hook)}`}
            onClick={() => trackClick({ businessId: business.id, kind: "zara", contentItemId: item.id })}
            className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-soft px-4 py-3.5"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-tertiary">
                <span className="h-1.5 w-1.5 rounded-full bg-orbi-gradient-start" />
                Pergunte à Orbi, IA da {business.name}
              </span>
              <span className="mt-0.5 block text-[14px] font-medium">{item.orbi_hook}</span>
            </span>
            <span className="shrink-0 text-text-tertiary" aria-hidden>→</span>
          </a>
        )}

        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            href={`/${business.slug}?chat=1`}
            onClick={() => trackClick({ businessId: business.id, kind: "zara", contentItemId: item.id })}
            className="inline-flex items-center justify-center gap-2 rounded-full orbi-gradient py-3.5 text-center text-[14px] font-medium text-on-background"
          >
            ✦ Falar com a Orbi
          </Link>
          {item.target_url && (
            <a
              href={item.target_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackClick({
                  businessId: business.id,
                  kind: item.link_kind === "categoria" ? "categoria" : "produto",
                  contentItemId: item.id,
                  targetUrl: item.target_url,
                });
                trackClick({ businessId: business.id, kind: "cta", contentItemId: item.id });
              }}
              className="rounded-full bg-button-primary py-3.5 text-center text-[14px] font-medium text-white"
            >
              Ver no site ↗
            </a>
          )}

          {(business.contact_whatsapp || business.contact_phone || business.contact_email) ? (
            <div className="flex gap-2.5">
              {business.contact_whatsapp && (
                <a
                  href={whatsappLink(business.contact_whatsapp, `Olá! Vi "${item.title}" no ${business.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick({ businessId: business.id, kind: "whatsapp", contentItemId: item.id })}
                  className="flex-1 rounded-full border border-divider py-3 text-center text-[13.5px] font-medium"
                >
                  WhatsApp
                </a>
              )}
              {business.contact_phone && (
                <a
                  href={`tel:${business.contact_phone.replace(/\D/g, "")}`}
                  onClick={() => trackClick({ businessId: business.id, kind: "ligar", contentItemId: item.id })}
                  className="flex-1 rounded-full border border-divider py-3 text-center text-[13.5px] font-medium"
                >
                  Ligar
                </a>
              )}
              {business.contact_email && (
                <a
                  href={`mailto:${business.contact_email}`}
                  onClick={() => trackClick({ businessId: business.id, kind: "email", contentItemId: item.id })}
                  className="flex-1 rounded-full border border-divider py-3 text-center text-[13.5px] text-text-secondary"
                >
                  E-mail
                </a>
              )}
            </div>
          ) : (
            !item.target_url && (
              <Link href={`/${business.slug}`} className="rounded-full border border-divider py-3.5 text-center text-[14px] font-medium">
                Voltar para o Orbibox
              </Link>
            )
          )}
        </div>
      </div>
    </main>
  );
}
