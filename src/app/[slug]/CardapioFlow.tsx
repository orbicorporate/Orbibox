"use client";

import { useEffect, useMemo, useState } from "react";
import { precoCardapio, type CardapioSecao } from "@/lib/cardapio";
import { trackClick } from "@/lib/track";

/**
 * Cardápio da loja: os pratos cadastrados no cardápio (separado do Catálogo),
 * por categoria. Com foto mostra a foto ao lado; sem foto mostra só nome,
 * descrição e preço.
 */
export function CardapioFlow({
  business,
  secoes,
  sessionId,
  titulo,
  subtitulo,
  pdfUrl,
  onPedir,
  onBack,
}: {
  business: { id: string; name: string };
  secoes: CardapioSecao[];
  sessionId: string | null;
  titulo: string;
  subtitulo: string;
  /** PDF do cardápio para baixar, se o dono enviou. */
  pdfUrl?: string | null;
  onPedir?: () => void;
  onBack: () => void;
}) {
  const [ativa, setAtiva] = useState<string | null>(null);

  useEffect(() => {
    trackClick({ businessId: business.id, kind: "cardapio", sessionId });
    // Conta uma abertura por visita à tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preenchidas = useMemo(() => secoes.map((s) => ({ ...s, itens: s.itens.filter((i) => i.nome.trim()) })).filter((s) => s.itens.length > 0), [secoes]);
  const nomeadas = preenchidas.filter((s) => s.nome.trim());
  const visiveis = ativa ? preenchidas.filter((s) => s.id === ativa) : preenchidas;

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

      {preenchidas.length === 0 && (
        <p className="mt-8 rounded-[22px] border border-dashed border-divider p-6 text-center text-[14px] text-text-tertiary">O cardápio ainda está sendo montado.</p>
      )}

      {nomeadas.length > 1 && (
        <div className="no-scrollbar -mx-6 mt-5 flex gap-2 overflow-x-auto px-6">
          <button type="button" onClick={() => setAtiva(null)} className={`shrink-0 min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${ativa === null ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>Tudo</button>
          {nomeadas.map((s) => (
            <button key={s.id} type="button" onClick={() => setAtiva(s.id)} className={`shrink-0 min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${ativa === s.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{s.nome}</button>
          ))}
        </div>
      )}

      {visiveis.map((s) => (
        <section key={s.id} className="mt-7" aria-label={s.nome || "Pratos"}>
          {s.nome.trim() && <h3 className="font-[family-name:var(--font-manrope)] text-[19px] font-medium">{s.nome}</h3>}
          <ul className="mt-3 flex flex-col gap-3">
            {s.itens.map((i) => {
              const preco = precoCardapio(i);
              return (
                <li key={i.id} className="flex w-full items-center gap-3.5 rounded-[24px] bg-surface-white p-3.5 ring-1 ring-black/[0.05]">
                  {i.foto && (
                    <span className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[18px] bg-surface-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 px-0.5">
                    <span className="block break-words text-[15.5px] font-semibold leading-snug">{i.nome}</span>
                    {i.descricao?.trim() && <span className="mt-0.5 block whitespace-pre-line break-words text-[13px] leading-snug text-text-secondary">{i.descricao}</span>}
                    {preco && <span className="mt-1.5 block text-[14.5px] font-semibold">{preco}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
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
