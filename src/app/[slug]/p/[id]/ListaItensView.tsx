"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackClick, whatsappLink } from "@/lib/track";
import { fotosDoItem, precoDoItem, urlSegura, type Lista, type ListaItem } from "@/lib/lista";

/**
 * Lista de itens da página própria: boxes de foto, nome e preço. Ao tocar,
 * abre uma folha com o item maior e o botão que o dono escolheu
 * (WhatsApp, link do item ou nenhum).
 */
export function ListaItensView({ lista, businessId, slug, paginaId, paginaTitulo, negocio, whatsapp }: { lista: Lista; businessId: string; slug: string; paginaId: string; paginaTitulo: string; negocio: string; whatsapp: string | null }) {
  const [aberto, setAberto] = useState<ListaItem | null>(null);
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(null); };
    window.addEventListener("keydown", tecla);
    fechar.current?.focus({ preventScroll: true });
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

  function linhas(lista_: ListaItem[], className: string) {
    return (
      <ul className={className}>
        {lista_.map((i, idx) => {
          const preco = precoDoItem(i.preco);
          // Só abre (e mostra a setinha) quando há o que ver: foto ou link. Sem isso é uma linha simples.
          const abre = fotosDoItem(i).length > 0 || !!urlSegura(i.link);
          const Envoltorio = abre ? "button" : "div";
          return (
            <li key={i.id} className={idx > 0 ? "border-t border-divider" : ""}>
              <Envoltorio {...(abre ? { type: "button" as const, onClick: () => abrir(i) } : {})} className={`flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-left ${abre ? "active:bg-surface-soft" : ""}`}>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block break-words text-[15px] font-medium leading-snug">{i.nome}</span>
                  {i.descricao?.trim() && <span className="mt-0.5 line-clamp-2 block break-words text-[13px] leading-snug text-text-secondary">{i.descricao}</span>}
                  {i.esgotado && <span className="mt-0.5 block text-[12px] text-text-tertiary">Esgotado</span>}
                </span>
                {preco && <span className="shrink-0 text-[14px] text-text-secondary">{preco}</span>}
                {abre && <span className="shrink-0 text-text-tertiary" aria-hidden>›</span>}
              </Envoltorio>
            </li>
          );
        })}
      </ul>
    );
  }

  // Os itens com foto vêm primeiro, na ordem do dono. Os sem foto ficam juntos no
  // final, numa faixa só de largura total: sem buraco ao lado de foto alta.
  const blocos: { foto: boolean; itens: ListaItem[] }[] = [];
  for (const i of [...itens.filter((x) => !!x.foto), ...itens.filter((x) => !x.foto)]) {
    const foto = !!i.foto;
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.foto === foto) ultimo.itens.push(i);
    else blocos.push({ foto, itens: [i] });
  }

  const aberto_ = aberto;
  const linkItem = aberto_ ? urlSegura(aberto_.link) : null;

  return (
    <section className="mt-8" aria-label={lista.titulo || "Itens"}>
      {lista.titulo.trim() && <h2 className="font-[family-name:var(--font-manrope)] text-[20px] font-medium leading-tight">{lista.titulo}</h2>}
      {semFotos ? (
        // Nenhum item tem foto: lista limpa de linhas (nome, preço, seta), sem caixas cinzas vazias.
        linhas(itens, "mt-3 overflow-hidden rounded-[20px] bg-surface-white ring-1 ring-black/[0.05]")
      ) : (
      <div className="mt-3 flex flex-col gap-3">
        {blocos.map((bl, bi) => bl.foto ? (
        <ul key={bi} className="grid grid-cols-2 gap-3">
          {bl.itens.map((i) => {
            const preco = precoDoItem(i.preco);
            return (
              <li key={i.id}>
                <button type="button" onClick={() => abrir(i)} className="block w-full overflow-hidden rounded-[20px] bg-surface-white text-left ring-1 ring-black/[0.05] transition-transform active:scale-[0.98]">
                  {i.foto && (
                    <span className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {i.esgotado && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-text-secondary">Esgotado</span>}
                      {fotosDoItem(i).length > 1 && <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">1/{fotosDoItem(i).length}</span>}
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
        ) : (
          <div key={bi}>{linhas(bl.itens, "overflow-hidden rounded-[20px] bg-surface-white ring-1 ring-black/[0.05]")}</div>
        ))}
      </div>
      )}

      {aberto_ && createPortal(
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={aberto_.nome}>
          <button type="button" aria-label="Fechar" onClick={() => setAberto(null)} className="veu-entra absolute inset-0 bg-black/40" />
          <div className="folha-sobe absolute inset-0 mx-auto h-full w-full max-w-[440px] overflow-y-auto overscroll-contain bg-background-main px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <div className="sticky top-0 z-10 -mx-5 flex justify-end px-5 pb-1 pt-[max(1rem,env(safe-area-inset-top))]">
              <button ref={fechar} type="button" onClick={() => setAberto(null)} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-[15px] shadow-[0_2px_10px_rgba(17,19,24,0.12)] active:scale-95">✕</button>
            </div>
            <CarrosselItem fotos={fotosDoItem(aberto_)} nome={aberto_.nome} />
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
                Falar agora
              </a>
            ) : lista.destino === "delivery" ? (
              <a
                href={`/${slug}?delivery=1`}
                onClick={() => trackClick({ businessId, kind: "cta", contentItemId: paginaId })}
                className="mt-5 flex min-h-[50px] items-center justify-center rounded-full bg-on-background text-[15px] font-semibold text-white active:scale-[0.98]"
              >
                Pedir no delivery
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
            {lista.orbi !== false && (
              <a
                href={`/${slug}?chat=1&msg=${encodeURIComponent(`Quero saber mais sobre "${aberto_.nome}" (${paginaTitulo})`)}`}
                onClick={() => trackClick({ businessId, kind: "zara", contentItemId: paginaId })}
                className="mt-2.5 flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border border-divider text-[14px] font-medium text-text-secondary active:scale-[0.98]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-orbi-gradient-start" aria-hidden />
                Perguntar à Orbi
              </a>
            )}
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}

/** Fotos do item em carrossel: desliza com o dedo, com pontinhos embaixo. Uma foto só, sem pontos. */
function CarrosselItem({ fotos, nome }: { fotos: string[]; nome: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  if (fotos.length === 0) return null;
  return (
    <div className="mt-1">
      <div
        ref={trilho}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtual(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-[22px] bg-surface-soft"
      >
        {fotos.map((f, n) => (
          <div key={f + n} className="aspect-[4/5] w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f} alt={fotos.length > 1 ? `${nome}, foto ${n + 1} de ${fotos.length}` : nome} loading={n === 0 ? "eager" : "lazy"} draggable={false} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
      {fotos.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5" aria-hidden>
          {fotos.map((_, n) => (
            <button
              key={n}
              type="button"
              tabIndex={-1}
              onClick={() => trilho.current?.scrollTo({ left: n * trilho.current.clientWidth, behavior: "smooth" })}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${n === atual ? "w-5 bg-on-background" : "w-1.5 bg-on-background/25"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
