"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, groupByCategory } from "@/lib/showcase";
import { trackClick } from "@/lib/track";

type Item = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  price_max: number | null;
  image_url: string | null;
  brand_label: string | null;
  position: number;
  layout_size: string;
  link_kind: string | null;
  target_url: string | null;
};

/**
 * Cardápio da loja: os itens do Catálogo organizados por categoria, com foto,
 * descrição e preço. Os itens marcados como destaque (formato "destaque" no
 * Catálogo) ganham uma faixa própria no topo.
 */
export function CardapioFlow({
  business,
  itens,
  sessionId,
  titulo,
  subtitulo,
  pdfUrl,
  onPedir,
  onBack,
}: {
  business: { id: string; slug: string; name: string; vitrine_categories?: string[] | null };
  itens: Item[];
  sessionId: string | null;
  titulo: string;
  subtitulo: string;
  /** PDF do cardápio para baixar, se o dono enviou. */
  pdfUrl?: string | null;
  onPedir?: () => void;
  onBack: () => void;
}) {
  const router = useRouter();
  const [ativa, setAtiva] = useState<string | null>(null);

  useEffect(() => {
    trackClick({ businessId: business.id, kind: "cardapio", sessionId });
    // Conta uma abertura por visita à tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const secoes = useMemo(() => groupByCategory(itens, business.vitrine_categories ?? []), [itens, business.vitrine_categories]);
  const nomeadas = secoes.filter((s) => s.name);
  const destaques = itens.filter((i) => i.layout_size === "destaque" && i.image_url);
  const visiveis = ativa ? secoes.filter((s) => s.name === ativa) : secoes;

  function abrir(i: Item) {
    trackClick({ businessId: business.id, kind: "produto", contentItemId: i.id, sessionId });
    if (i.link_kind === "externo" && i.target_url) window.open(/^https?:\/\//i.test(i.target_url) ? i.target_url : `https://${i.target_url}`, "_blank", "noopener");
    else router.push(`/${business.slug}/p/${i.id}`);
  }

  return (
    <div className={`w-full ${onPedir ? "pb-24" : ""}`}>
      <button onClick={onBack} className="mb-3 text-[14px] text-text-tertiary hover:underline">← voltar</button>
      <h2 className="font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.01em]">{titulo}</h2>
      <p className="mt-1 text-[14px] text-text-secondary">{subtitulo}</p>
      {pdfUrl && (
        <a href={pdfUrl} target="_blank" rel="noopener" download onClick={() => trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: pdfUrl })} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-divider bg-surface-white px-4 text-[13.5px] font-medium text-text-secondary active:scale-[0.98]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M5 21h14" /></svg>
          Baixar cardápio em PDF
        </a>
      )}

      {itens.length === 0 && (
        <p className="mt-8 rounded-[22px] border border-dashed border-divider p-6 text-center text-[14px] text-text-tertiary">O cardápio ainda está sendo montado.</p>
      )}

      {nomeadas.length > 1 && (
        <div className="no-scrollbar -mx-6 mt-5 flex gap-2 overflow-x-auto px-6">
          <button type="button" onClick={() => setAtiva(null)} className={`shrink-0 min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${ativa === null ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>Tudo</button>
          {nomeadas.map((s) => (
            <button key={s.name} type="button" onClick={() => setAtiva(s.name)} className={`shrink-0 min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${ativa === s.name ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{s.name}</button>
          ))}
        </div>
      )}

      {ativa === null && destaques.length > 0 && (
        <section className="mt-6" aria-label="Destaques">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Destaques</p>
          <div className="no-scrollbar -mx-6 mt-2.5 flex gap-3 overflow-x-auto px-6 pb-1">
            {destaques.map((i) => {
              const preco = formatPrice(i);
              return (
                <button key={i.id} type="button" onClick={() => abrir(i)} className="relative aspect-[4/5] w-[220px] shrink-0 overflow-hidden rounded-[26px] bg-surface-soft text-left transition-transform active:scale-[0.98]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image_url!} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-12 text-white">
                    <span className="block text-[16px] font-semibold leading-snug">{i.title}</span>
                    {preco && <span className="mt-0.5 block text-[13.5px] opacity-90">{preco}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {visiveis.map((s) => (
        <section key={s.name || "sem"} className="mt-7" aria-label={s.name || "Itens"}>
          {s.name && <h3 className="font-[family-name:var(--font-manrope)] text-[19px] font-medium">{s.name}</h3>}
          <div className="mt-3 flex flex-col gap-3">
            {s.items.map((i) => {
              const preco = formatPrice(i);
              return (
                <button key={i.id} type="button" onClick={() => abrir(i)} className="flex w-full items-center gap-3.5 rounded-[24px] bg-surface-white p-3 text-left ring-1 ring-black/[0.05] transition-transform active:scale-[0.99]">
                  <span className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[18px] bg-surface-soft">
                    {i.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-semibold leading-snug">{i.title}</span>
                    {i.description?.trim() && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-text-secondary">{i.description}</span>}
                    {preco && <span className="mt-1.5 block text-[14.5px] font-semibold">{preco}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {onPedir && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[440px] bg-gradient-to-t from-background-main via-background-main/95 to-transparent px-6 pb-6 pt-8">
          <button type="button" onClick={onPedir} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-on-background text-[15px] font-semibold text-white shadow-[0_10px_30px_rgba(17,19,24,0.25)] active:scale-[0.98]">
            Pedir por delivery <span aria-hidden>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
