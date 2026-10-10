"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { COR_DA_REDE, FUNDO_DA_REDE, IconeRede, type Rede } from "@/lib/redesSociais";
import { groupByCategory } from "@/lib/showcase";
import { CartaoItem, type ItemCartao } from "./CartaoItem";

export type BolinhaVitrine = {
  key: string;
  rotulo: string;
  tipo: "whatsapp" | "endereco" | "site" | "rede" | "voucher";
  rede?: Rede;
  endereco?: string;
  /** "cor" = bolinha cheia de cor; "linha" = minimalista, só contorno e ícone. */
  estilo: "cor" | "linha";
  /** Só as que vêm de um box podem ser editadas e reordenadas. */
  editavel: boolean;
  /** Selinho pequeno sobre a bolinha, ex.: "oferta". */
  selo?: string;
  onClick: () => void;
};

export type ItemVitrine = ItemCartao;

export type FormatoItens = "destaque" | "grade" | "carrossel";

const FORMATOS: { v: FormatoItens; titulo: string; texto: string }[] = [
  { v: "destaque", titulo: "Destaque e grade", texto: "O primeiro item grande, os outros em duas colunas." },
  { v: "grade", titulo: "Grade", texto: "Todos do mesmo tamanho, duas colunas." },
  { v: "carrossel", titulo: "Carrossel", texto: "Uma linha que rola de lado. Ocupa pouca altura." },
];

const MINIMO_COM_FOTO = 4;
const MAXIMO = 6;

