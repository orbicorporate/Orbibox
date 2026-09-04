"use client";

import Link from "next/link";
import { useState } from "react";

type ItemInfo = { title: string; image_url: string | null; brand_label: string | null };

const TIPOS = [
  { kind: "categoria", label: "Categorias abertas", nota: "foram para o seu site" },
  { kind: "produto", label: "Produtos abertos", nota: "foram para a página do produto" },
  { kind: "whatsapp", label: "WhatsApp", nota: "iniciaram conversa" },
  { kind: "ligar", label: "Ligações", nota: "tocaram em ligar" },
  { kind: "zara", label: "Conversas com a Orbi", nota: "pediram ajuda da IA" },
] as const;

export function PulseDetails({
  porTipo,
  porTipoItem,
  itemMap,
  topItems,
  slug,
}: {
  porTipo: Record<string, number>;
  porTipoItem: Record<string, Record<string, number>>;
  itemMap: Record<string, ItemInfo>;
  topItems: { id: string; count: number }[];
  slug: string;
}) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <p className="mt-8 text-[13px] uppercase tracking-wide text-text-tertiary">Ações por tipo</p>
      <div className="mt-3 flex flex-col">
        {TIPOS.map((t) => {
          const itens = Object.entries(porTipoItem[t.kind] ?? {}).sort((a, b) => b[1] - a[1]);
          const total = porTipo[t.kind] ?? 0;
          const expandable = itens.length > 0;
          const isOpen = open === t.kind;
          return (
            <div key={t.kind} className="border-b border-divider">
              <button
                onClick={() => expandable && setOpen(isOpen ? null : t.kind)}
                className="flex w-full items-center justify-between py-4 text-left"
                disabled={!expandable}
              >
                <div className="min-w-0">
                  <p className="text-[15px] text-on-background">{t.label}</p>
                  <p className="text-[12px] text-text-tertiary">{t.nota}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-manrope)] text-[22px] font-medium">{total.toLocaleString("pt-BR")}</span>
                  {expandable && <span className={`text-[12px] text-text-tertiary transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>}
                </div>
              </button>
              {isOpen && (
                <div className="flex flex-col gap-2 pb-4">
                  {itens.map(([itemId, count]) => {
                    const info = itemMap[itemId];
                    if (!info) return null;
                    return (
                      <Link
                        key={itemId}
                        href={`/${slug}/p/${itemId}`}
                        target="_blank"
                        className="flex items-center gap-3 rounded-2xl bg-surface-soft px-3 py-2.5"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-surface-white">
                          {info.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={info.image_url} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{info.title}</p>
                          {info.brand_label && <p className="truncate text-[11px] text-text-tertiary">{info.brand_label}</p>}
                        </div>
                        <span className="shrink-0 text-[13px] text-text-secondary">{count}×</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {topItems.length > 0 && (
        <>
          <p className="mt-8 text-[13px] uppercase tracking-wide text-text-tertiary">Itens mais clicados</p>
          <div className="mt-3 flex flex-col gap-2">
            {topItems.map((t, i) => {
              const info = itemMap[t.id];
              if (!info) return null;
              return (
                <Link
                  key={t.id}
                  href={`/${slug}/p/${t.id}`}
                  target="_blank"
                  className="flex items-center gap-3 rounded-2xl border border-divider bg-surface-white px-4 py-3"
                >
                  <span className="w-4 shrink-0 text-[13px] text-text-tertiary">{i + 1}</span>
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-surface-soft">
                    {info.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={info.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{info.title}</p>
                    {info.brand_label && <p className="truncate text-[12px] text-text-tertiary">{info.brand_label}</p>}
                  </div>
                  <span className="shrink-0 font-[family-name:var(--font-manrope)] text-[16px] font-medium">{t.count}×</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
