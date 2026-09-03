"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackClick, whatsappLink } from "@/lib/track";

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
  image_url: string | null;
  gallery_urls: string[];
  brand_label: string | null;
  target_url: string | null;
  link_kind: string | null;
};

export function ProductView({ business, item }: { business: Business; item: Item }) {
  const [active, setActive] = useState(0);
  const images = [item.image_url, ...item.gallery_urls].filter((u): u is string => !!u);

  // Abrir a página do item já conta como interesse — mesmo tipo de clique de sempre.
  useEffect(() => {
    trackClick({ businessId: business.id, kind: "produto", contentItemId: item.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-[440px] bg-background-main pb-16">
      {/* Botão de voltar, fora da imagem — igual qualquer app, não sobrepõe a foto */}
      <div className="flex items-center px-4 pt-4">
        <Link
          href={`/${business.slug}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[16px]"
          aria-label="Voltar"
        >
          ←
        </Link>
      </div>

      {/* Carrossel estilo post: quadrado, cantos arredondados, com respiro nas laterais */}
      <div className="px-4 pt-3">
        {images.length > 0 ? (
          <div
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto"
            onScroll={(e) => {
              const w = e.currentTarget.clientWidth || 1;
              setActive(Math.round(e.currentTarget.scrollLeft / w));
            }}
          >
            {images.map((src, i) => (
              <div key={i} className="aspect-square w-full shrink-0 snap-center overflow-hidden rounded-[22px] bg-surface-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={item.title} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-[22px] bg-surface-soft text-[13px] text-text-tertiary">
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
        {item.brand_label && <p className="text-[13px] uppercase tracking-wide text-text-tertiary">{item.brand_label}</p>}
        <h1 className="mt-1 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight">{item.title}</h1>
        {item.price != null && (
          <p className="mt-2 font-[family-name:var(--font-manrope)] text-[20px] font-medium">R$ {Number(item.price).toFixed(2)}</p>
        )}
        {item.description && <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{item.description}</p>}

        <div className="mt-7 flex flex-col gap-2.5">
          {item.target_url && (
            <a
              href={item.target_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackClick({
                  businessId: business.id,
                  kind: item.link_kind === "categoria" ? "categoria" : "produto",
                  contentItemId: item.id,
                  targetUrl: item.target_url,
                })
              }
              className="rounded-full bg-button-primary py-3.5 text-center text-[14px] font-medium text-white"
            >
              Ver no site ↗
            </a>
          )}
          {business.contact_whatsapp && (
            <a
              href={whatsappLink(business.contact_whatsapp, `Olá! Vi "${item.title}" no ${business.name}.`)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick({ businessId: business.id, kind: "whatsapp", contentItemId: item.id })}
              className="rounded-full border border-divider py-3.5 text-center text-[14px] font-medium"
            >
              WhatsApp
            </a>
          )}
          {business.contact_phone && (
            <a
              href={`tel:${business.contact_phone.replace(/\D/g, "")}`}
              onClick={() => trackClick({ businessId: business.id, kind: "ligar", contentItemId: item.id })}
              className="rounded-full border border-divider py-3.5 text-center text-[14px] font-medium"
            >
              Ligar
            </a>
          )}
          {business.contact_email && (
            <a
              href={`mailto:${business.contact_email}`}
              onClick={() => trackClick({ businessId: business.id, kind: "email", contentItemId: item.id })}
              className="rounded-full border border-divider py-3.5 text-center text-[14px] text-text-secondary"
            >
              E-mail
            </a>
          )}
          {!item.target_url && !business.contact_whatsapp && !business.contact_phone && !business.contact_email && (
            <Link href={`/${business.slug}`} className="rounded-full border border-divider py-3.5 text-center text-[14px] font-medium">
              Voltar para o Orbibox
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
