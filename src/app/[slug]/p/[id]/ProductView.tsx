"use client";

import { BotaoCompartilhar } from "@/components/compartilhar/Compartilhar";
import Link from "next/link";
import { CurtirItem } from "@/components/clube/CurtirItem";
import { PedirFaFolha } from "@/components/clube/Clube";
import { AbrirEditor } from "@/components/mobile/EditarNoLugar";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trackClick, whatsappLink } from "@/lib/track";
import { NudgeLead } from "@/components/mobile/NudgeLead";
import { COVER_RATIO_BY_SIZE, galleryRatioOf, formatPrice, sizeOf, youtubeId, instagramReelId } from "@/lib/showcase";
import { RATIOS } from "@/components/ui/ImageCropModal";
import { lerLista } from "@/lib/lista";
import { lerAnexos } from "@/lib/anexo";
import { CrieSeuOrbibox } from "@/components/ui/CrieSeuOrbibox";
import { AnexoProduto } from "@/components/ui/AnexoProduto";
import { ListaItensView } from "./ListaItensView";

type Business = {
  id: string;
  name: string;
  slug: string;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  logo_url?: string | null;
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
  gallery_ratio?: string | null;
  brand_label: string | null;
  target_url: string | null;
  link_kind: string | null;
  layout_size: string;
  type: string;
  highlights: string[] | null;
  orbi_hook: string | null;
  lista?: unknown;
  images?: unknown;
};

// Rótulo da categoria lá em cima da capa, só aparece quando o tipo do item
// tem um nome de sobra que faça sentido mostrar (produto/serviço); link
// solto não ganha rótulo, não ajudaria em nada.
const EYEBROW_LABEL: Record<string, string> = { product: "Produtos", service: "Serviços" };

// A descrição vira blocos na ordem em que foi escrita, nada some: parágrafo
// (texto corrido), título (linha curta em CAIXA ALTA ou terminada em ":") e
// item de lista (linha com "•", "-" ou "*"). Antes as linhas com bullet eram
// tiradas da descrição e, havendo "highlights", simplesmente sumiam.
type Bloco = { t: "p" | "h" | "li"; texto: string };

function blocosDaDescricao(description: string | null): Bloco[] {
  const out: Bloco[] = [];
  for (const bruta of (description ?? "").split("\n")) {
    const l = bruta.trim();
    if (!l) continue;
    if (/^[•\-*–]\s+/.test(l)) { out.push({ t: "li", texto: l.replace(/^[•\-*–]\s+/, "") }); continue; }
    const letras = l.replace(/[^A-Za-zÀ-ÿ]/g, "");
    const caixaAlta = letras.length >= 3 && l === l.toUpperCase();
    if ((caixaAlta && l.length <= 40) || (l.endsWith(":") && l.length <= 40)) {
      out.push({ t: "h", texto: l.replace(/:$/, "") });
      continue;
    }
    out.push({ t: "p", texto: l });
  }
  return out;
}

function Check() {
  return (
    <span className="orbi-gradient mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full" aria-hidden>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );
}

