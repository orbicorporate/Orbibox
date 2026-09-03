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
      <div className="relative bg-surface-soft">
        {images.length > 0 ? (
          <div
            className="flex snap-x snap-mandatory overflow-x-auto"
            onScroll={(e) => {
              const w = e.currentTarget.clientWidth || 1;
              setActive(Math.round(e.currentTarget.scrollLeft / w));
            }}
          >
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={item.title} className="h-[420px] w-full shrink-0 snap-center object-cover" />
            ))}
          </div>
        ) : (
          <div className="flex h-[420px] w-full items-center justify-center text-[13px] text-text-tertiary">sem foto</div>
        )}

        <Link
          href={`/${business.slug}`}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface-white/90 text-[16px] shadow"
          aria-label="Voltar"
        >
          ←
        </Link>

        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
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