function Icone({ tipo, rede, linha }: { tipo: BolinhaVitrine["tipo"]; rede?: Rede; linha?: boolean }) {
  const p = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (tipo === "whatsapp" && linha) return <svg {...p}><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" /><path d="M9 8.5c-.3 1.6.8 3.6 2.4 5s3.3 2 4.6 1.6" /></svg>;
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
  slug,
  businessId,
  sessionId,
  onVerTudo,
  extras,
  podeEditar,
  onEstilo,
  onMover,
  ordemCategorias,
  formato,
  onFormato,
}: {
  bolinhas: BolinhaVitrine[];
  ctaRotulo: string;
  onCta: () => void;
  itens: ItemVitrine[];
  tituloItens: string;
  slug: string;
  businessId: string;
  sessionId: string | null;
  onVerTudo: (categoria: string | null) => void;
  /** Caminhos que não viram bolinha (Perguntar, Presentear, Sobre), em pílulas discretas. */
  extras: { key: string; rotulo: string; onClick: () => void }[];
  /** Dono fora do modo visitante: mostra o lápis das bolinhas. */
  podeEditar: boolean;
  onEstilo: (keys: string[], estilo: "cor" | "linha") => void;
  onMover: (key: string, dir: -1 | 1) => void;
  ordemCategorias: string[];
  formato: FormatoItens;
  /** Undefined quando não há onde guardar a escolha (sem box da vitrine). */
  onFormato?: (f: FormatoItens) => void;
}) {
  const [chip, setChip] = useState<string | null>(null);
  const [editandoFormato, setEditandoFormato] = useState(false);
  const [editando, setEditando] = useState(false);
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [enderecoAberto, setEnderecoAberto] = useState<string | null>(null);
  const comFoto = itens.filter((i) => !!i.image_url);
  // Chips só com 2 ou mais categorias que tenham ao menos 2 itens com foto.
  const categorias = groupByCategory(comFoto, ordemCategorias).filter((c) => c.name && c.items.length >= 2).slice(0, 5);
  const temChips = categorias.length >= 2;
  const ativo = temChips ? categorias.find((c) => c.name === chip) ?? null : null;
  const base = ativo ? ativo.items : [...comFoto].sort((a, b) => a.position - b.position);
  const mostrar = comFoto.length >= MINIMO_COM_FOTO ? base.slice(0, MAXIMO) : [];

  function aoClicar(b: BolinhaVitrine) {
    if (b.tipo === "endereco" && b.endereco) {
      setEnderecoAberto((v) => (v === b.key ? null : b.key));
      return;
    }
    b.onClick();
  }

  const aberto = bolinhas.find((b) => b.key === enderecoAberto);

  return (
    <div className="mt-8 flex w-full flex-col items-center">
      {bolinhas.length > 0 && (
        <div className="relative w-full">
          {podeEditar && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              aria-label="Editar bolinhas"
              className="absolute -top-3 right-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-white text-[13px] text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.18)] ring-1 ring-black/[0.06] active:scale-95"
            >
              ✎
            </button>
          )}
          <div
            role="list"
            className="no-scrollbar -mx-6 flex w-[calc(100%+3rem)] snap-x snap-proximity gap-3 overflow-x-auto px-6 pb-2 pt-2 [justify-content:safe_center] [mask-image:linear-gradient(to_right,transparent,#000_22px,#000_calc(100%-22px),transparent)]"
          >
            {bolinhas.map((b) => (
              <div key={b.key} role="listitem" className="flex w-[72px] shrink-0 snap-center flex-col items-center">
                <Bolinha b={b} aberto={enderecoAberto === b.key} onClick={() => aoClicar(b)} />
                <span className="mt-1.5 w-full truncate text-center text-[11.5px] leading-tight text-text-secondary">{b.rotulo}</span>
              </div>
            ))}
          </div>
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
        <nav aria-label="Mais caminhos" className="mt-4 flex w-full flex-wrap items-center justify-center gap-x-1 text-[13.5px] text-text-secondary">
          {extras.map((x, i) => (
            <span key={x.key} className="flex items-center">
              {i > 0 && <span aria-hidden className="mx-2 text-text-tertiary">·</span>}
              <button type="button" onClick={x.onClick} className="min-h-[40px] underline decoration-black/15 underline-offset-[5px] active:opacity-60">
                {x.rotulo}
              </button>
            </span>
          ))}
        </nav>
      )}

      {mostrar.length > 0 && (
        <section className="mt-9 w-full" aria-label={tituloItens}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-manrope)] text-[17px] font-medium tracking-[-0.01em]">{tituloItens}</h2>
            <div className="flex items-center gap-1">
              {podeEditar && onFormato && (
                <button type="button" onClick={() => setEditandoFormato(true)} aria-label="Editar formato dos itens" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-white text-[13px] text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.18)] ring-1 ring-black/[0.06] active:scale-95">✎</button>
              )}
              <button type="button" onClick={() => onVerTudo(ativo?.name ?? null)} className="min-h-[36px] px-1 text-[13px] font-medium text-text-secondary underline underline-offset-4">
                {itens.length > mostrar.length ? `Ver todos (${itens.length})` : "Ver tudo"}
              </button>
            </div>
          </div>
          {temChips && (
            <div role="tablist" aria-label="Categorias" className="no-scrollbar -mx-6 mt-3 flex gap-2 overflow-x-auto px-6 pb-1">
              {[{ name: null as string | null, rotulo: "Tudo" }, ...categorias.map((c) => ({ name: c.name as string | null, rotulo: c.name }))].map((c) => {
                const on = (ativo?.name ?? null) === c.name;
                return (
                  <button
                    key={c.rotulo}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setChip(c.name)}
                    className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-full px-4 text-[13.5px] ${on ? "bg-button-primary font-medium text-white" : "border border-divider bg-surface-white text-text-secondary"}`}
                  >
                    {c.rotulo}
                  </button>
                );
              })}
            </div>
          )}
          {formato === "carrossel" ? (
            <ul className="no-scrollbar -mx-6 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2">
              {mostrar.map((i) => (
                <li key={i.id} className="w-[72%] shrink-0 snap-center">
                  <CartaoItem item={i} slug={slug} businessId={businessId} sessionId={sessionId} largura="w-full" tamanho="medio" proporcao="retrato" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {mostrar.map((i, n) => {
                const grande = formato === "destaque" && n === 0;
                return (
                  <li key={i.id} className={grande ? "col-span-2" : ""}>
                    <CartaoItem item={i} slug={slug} businessId={businessId} sessionId={sessionId} largura="w-full" tamanho={grande ? "destaque" : "medio"} proporcao={grande ? "paisagem" : "quadrado"} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {editandoFormato && montado && onFormato && createPortal(
        <>
          <button type="button" aria-label="Fechar" onClick={() => setEditandoFormato(false)} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
          <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-[440px] rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium">Formato dos itens</span>
              <button type="button" onClick={() => setEditandoFormato(false)} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Pronto</button>
            </div>
            <div role="radiogroup" className="mt-4 flex flex-col gap-2">
              {FORMATOS.map((f) => (
                <button key={f.v} type="button" role="radio" aria-checked={formato === f.v} onClick={() => onFormato(f.v)} className={`rounded-2xl border-2 p-3.5 text-left ${formato === f.v ? "border-on-background" : "border-divider"}`}>
                  <span className="block text-[14.5px] font-medium">{f.titulo}</span>
                  <span className="mt-0.5 block text-[13px] text-text-secondary">{f.texto}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body,
      )}

      {editando && montado && createPortal(
        <>
          <button type="button" aria-label="Fechar" onClick={() => setEditando(false)} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
          <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium">Editar bolinhas</span>
              <button type="button" onClick={() => setEditando(false)} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Pronto</button>
            </div>
            <p className="mt-1 text-[13px] text-text-secondary">Deixe em cor as que você quer destacar e as outras em linha. Use as setas para mudar a ordem.</p>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-soft p-3">
              <span className="text-[13.5px] font-medium">Todas</span>
              <Seletor valor={null} onChange={(e) => onEstilo(bolinhas.filter((x) => x.editavel).map((x) => x.key), e)} />
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {bolinhas.map((b, i) => (
                <li key={b.key} className="flex items-center gap-3 rounded-2xl border border-divider p-2.5">
                  <div className="scale-[0.7] origin-left -mr-3.5 w-[60px] shrink-0"><Bolinha b={b} aberto={false} onClick={() => {}} /></div>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{b.rotulo}</span>
                  {b.editavel ? (
                    <>
                      <Seletor valor={b.estilo} onChange={(e) => onEstilo([b.key], e)} />
                      <div className="flex flex-col">
                        <button type="button" aria-label={`Subir ${b.rotulo}`} disabled={i === 0} onClick={() => onMover(b.key, -1)} className="flex h-[22px] w-8 items-center justify-center text-[13px] text-text-secondary disabled:opacity-25">▲</button>
                        <button type="button" aria-label={`Descer ${b.rotulo}`} disabled={i === bolinhas.length - 1} onClick={() => onMover(b.key, 1)} className="flex h-[22px] w-8 items-center justify-center text-[13px] text-text-secondary disabled:opacity-25">▼</button>
                      </div>
                    </>
                  ) : (
                    <span className="text-[12px] text-text-tertiary">automática</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

function Bolinha({ b, aberto, onClick }: { b: BolinhaVitrine; aberto: boolean; onClick: () => void }) {
  const c = corDe(b);
  const linha = b.estilo === "linha";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={b.rotulo}
      aria-expanded={b.tipo === "endereco" ? aberto : undefined}
      style={(linha ? {} : { background: c.fundo, boxShadow: `0 6px 16px -6px ${c.sombra}99` }) as CSSProperties}
      className={`relative flex h-[60px] w-[60px] items-center justify-center rounded-full transition-transform active:scale-95 ${linha ? "border-[1.5px] border-on-background/70 bg-transparent text-on-background" : "text-white"}`}
    >
      <Icone tipo={b.tipo} rede={b.rede} linha={linha} />
      {b.selo && (
        <span className="absolute -right-3 -top-1 rounded-full bg-[#FF5A36] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow">
          {b.selo}
        </span>
      )}
    </button>
  );
}

function Seletor({ valor, onChange }: { valor: "cor" | "linha" | null; onChange: (e: "cor" | "linha") => void }) {
  return (
    <div role="radiogroup" className="flex rounded-full bg-surface-soft p-0.5 text-[12.5px]">
      {(["cor", "linha"] as const).map((e) => (
        <button
          key={e}
          type="button"
          role="radio"
          aria-checked={valor === e}
          onClick={() => onChange(e)}
          className={`min-h-[34px] rounded-full px-3.5 font-medium ${valor === e ? "bg-on-background text-white" : "text-text-secondary"}`}
        >
          {e === "cor" ? "Cor" : "Linha"}
        </button>
      ))}
    </div>
  );
}