export function ProductView({ business, item, isOwner = false }: { business: Business; item: Item; isOwner?: boolean }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  // A capa (image_url) só aparece sozinha quando não há carrossel próprio , 
  // se já existem outras fotos (gallery_urls), elas bastam e a capa não se repete.
  const images = item.gallery_urls.length > 0 ? item.gallery_urls : [item.image_url].filter((u): u is string => !!u);
  // Com carrossel próprio, vale o formato escolhido pra ele (quadrado ou
  // paisagem); só com a capa, segue o formato da capa.
  const ratio = item.gallery_urls.length > 0 ? galleryRatioOf(item.gallery_ratio, item.layout_size) : COVER_RATIO_BY_SIZE[sizeOf(item.layout_size)];
  const aspectRatio = RATIOS[ratio].value;

  // Abrir a página do item já conta como interesse, mesmo tipo de clique de sempre.
  useEffect(() => {
    trackClick({ businessId: business.id, kind: "produto", contentItemId: item.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Conta rolagem de carrossel uma única vez por visita à página (evita
  // registrar um evento por pixel arrastado, só a intenção de folhear).
  const scrolledRef = useRef(false);

  // Quem abriu o item pelo Destaque da tela inicial volta pra tela inicial.
  // Quem veio da vitrine (ou de uma recomendação da Orbi) volta pra vitrine.
  const [deHome, setDeHome] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeHome(new URLSearchParams(window.location.search).get("de") === "home");
  }, []);
  function voltar() {
    if (deHome && window.history.length > 1) router.back();
    else router.push(deHome ? `/${business.slug}` : `/${business.slug}?tab=vitrine`);
  }

  return (
    <main className="pagina-entra mx-auto min-h-screen w-full max-w-[440px] bg-background-main pb-16">
      {!isOwner && <PedirFaFolha businessId={business.id} slug={business.slug} nome={business.name} />}
      <NudgeLead businessId={business.id} businessName={business.name} modo="pagina" interesse={item.title} />
      {/* Voltar, fora da imagem, igual qualquer app, não sobrepõe a foto.
          Voltar leva pra vitrine, exceto quando o item foi aberto pelo Destaque
          da tela inicial (?de=home): aí volta pra ela. Pelo histórico direto, a vitrine
          caía na tela inicial, porque a vitrine aberta não fica no endereço. "Ver catálogo" sempre
          leva pro catálogo, útil sobretudo pra quem chegou aqui por uma
          recomendação da Orbi no chat e quer continuar olhando produtos. */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <button
          onClick={voltar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[16px]"
          aria-label="Voltar"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          {!isOwner && <CurtirItem businessId={business.id} alvo="item" id={item.id} titulo={item.title} className="!static !bg-surface-soft !shadow-none" />}
          <BotaoCompartilhar
            alvo={{ url: `/${business.slug}/p/${item.id}`, titulo: item.title, rotulo: business.name, marca: business.name, imagem: images[0] ?? null, logo: business.logo_url ?? null, texto: `Olha isso de ${business.name}:` }}
            className="grid h-9 w-9 place-items-center rounded-full text-white transition-transform active:scale-90"
            style={{ background: "linear-gradient(135deg,#E04A4F 0%,#C4282D 48%,#8A1D22 100%)", boxShadow: "0 8px 20px -8px rgba(138,29,34,0.55)" }}
            tam={18}
          />
          {isOwner && (
            <AbrirEditor
              href={`/admin/vitrine/pagina/${item.id}`}
              rotulo="Editar esta página"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-on-background px-3.5 py-2 text-[13px] font-medium text-white shadow-lg"
            >
              <span aria-hidden>✎</span> Editar
            </AbrirEditor>
          )}
        </div>
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
        })() : null}

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
        <h1 className="mt-1 break-words font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight">{item.title}</h1>
        {formatPrice(item) && (
          <p className="mt-2 font-[family-name:var(--font-manrope)] text-[20px] font-medium">{formatPrice(item)}</p>
        )}

        {(() => {
          const blocos = blocosDaDescricao(item.description);
          return (
            <>
              {blocos.length > 0 && (
                <div className="mt-5 break-words text-[15px] leading-relaxed text-text-secondary">
                  {blocos.map((b, i) => {
                    if (b.t === "h") {
                      return <p key={i} className="mt-5 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-on-background first:mt-0">{b.texto}</p>;
                    }
                    if (b.t === "li") {
                      return (
                        <div key={i} className="mt-2 flex items-start gap-2.5 text-[15px] leading-snug text-on-background">
                          <Check />
                          <span className="min-w-0 flex-1">{b.texto}</span>
                        </div>
                      );
                    }
                    return <p key={i} className={i > 0 ? "mt-3" : ""}>{b.texto}</p>;
                  })}
                </div>
              )}
            </>
          );
        })()}

        {(() => {
          const anexos = lerAnexos(item.images);
          return anexos.length > 0 ? <>{anexos.map((a, i) => <AnexoProduto key={`${a.url}-${i}`} anexo={a} />)}</> : null;
        })()}

        {(() => {
          const lista = lerLista(item.lista);
          return lista ? <ListaItensView lista={lista} slug={business.slug} businessId={business.id} paginaId={item.id} paginaTitulo={item.title} negocio={business.name} whatsapp={business.contact_whatsapp} /> : null;
        })()}

        {(item.orbi_hook?.trim() || !item.description?.trim()) && (
          <a
            href={`/${business.slug}?chat=1&msg=${encodeURIComponent(item.orbi_hook?.trim() || `Me conta mais sobre "${item.title}"`)}`}
            onClick={() => trackClick({ businessId: business.id, kind: "zara", contentItemId: item.id })}
            className="mt-6 flex items-center gap-3 rounded-2xl bg-surface-soft px-4 py-3.5"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-tertiary">
                <span className="h-1.5 w-1.5 rounded-full bg-orbi-gradient-start" />
                Pergunte à Orbi, IA da {business.name}
              </span>
              <span className="mt-0.5 block text-[14px] font-medium">{item.orbi_hook?.trim() || `Me conta mais sobre ${item.title}`}</span>
            </span>
            <span className="shrink-0 text-text-tertiary" aria-hidden>→</span>
          </a>
        )}

        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            href={`/${business.slug}?chat=1`}
            onClick={() => trackClick({ businessId: business.id, kind: "zara", contentItemId: item.id })}
            className="inline-flex items-center justify-center gap-2 rounded-full btn-orbi-preto py-3.5 text-center text-[14px] font-medium"
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

        <Link
          href={`/${business.slug}?tab=vitrine`}
          className="mt-3 flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-divider text-[14px] font-medium text-text-secondary"
        >
          <span aria-hidden>⊞</span> Ver catálogo completo
        </Link>
      </div>
      {!isOwner && <CrieSeuOrbibox de={business.slug} />}
    </main>
  );
}
