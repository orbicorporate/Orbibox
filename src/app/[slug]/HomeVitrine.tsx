"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { COR_DA_REDE, FUNDO_DA_REDE, IconeRede, type Rede } from "@/lib/redesSociais";
import { formatPrice } from "@/lib/showcase";

export type BolinhaVitrine = {
  key: string;
  rotulo: string;
  tipo: "whatsapp" | "endereco" | "site" | "rede" | "voucher";
  rede?: Rede;
  endereco?: string;
  /** Selinho pequeno sobre a bolinha, ex.: "oferta". */
  selo?: string;
  onClick: () => void;
};

export type ItemVitrine = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  price_max: number | null;
  image_url: string | null;
};

const MINIMO_COM_FOTO = 4;
const MAXIMO = 6;

function Icone({ tipo, rede }: { tipo: BolinhaVitrine["tipo"]; rede?: Rede }) {
  const p = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (tipo === "whatsapp") return <svg {...p} fill="currentColor" stroke="none"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" /></svg>;
  if (tipo === "endereco") return <svg {...p}><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>;
  if (tipo === "voucher") return <svg {...p}><path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 0 0-6V6H3Z" /><path d="M14 6v12" strokeDasharray="2 2.5" /></svg>;
  if (tipo === "rede" && rede) return <IconeRede rede={rede} size={24} />;
  return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z" /></svg>;
}

function corDe(b: BolinhaVitrine): { fundo: string; sombra: string } {
  if (b.tipo === "whatsapp") return { fundo: "#25D366", sombra: "#25D366" };
  if (b.tipo === "endereco") return { fundo: "#EA4335", sombra: "#EA4335" };
  if (b.tipo === "voucher") return { fundo: "#111318", sombra: "#111318" };
  if (b.tipo === "rede" && b.rede) return { fundo: FUNDO_DA_REDE[b.rede], sombra: COR_DA_REDE[b.rede] };
  return { fundo: "#111318", sombra: "#111318" };
}

/**
 * Home em estilo Vitrine: bolinhas com nome no topo (estilo destaques do
 * Instagram), um botão principal e uma fileira curta de itens com foto.
 * Os itens só aparecem com pelo menos 4 fotos, pra nunca ficar um buraco.
 */
