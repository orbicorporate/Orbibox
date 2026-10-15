"use client";

import { useEffect, useRef, useState } from "react";
import { trackClick, whatsappLink } from "@/lib/track";
import { precoDoItem, urlSegura, type Lista, type ListaItem } from "@/lib/lista";

/**
 * Lista de itens da página própria: boxes de foto, nome e preço. Ao tocar,
 * abre uma folha com o item maior e o botão que o dono escolheu
 * (WhatsApp, link do item ou nenhum).
 */
export function ListaItensView({ lista, businessId, paginaId, paginaTitulo, negocio, whatsapp }: { lista: Lista; businessId: string; paginaId: string; paginaTitulo: string; negocio: string; whatsapp: string | null }) {
  const [aberto, setAberto] = useState<ListaItem | null>(null);
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(null); };
    window.addEventListener("keydown", tecla);
    fechar.current?.focus();
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const itens = lista.itens.filter((i) => i.nome.trim());
  if (itens.length === 0) return null;
  const semFotos = itens.every((i) => !i.foto);

  function abrir(i: ListaItem) {
    trackClick({ businessId, kind: "lista_item", contentItemId: paginaId });
    setAberto(i);
  }

  const aberto_ = aberto;
  const linkItem = aberto_ ? urlSegura(aberto_.link) : null;

  return (
    <section className="mt-8" aria-label={lista.titulo || "Itens"}>
      {lista.titulo.trim() && <h2 className="font-[family-name:var(--font-manrope)] text-[20px] font-medium leading-tight">{lista.titulo}</h2>}
      {semFotos ? (
        // Nenhum item tem foto: lista limpa de linhas (nome, preço, seta), sem caixas cinzas vazias.
        <ul className="mt-3 overflow-hidden rounded-[20px] bg-surface-white ring-1 ring-black/[0.05]">
          {itens.map((i, idx) => {
            const preco = precoDoItem(i.preco);
            return (
              <li key={i.id} className={idx > 0 ? "border-t border-divider" : ""}>
                <button type="button" onClick={() => abrir(i)} className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-soft">
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block break-words text-[15px] font-medium leading-snug">{i.nome}</span>
                    {i.descricao?.trim() && <span className="mt-0.5 line-clamp-2 block break-words text-[13px] leading-snug text-text-secondary">{i.descricao}</span>}
                    {i.esgotado && <span className="mt-0.5 block text-[12px] text-text-tertiary">Esgotado</span>}
                  </span>
                  {preco && <span className="shrink-0 text-[14px] text-text-secondary">{preco}</span>}
                  <span className="shrink-0 text-text-tertiary" aria-hidden>›</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {itens.map((i) => {
          const preco = precoDoItem(i.preco);
          return (
            <li key={i.id}>
              <button type="button" onClick={() => abrir(i)} className="block w-full overflow-hidden rounded-[20px] bg-surface-white text-left ring-1 ring-black/[0.05] transition-transform active:scale-[0.98]">
                {i.foto && (
                  <span className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                    {i.esgotado && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-text-secondary">Esgotado</span>}
                  </span>
                )}
                <span className="block px-3 pb-3 pt-2.5">
                  {!i.foto && i.esgotado && <span className="mb-1 block text-[11px] font-medium text-text-tertiary">Esgotado</span>}
                  <span className="line-clamp-2 block break-words text-[14px] font-medium leading-snug">{i.nome}</span>
                  {i.descricao?.trim() && <span className="mt-0.5 line-clamp-2 block break-words text-[12.5px] leading-snug text-text-secondary">{i.descricao}</span>}
                  {preco && <span className="mt-1 block text-[13.5px] font-medium">{preco}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      )}

      {aberto_ && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={aberto_.nome}>
          <button type="button" aria-label="Fechar" onClick={() => setAberto(null)} className="veu-entra absolute inset-0 bg-black/40" />
          <div className="folha-sobe absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-background-main p-5 pb-8">
            <div className="flex justify-end">
              <button ref={fechar} type="button" onClick={() => setAberto(null)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
            </div>
            {aberto_.foto && (
              <div className="mt-1 overflow-hidden rounded-[22px] bg-surface-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aberto_.foto} alt={aberto_.nome} className="aspect-[4/5] w-full object-cover" />
              </div>
            )}
            <h3 className="mt-4 break-words font-[family-name:var(--font-manrope)] text-[22px] font-medium leading-tight">{aberto_.nome}</h3>
            {precoDoItem(aberto_.preco) && <p className="mt-1 font-[family-name:var(--font-manrope)] text-[18px] font-medium">{precoDoItem(aberto_.preco)}</p>}
            {aberto_.descricao?.trim() && <p className="mt-3 whitespace-pre-line break-words text-[14.5px] leading-relaxed text-text-secondary">{aberto_.descricao}</p>}

            {aberto_.esgotado ? (
              <p className="mt-5 rounded-full bg-surface-soft py-3.5 text-center text-[14px] font-medium text-text-secondary">Esgotado por enquanto</p>
            ) : lista.destino === "whatsapp" && whatsapp ? (
              <a
                href={whatsappLink(whatsapp, `Olá! Quero "${aberto_.nome}" (${paginaTitulo}) do ${negocio}.`)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick({ businessId, kind: "whatsapp", contentItemId: paginaId })}
                className="mt-5 flex min-h-[50px] items-center justify-center rounded-full bg-on-background text-[15px] font-semibold text-white active:scale-[0.98]"
              >
                Quero este
              </a>
            ) : lista.destino === "link" && linkItem ? (
              <a
                href={linkItem}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick({ businessId, kind: "cta", contentItemId: paginaId, targetUrl: linkItem })}
                className="mt-5 flex min-h-[50px] items-center justify-center gap-1.5 rounded-full bg-on-background text-[15px] font-semibold text-white active:scale-[0.98]"
              >
                Ver este item <span aria-hidden>↗</span>
              </a>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
