"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { novoId, type CardapioItem, type CardapioSecao } from "@/lib/cardapio";

const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background";

/**
 * Editor dos pratos do cardápio: categorias com pratos. Só o nome é obrigatório,
 * descrição e foto são opcionais. Sem foto, o cliente vê o prato só com texto.
 */
export function PratosEditor({ businessId, secoes, onChange }: { businessId: string; secoes: CardapioSecao[]; onChange: (s: CardapioSecao[]) => void }) {
  const supabase = useRef(createClient()).current;
  const inputFoto = useRef<HTMLInputElement>(null);
  const alvo = useRef<{ s: string; i: string } | null>(null);
  const [subindo, setSubindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  function mudarItem(sid: string, iid: string, patch: Partial<CardapioItem>) {
    onChange(secoes.map((s) => (s.id !== sid ? s : { ...s, itens: s.itens.map((i) => (i.id === iid ? { ...i, ...patch } : i)) })));
  }
  function mudarSecao(sid: string, patch: Partial<CardapioSecao>) {
    onChange(secoes.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
  }
  function novaSecao() {
    const s: CardapioSecao = { id: novoId(), nome: "", itens: [] };
    onChange([...secoes, s]);
  }
  function novoPrato(sid: string) {
    const i: CardapioItem = { id: novoId(), nome: "", descricao: "", preco: null, foto: null };
    onChange(secoes.map((s) => (s.id === sid ? { ...s, itens: [...s.itens, i] } : s)));
    setAberto(i.id);
  }
  function removerPrato(sid: string, iid: string) {
    onChange(secoes.map((s) => (s.id === sid ? { ...s, itens: s.itens.filter((i) => i.id !== iid) } : s)));
  }
  function removerSecao(s: CardapioSecao) {
    if (s.itens.length > 0 && !window.confirm(`Apagar a categoria "${s.nome || "sem nome"}" e os ${s.itens.length} pratos dela?`)) return;
    onChange(secoes.filter((x) => x.id !== s.id));
  }
  function mover(idx: number, d: -1 | 1) {
    const j = idx + d;
    if (j < 0 || j >= secoes.length) return;
    const c = [...secoes];
    [c[idx], c[j]] = [c[j], c[idx]];
    onChange(c);
  }

  async function enviarFoto(f: File | undefined) {
    const a = alvo.current;
    if (inputFoto.current) inputFoto.current.value = "";
    if (!f || !a) return;
    if (!f.type.startsWith("image/")) return setErro("Envie uma foto (JPG ou PNG).");
    setErro(null);
    setSubindo(a.i);
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `${businessId}/cardapio-prato-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("box-images").upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
    setSubindo(null);
    if (error) return setErro("Não consegui enviar a foto. Tente de novo.");
    mudarItem(a.s, a.i, { foto: supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl });
  }

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-manrope)] text-[19px] font-medium">Pratos do cardápio</h2>
          <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">Só o nome é obrigatório. Foto e descrição são opcionais.</p>
        </div>
      </div>
      <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={(e) => enviarFoto(e.target.files?.[0])} />
      {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}

      {secoes.length === 0 && (
        <p className="mt-3 rounded-[22px] border border-dashed border-divider p-5 text-center text-[13.5px] leading-snug text-text-tertiary">Nenhum prato ainda. Importe com a Orbi acima ou crie a primeira categoria.</p>
      )}

      <div className="mt-3 flex flex-col gap-4">
        {secoes.map((s, idx) => (
          <section key={s.id} className="rounded-[24px] bg-surface-white p-4 ring-1 ring-black/[0.06]" aria-label={s.nome || "Categoria"}>
            <div className="flex items-center gap-2">
              <input value={s.nome} onChange={(e) => mudarSecao(s.id, { nome: e.target.value })} maxLength={40} placeholder="Nome da categoria (ex: Pratos, Bebidas)" aria-label="Nome da categoria" className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-manrope)] text-[17px] font-semibold outline-none placeholder:font-normal placeholder:text-text-tertiary" />
              <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0} aria-label="Subir categoria" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px] disabled:opacity-30">↑</button>
              <button type="button" onClick={() => mover(idx, 1)} disabled={idx === secoes.length - 1} aria-label="Descer categoria" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px] disabled:opacity-30">↓</button>
            </div>

            <ul className="mt-3 flex flex-col gap-2">
              {s.itens.map((i) => {
                const aberta = aberto === i.id;
                return (
                  <li key={i.id} className="rounded-2xl border border-divider">
                    <button type="button" onClick={() => setAberto(aberta ? null : i.id)} aria-expanded={aberta} className="flex w-full items-center gap-3 p-2.5 text-left">
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-surface-soft">
                        {i.foto && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.foto} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-medium">{i.nome || "Prato sem nome"}</span>
                        <span className="block truncate text-[12.5px] text-text-tertiary">{i.preco != null ? i.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Sem preço"}{i.descricao ? " · com descrição" : ""}</span>
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-text-tertiary transition-transform ${aberta ? "rotate-180" : ""}`} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
                    </button>

                    {aberta && (
                      <div className="flex flex-col gap-2.5 border-t border-divider p-3">
                        <input value={i.nome} onChange={(e) => mudarItem(s.id, i.id, { nome: e.target.value })} maxLength={80} placeholder="Nome do prato" aria-label="Nome do prato" className={campo} autoFocus={!i.nome} />
                        <textarea value={i.descricao ?? ""} onChange={(e) => mudarItem(s.id, i.id, { descricao: e.target.value })} rows={3} maxLength={600} placeholder="Descrição (opcional): ingredientes, tamanho, o que acompanha" aria-label="Descrição do prato" className={`${campo} resize-y text-[14px] leading-snug`} />
                        <div className="flex items-center gap-2">
                          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] text-text-secondary focus-within:border-on-background">
                            R$
                            <input
                              value={i.preco == null ? "" : String(i.preco).replace(".", ",")}
                              onChange={(e) => { const v = e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""); mudarItem(s.id, i.id, { preco: v === "" ? null : Number(v) || 0 }); }}
                              inputMode="decimal"
                              placeholder="Preço (opcional)"
                              aria-label="Preço"
                              className="min-w-0 flex-1 bg-transparent text-[15px] text-on-background outline-none"
                            />
                          </label>
                          <button type="button" role="checkbox" aria-checked={!!i.aPartir} onClick={() => mudarItem(s.id, i.id, { aPartir: !i.aPartir })} className={`min-h-[44px] shrink-0 rounded-full px-4 text-[13px] font-medium ${i.aPartir ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>A partir de</button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => { alvo.current = { s: s.id, i: i.id }; inputFoto.current?.click(); }} disabled={subindo === i.id} className="min-h-[44px] rounded-full border border-divider px-4 text-[13.5px] font-medium disabled:opacity-50">
                            {subindo === i.id ? "Enviando…" : i.foto ? "Trocar foto" : "Adicionar foto"}
                          </button>
                          {i.foto && <button type="button" onClick={() => mudarItem(s.id, i.id, { foto: null })} className="min-h-[44px] rounded-full px-3 text-[13.5px] font-medium text-text-secondary">Tirar foto</button>}
                          <button type="button" onClick={() => removerPrato(s.id, i.id)} className="ml-auto min-h-[44px] rounded-full px-3 text-[13.5px] font-medium text-red-600">Apagar prato</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button type="button" onClick={() => novoPrato(s.id)} className="min-h-[44px] rounded-full bg-on-background px-5 text-[13.5px] font-semibold text-white active:scale-[0.98]">+ Adicionar prato</button>
              <button type="button" onClick={() => removerSecao(s)} className="min-h-[44px] rounded-full px-3 text-[13px] font-medium text-text-tertiary">Apagar categoria</button>
            </div>
          </section>
        ))}
      </div>

      <button type="button" onClick={novaSecao} className="mt-4 min-h-[48px] w-full rounded-full border border-divider bg-surface-white text-[14px] font-medium active:scale-[0.99]">+ Nova categoria</button>
    </div>
  );
}