export function HomeVitrine({
  bolinhas,
  ctaRotulo,
  onCta,
  itens,
  tituloItens,
  onItem,
  onVerTudo,
  extras,
}: {
  bolinhas: BolinhaVitrine[];
  ctaRotulo: string;
  onCta: () => void;
  itens: ItemVitrine[];
  tituloItens: string;
  onItem: (id: string) => void;
  onVerTudo: () => void;
  /** Caminhos que não viram bolinha (Perguntar, Presentear, Sobre), em pílulas discretas. */
  extras: { key: string; rotulo: string; onClick: () => void }[];
}) {
  const [enderecoAberto, setEnderecoAberto] = useState<string | null>(null);
  const comFoto = itens.filter((i) => !!i.image_url);
  const mostrar = comFoto.length >= MINIMO_COM_FOTO ? comFoto.slice(0, MAXIMO) : [];

  function aoClicar(b: BolinhaVitrine) {
    if (b.tipo === "endereco" && b.endereco) {
      setEnderecoAberto((v) => (v === b.key ? null : b.key));
      return;
    }
    b.onClick();
  }

  // Até 4 bolinhas ficam numa linha; acima disso divide em duas linhas
  // equilibradas, assim nada fica cortado nem sobra uma bolinha sozinha.
  const porLinha = bolinhas.length <= 4 ? bolinhas.length : Math.ceil(bolinhas.length / 2);
  const linhas: BolinhaVitrine[][] = [];
  for (let i = 0; i < bolinhas.length; i += porLinha) linhas.push(bolinhas.slice(i, i + porLinha));

  const aberto = bolinhas.find((b) => b.key === enderecoAberto);

  return (
    <div className="mt-8 flex w-full flex-col items-center">
      {bolinhas.length > 0 && (
        <div className="flex w-full flex-col items-center gap-4">
          {linhas.map((linha, li) => (
            <div key={li} role="list" className="flex w-full justify-center gap-3">
              {linha.map((b) => {
                const c = corDe(b);
                const sel = enderecoAberto === b.key;
                return (
                  <div key={b.key} role="listitem" className="flex w-[72px] shrink-0 flex-col items-center">
                    <button
                      type="button"
                      onClick={() => aoClicar(b)}
                      aria-label={b.rotulo}
                      aria-expanded={b.tipo === "endereco" ? sel : undefined}
                      style={{ background: c.fundo, boxShadow: `0 6px 16px -6px ${c.sombra}99` } as CSSProperties}
                      className="relative flex h-[60px] w-[60px] items-center justify-center rounded-full text-white transition-transform active:scale-95"
                    >
                      <Icone tipo={b.tipo} rede={b.rede} />
                      {b.selo && (
                        <span className="absolute -right-3 -top-1 rounded-full bg-[#FF5A36] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow">
                          {b.selo}
                        </span>
                      )}
                    </button>
                    <span className="mt-1.5 w-full truncate text-center text-[11.5px] leading-tight text-text-secondary">{b.rotulo}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {aberto?.endereco && (
        <div className="mt-4 w-full max-w-[320px] rounded-2xl bg-surface-white p-4 text-center shadow-[0_2px_12px_rgba(17,19,24,0.08)]">
          <p className="text-[13.5px] leading-snug text-text-secondary">{aberto.endereco}</p>
          <div className="mt-3 flex gap-2">
            <a href={`https://waze.com/ul?q=${encodeURIComponent(aberto.endereco)}&navigate=yes`} target="_blank" rel="noopener noreferrer" onClick={aberto.onClick} className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Waze</a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(aberto.endereco)}`} target="_blank" rel="noopener noreferrer" onClick={aberto.onClick} className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Google Maps</a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onCta}
        className="mt-7 flex min-h-[52px] w-full max-w-[340px] items-center justify-center rounded-full bg-button-primary px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(17,19,24,0.5)] transition-transform active:scale-[0.98]"
      >
        {ctaRotulo}
      </button>

      {extras.length > 0 && (
        <div className="mt-3 flex w-full flex-wrap justify-center gap-2">
          {extras.map((e) => (
            <button key={e.key} type="button" onClick={e.onClick} className="min-h-[40px] rounded-full border border-divider bg-surface-white px-4 text-[13.5px] font-medium text-on-background active:scale-[0.98]">
              {e.rotulo}
            </button>
          ))}
        </div>
      )}

      {mostrar.length > 0 && (
        <section className="mt-9 w-full" aria-label={tituloItens}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-[family-name:var(--font-manrope)] text-[17px] font-medium tracking-[-0.01em]">{tituloItens}</h2>
            <button type="button" onClick={onVerTudo} className="min-h-[36px] text-[13px] font-medium text-text-secondary underline underline-offset-4">
              Ver tudo
            </button>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {mostrar.map((i) => (
              <Item key={i.id} item={i} onClick={() => onItem(i.id)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Item({ item, onClick }: { item: ItemVitrine; onClick: () => void }): ReactNode {
  const preco = formatPrice(item);
  return (
    <li>
      <button type="button" onClick={onClick} className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[22px] bg-surface-soft text-left shadow-[0_2px_12px_rgba(17,19,24,0.08)] active:scale-[0.98]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image_url ?? ""} alt={item.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3 pb-3 pt-10">
          <span className="block truncate text-[14px] font-semibold leading-tight text-white">{item.title}</span>
          {preco ? <span className="mt-0.5 block truncate text-[11px] uppercase tracking-[0.14em] text-white/80">{preco}</span> : null}
        </span>
      </button>
    </li>
  );
}
