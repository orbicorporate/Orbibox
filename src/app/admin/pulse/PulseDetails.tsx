"use client";

import Link from "next/link";
import { useState } from "react";

type ItemInfo = { title: string; image_url: string | null; brand_label: string | null };

const TIPOS = [
  { kind: "categoria", label: "Cliques que levaram para o site", nota: "abriram seu site externo", cor: "#1D4ED8", fundo: "#E2EAFE", icon: "M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" },
  { kind: "produto", label: "Produtos abertos", nota: "foram para a página do produto", cor: "#6D28D9", fundo: "#EDE6FC", icon: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" },
  { kind: "link", label: "Cliques que levaram para outros links", nota: "abriram um link externo", cor: "#0E7490", fundo: "#DDF2F7", icon: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" },
  { kind: "whatsapp", label: "Cliques que levaram para o WhatsApp", nota: "iniciaram conversa", cor: "#1F7A3D", fundo: "#DEF3E3", icon: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
  { kind: "email", label: "Cliques que levaram para email", nota: "tocaram em enviar e-mail", cor: "#C2650A", fundo: "#FDEEDF", icon: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6" },
  { kind: "ligar", label: "Ligações", nota: "tocaram em ligar", cor: "#B0463C", fundo: "#FBE6E3", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" },
  { kind: "zara", label: "Conversas com a Orbi", nota: "pediram ajuda da IA", cor: "#B0309E", fundo: "#FBE4F6", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
] as const;

type PaginaVisitada = { id: string; aberturas: number; carrossel: number; cta: number };

export function PulseDetails({
  porTipo,
  porTipoItem,
  itemMap,
  topItems,
  paginas,
  slug,
}: {
  porTipo: Record<string, number>;
  porTipoItem: Record<string, Record<string, number>>;
  itemMap: Record<string, ItemInfo>;
  topItems: { id: string; count: number }[];
  paginas: PaginaVisitada[];
  slug: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  // Começam fechadas: são listas longas que empurram o resto pra baixo.
  const [paginasAberto, setPaginasAberto] = useState(false);
  const [clicadosAberto, setClicadosAberto] = useState(false);

  return (
    <>
      <p className="mt-8 text-[13px] uppercase tracking-wide text-text-tertiary">Ações por tipo</p>
      <div className="mt-3 flex flex-col">
        {TIPOS.map((t) => {
          const itens = Object.entries(porTipoItem[t.kind] ?? {}).sort((a, b) => b[1] - a[1]);
          const total = porTipo[t.kind] ?? 0;
          const isConversas = t.kind === "zara";
          const expandable = itens.length > 0;
          const isOpen = open === t.kind;
          const row = (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: t.fundo, color: t.cor }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] text-on-background">{t.label}</p>
                  <p className="text-[12px] text-text-tertiary">{t.nota}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-manrope)] text-[22px] font-medium">{total.toLocaleString("pt-BR")}</span>
                {(expandable || isConversas) && <span className={`text-[12px] text-text-tertiary transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>}
              </div>
            </>
          );
          return (
            <div key={t.kind} className="border-b border-divider">
              {isConversas ? (
                <Link href="/admin/conversas" className="flex w-full items-center justify-between py-4 text-left">
                  {row}
                </Link>
              ) : (
                <button
                  onClick={() => expandable && setOpen(isOpen ? null : t.kind)}
                  className="flex w-full items-center justify-between py-4 text-left"
                  disabled={!expandable}
                >
                  {row}
                </button>
              )}
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

      {paginas.length > 0 && (
        <div className="mt-6">
          <button type="button" onClick={() => setPaginasAberto((v) => !v)} className="flex w-full cursor-pointer items-center gap-3 rounded-[22px] border border-divider bg-surface-white p-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E2EAFE] text-[#1D4ED8]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h20v14H2zM8 21h8M12 17v4" /></svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-tight">Páginas visitadas</span>
              <span className="mt-0.5 block text-[12px] text-text-tertiary">{paginas.length} {paginas.length === 1 ? "página com visita" : "páginas com visitas"}</span>
            </span>
            <span className={`shrink-0 text-text-tertiary transition-transform ${paginasAberto ? "rotate-90" : ""}`}>›</span>
          </button>
          {paginasAberto && (
          <div className="mt-3 flex flex-col gap-2">
            {paginas.map((p) => {
              const info = itemMap[p.id];
              if (!info) return null;
              return (
                <Link
                  key={p.id}
                  href={`/${slug}/p/${p.id}`}
                  target="_blank"
                  className="flex items-center gap-3 rounded-2xl border border-divider bg-surface-white px-4 py-3"
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-surface-soft">
                    {info.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={info.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{info.title}</p>
                    <p className="mt-0.5 flex gap-3 text-[11px] text-text-tertiary">
                      <span>{p.aberturas.toLocaleString("pt-BR")} aberturas</span>
                      <span>{p.carrossel.toLocaleString("pt-BR")} rolagem de carrossel</span>
                      <span>{p.cta.toLocaleString("pt-BR")} clique no CTA</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
          )}
        </div>
      )}

      {topItems.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setClicadosAberto((v) => !v)} className="flex w-full cursor-pointer items-center gap-3 rounded-[22px] border border-divider bg-surface-white p-4 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FDEEDF] text-[#C2650A]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-tight">Itens mais clicados</span>
              <span className="mt-0.5 block text-[12px] text-text-tertiary">{topItems.length} {topItems.length === 1 ? "item no ranking" : "itens no ranking"}</span>
            </span>
            <span className={`shrink-0 text-text-tertiary transition-transform ${clicadosAberto ? "rotate-90" : ""}`}>›</span>
          </button>
          {clicadosAberto && (
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
          )}
        </div>
      )}
    </>
  );
}
