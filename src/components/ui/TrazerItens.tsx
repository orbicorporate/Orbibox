"use client";

import { useEffect, useMemo, useState } from "react";

export type ItemTrazer = { key: string; nome: string; foto: string | null; preco: number | null; categoria: string };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Folha para escolher quais itens passar de um lado para o outro
 * (Catálogo e Cardápio). Mostra só o que ainda não está no destino.
 */
export function TrazerItens({ titulo, ajuda, itens, carregando, rotuloBotao, onConfirmar, onFechar }: {
  titulo: string;
  ajuda: string;
  itens: ItemTrazer[];
  carregando: boolean;
  rotuloBotao: (n: number) => string;
  onConfirmar: (chaves: string[]) => Promise<void> | void;
  onFechar: () => void;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", tecla);
    return () => { document.body.style.overflow = antes; window.removeEventListener("keydown", tecla); };
  }, [onFechar]);

  const grupos = useMemo(() => {
    const m = new Map<string, ItemTrazer[]>();
    for (const i of itens) {
      const c = i.categoria.trim() || "Sem categoria";
      m.set(c, [...(m.get(c) ?? []), i]);
    }
    return [...m.entries()];
  }, [itens]);

  const todos = itens.length > 0 && sel.size === itens.length;
  const alternar = (k: string) => setSel((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  async function confirmar() {
    setEnviando(true);
    await onConfirmar([...sel]);
    setEnviando(false);
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Fechar" onClick={onFechar} className="veu-entra absolute inset-0 bg-black/40" />
      <div className="folha-sobe absolute inset-x-0 bottom-0 mx-auto flex max-h-[88vh] w-full max-w-[440px] flex-col rounded-t-[28px] bg-background-main">
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <h3 className="font-[family-name:var(--font-manrope)] text-[20px] font-medium leading-tight">{titulo}</h3>
            <p className="mt-1 text-[13px] leading-snug text-text-secondary">{ajuda}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
        </div>

        {carregando ? (
          <p className="px-5 py-10 text-center text-[14px] text-text-tertiary">Carregando…</p>
        ) : itens.length === 0 ? (
          <p className="px-5 py-10 text-center text-[14px] text-text-secondary">Não há nada novo para trazer. Tudo o que está lá já está aqui.</p>
        ) : (
          <>
            <div className="px-5 pb-2 pt-1">
              <button type="button" onClick={() => setSel(todos ? new Set() : new Set(itens.map((i) => i.key)))} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary">
                {todos ? "Limpar seleção" : `Selecionar tudo (${itens.length})`}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
              {grupos.map(([cat, lista]) => (
                <section key={cat} className="mt-3">
                  <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">{cat}</p>
                  <ul className="overflow-hidden rounded-[20px] bg-surface-white ring-1 ring-black/[0.05]">
                    {lista.map((i, n) => {
                      const on = sel.has(i.key);
                      return (
                        <li key={i.key} className={n > 0 ? "border-t border-divider" : ""}>
                          <button type="button" role="checkbox" aria-checked={on} onClick={() => alternar(i.key)} className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left active:bg-surface-soft">
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] ${on ? "border-on-background bg-on-background text-white" : "border-divider text-transparent"}`} aria-hidden>✓</span>
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-soft text-[12px] text-text-tertiary">
                              {i.foto ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={i.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                              ) : "sem foto"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 block break-words text-[14px] font-medium leading-snug">{i.nome}</span>
                              {i.preco != null && <span className="block text-[12.5px] text-text-secondary">{brl(i.preco)}</span>}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
            <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
              <button type="button" onClick={confirmar} disabled={sel.size === 0 || enviando} className="min-h-[50px] w-full rounded-full bg-on-background text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-40">
                {enviando ? "Trazendo…" : rotuloBotao(sel.size)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
