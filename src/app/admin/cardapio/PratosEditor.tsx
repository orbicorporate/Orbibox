"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AjustarFoto } from "./AjustarFoto";
import { MinhaGaleriaPicker } from "@/components/ui/MinhaGaleriaPicker";
import { TrazerItens } from "@/components/ui/TrazerItens";
import { avisoDoEnvio, enviarAoCatalogo, itensDoCatalogo, mesclarNoCardapio, type ItemDoCatalogo } from "@/lib/cardapioSync";
import { estiloFoto, nomeArquivoUnico, novoId, type CardapioItem, type CardapioSecao } from "@/lib/cardapio";

const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background";

/**
 * Editor dos pratos do cardápio: categorias com pratos. Só o nome é obrigatório,
 * descrição e foto são opcionais. Sem foto, o cliente vê o prato só com texto.
 */
export function PratosEditor({ businessId, secoes, onChange, children }: { businessId: string; secoes: CardapioSecao[]; onChange: (s: CardapioSecao[]) => void; children?: React.ReactNode }) {
  const supabase = useRef(createClient()).current;
  const inputFoto = useRef<HTMLInputElement>(null);
  const alvo = useRef<{ s: string; i: string } | null>(null);
  const [subindo, setSubindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Passagem de itens entre Cardápio e Catálogo.
  const [aviso, setAviso] = useState<string | null>(null);
  const [trazendo, setTrazendo] = useState<{ carregando: boolean; itens: ItemDoCatalogo[] } | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  // Categorias recolhidas. Com mais de uma, só a primeira começa aberta; categoria nova ou importada nasce aberta.
  const [fechadas, setFechadas] = useState<string[]>(() => (secoes.length > 1 ? secoes.slice(1).map((x) => x.id) : []));
  const [comDesc, setComDesc] = useState<string[]>([]);
  const [ajustando, setAjustando] = useState<string | null>(null);
  const [galeriaPara, setGaleriaPara] = useState<{ s: string; i: string } | null>(null);
  const [apagado, setApagado] = useState<{ s: string; idx: number; item: CardapioItem } | null>(null);
  const timerDesfazer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function mudarItem(sid: string, iid: string, patch: Partial<CardapioItem>) {
    onChange(secoes.map((s) => (s.id !== sid ? s : { ...s, itens: s.itens.map((i) => (i.id === iid ? { ...i, ...patch } : i)) })));
  }
  function mudarSecao(sid: string, patch: Partial<CardapioSecao>) {
    onChange(secoes.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
  }
  function novoPrato(sid: string) {
    const i: CardapioItem = { id: novoId(), nome: "", descricao: "", preco: null, foto: null };
    onChange(secoes.map((s) => (s.id === sid ? { ...s, itens: [...s.itens, i] } : s)));
    setAberto(i.id);
  }
  function removerPrato(sid: string, iid: string) {
    const sec = secoes.find((s) => s.id === sid);
    const idx = sec ? sec.itens.findIndex((i) => i.id === iid) : -1;
    if (sec && idx >= 0) {
      setApagado({ s: sid, idx, item: sec.itens[idx] });
      if (timerDesfazer.current) clearTimeout(timerDesfazer.current);
      timerDesfazer.current = setTimeout(() => setApagado(null), 7000);
    }
    onChange(secoes.map((s) => (s.id === sid ? { ...s, itens: s.itens.filter((i) => i.id !== iid) } : s)));
  }
  function desfazer() {
    if (!apagado) return;
    const a = apagado;
    setApagado(null);
    onChange(secoes.map((s) => (s.id === a.s ? { ...s, itens: [...s.itens.slice(0, a.idx), a.item, ...s.itens.slice(a.idx)] } : s)));
  }
  async function abrirTrazer() {
    setAviso(null);
    setTrazendo({ carregando: true, itens: [] });
    const todos = await itensDoCatalogo(supabase, businessId);
    const jaTem = new Set(secoes.flatMap((s) => s.itens.map((i) => i.nome.trim().toLowerCase())));
    setTrazendo({ carregando: false, itens: todos.filter((i) => !jaTem.has(i.titulo.trim().toLowerCase())) });
  }
  function trazer(chaves: string[]) {
    const escolhidos = (trazendo?.itens ?? []).filter((i) => chaves.includes(i.id));
    const m = mesclarNoCardapio(secoes, escolhidos);
    onChange(m.secoes);
    setTrazendo(null);
    setAviso(m.novos === 0 ? "Nada novo para trazer." : `${m.novos === 1 ? "1 item trazido" : `${m.novos} itens trazidos`} do catálogo.`);
  }
  async function mostrarNoCatalogo(s: CardapioSecao, i: CardapioItem) {
    setAviso(null);
    const r = await enviarAoCatalogo(supabase, businessId, [{ nome: i.nome, descricao: i.descricao, preco: i.preco, foto: i.foto, categoria: s.nome }]);
    setAviso(avisoDoEnvio(r, "catálogo"));
  }
  function removerSecao(s: CardapioSecao) {
    if (s.itens.length > 0 && !window.confirm(`Apagar a categoria "${s.nome || "sem nome"}" e os ${s.itens.length} pratos dela?`)) return;
    onChange(secoes.filter((x) => x.id !== s.id));
  }
  function alternarSecao(id: string) {
    setFechadas((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function mover(idx: number, d: -1 | 1) {
    const j = idx + d;
    if (j < 0 || j >= secoes.length) return;
    const c = [...secoes];
    [c[idx], c[j]] = [c[j], c[idx]];
    onChange(c);
  }

  /** Sobe a foto já sem fundo e a coloca no prato (apaga o enquadramento, que valia para a antiga). */
  async function trocarFotoPor(sid: string, iid: string, b: Blob): Promise<boolean> {
    const path = `${businessId}/${nomeArquivoUnico("cardapio-prato", "jpg")}`;
    const { error } = await supabase.storage.from("box-images").upload(path, b, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });
    if (error) return false;
    mudarItem(sid, iid, { foto: supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl, fotoAjuste: null });
    return true;
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
    mudarItem(a.s, a.i, { fotoAjuste: null, foto: supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl });
  }

  return (
    <div className="mt-3">
      <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={(e) => enviarFoto(e.target.files?.[0])} />
      {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}

      {children}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={abrirTrazer} className="min-h-[44px] rounded-full bg-surface-soft px-5 text-[13.5px] font-medium text-on-background active:scale-[0.98]">Trazer do catálogo</button>
        {aviso && <p role="status" className="text-[12.5px] text-text-secondary">{aviso}</p>}
      </div>

      {secoes.length > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[12.5px] text-text-tertiary">{secoes.length} categorias · {secoes.reduce((n, x) => n + x.itens.length, 0)} pratos</p>
          <button
            type="button"
            onClick={() => setFechadas(fechadas.length >= secoes.length ? [] : secoes.map((x) => x.id))}
            className="min-h-[40px] rounded-full border border-divider bg-surface-white px-4 text-[13px] font-medium active:scale-[0.98]"
          >
            {fechadas.length >= secoes.length ? "Expandir tudo" : "Recolher tudo"}
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-4">
        {secoes.map((s, idx) => {
          const recolhida = fechadas.includes(s.id);
          return (
          <section key={s.id} id={`cat-${s.id}`} className="scroll-mt-28 rounded-[24px] bg-surface-white p-4 ring-1 ring-black/[0.06]" aria-label={s.nome || "Categoria"}>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => alternarSecao(s.id)} aria-expanded={!recolhida} aria-label={recolhida ? `Expandir ${s.nome || "categoria"}` : `Recolher ${s.nome || "categoria"}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-on-background active:scale-[0.96]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${recolhida ? "-rotate-90" : ""}`} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-surface-soft px-3.5 py-2 focus-within:ring-2 focus-within:ring-on-background/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-tertiary" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                <input value={s.nome} onChange={(e) => mudarSecao(s.id, { nome: e.target.value })} maxLength={40} placeholder="Nome da categoria" aria-label="Nome da categoria" className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-manrope)] text-[16.5px] font-semibold outline-none placeholder:font-normal placeholder:text-text-tertiary" />
              </label>
              <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0} aria-label="Subir categoria" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-[16px] text-on-background disabled:opacity-25">↑</button>
              <button type="button" onClick={() => mover(idx, 1)} disabled={idx === secoes.length - 1} aria-label="Descer categoria" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-[16px] text-on-background disabled:opacity-25">↓</button>
            </div>

            {recolhida && (
              <button type="button" onClick={() => alternarSecao(s.id)} className="mt-2.5 flex min-h-[44px] w-full items-center justify-between rounded-2xl px-3.5 text-left text-[13.5px] text-text-secondary active:bg-surface-soft">
                <span>{s.itens.length} {s.itens.length === 1 ? "prato" : "pratos"}{s.itens.some((x) => !x.foto) ? ` · ${s.itens.filter((x) => !x.foto).length} sem foto` : ""}</span>
                <span className="font-medium text-on-background">Expandir</span>
              </button>
            )}
            {!recolhida && (<>
            <ul className="mt-3 flex flex-col gap-2">
              {s.itens.map((i) => {
                const aberta = aberto === i.id;
                return (
                  <li key={i.id} className="rounded-2xl border border-divider">
                    <div className="flex items-center gap-3 p-2.5">
                      <button type="button" onClick={() => { if (i.foto) { setAberto(i.id); setAjustando(i.id); } else { alvo.current = { s: s.id, i: i.id }; inputFoto.current?.click(); } }} disabled={subindo === i.id} aria-label={i.foto ? "Ajustar foto do prato" : "Adicionar foto do prato"} className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-soft text-text-tertiary active:scale-[0.96]">
                        {i.foto ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={i.foto} alt="" style={estiloFoto(i.fotoAjuste)} className="h-full w-full object-cover" />
                            <span aria-hidden className="absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-on-background/85 text-white"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg></span>
                          </>
                        ) : subindo === i.id ? (
                          <span className="text-[11px]">Enviando</span>
                        ) : (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                        )}
                      </button>
                      <button type="button" onClick={() => setAberto(aberta ? null : i.id)} aria-expanded={aberta} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-medium">{i.nome || "Prato sem nome"}</span>
                          <span className="block truncate text-[12.5px] text-text-tertiary">{i.preco != null ? i.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Sem preço"}{i.descricao ? " · com descrição" : ""}{i.foto ? "" : " · sem foto"}</span>
                        </span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${aberta ? "rotate-180" : ""}`} aria-hidden><path d="M6 9l6 6 6-6" /></svg></span>
                      </button>
                    </div>

                    {aberta && (
                      <div className="flex flex-col gap-2.5 border-t border-divider p-3">
                        <div className="flex items-center gap-2">
                          <input value={i.nome} onChange={(e) => mudarItem(s.id, i.id, { nome: e.target.value })} maxLength={80} placeholder="Nome do prato" aria-label="Nome do prato" className={`${campo} min-w-0 flex-1`} autoFocus={!i.nome} />
                          <label className="flex w-[118px] shrink-0 items-center gap-1.5 rounded-2xl border border-divider bg-surface-white px-3 py-2.5 text-[14px] text-text-secondary focus-within:border-on-background">
                            R$
                            <input
                              value={i.preco == null ? "" : String(i.preco).replace(".", ",")}
                              onChange={(e) => { const v = e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""); mudarItem(s.id, i.id, { preco: v === "" ? null : Number(v) || 0 }); }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); novoPrato(s.id); } }}
                              inputMode="decimal"
                              enterKeyHint="next"
                              placeholder="0,00"
                              aria-label="Preço"
                              className="min-w-0 flex-1 bg-transparent text-[15px] text-on-background outline-none"
                            />
                          </label>
                        </div>
                        {(comDesc.includes(i.id) || !!i.descricao) && (
                          <textarea value={i.descricao ?? ""} onChange={(e) => mudarItem(s.id, i.id, { descricao: e.target.value })} rows={3} maxLength={600} placeholder="Ingredientes, tamanho, o que acompanha" aria-label="Descrição do prato" className={`${campo} resize-y text-[14px] leading-snug`} />
                        )}
                        {i.foto && ajustando === i.id && <AjustarFoto key={i.foto} foto={i.foto} ajuste={i.fotoAjuste} onChange={(a) => mudarItem(s.id, i.id, { fotoAjuste: a })} onNovaFoto={(b) => trocarFotoPor(s.id, i.id, b)} />}
                        <div className="flex flex-wrap items-center gap-2">
                          {!(comDesc.includes(i.id) || !!i.descricao) && (
                            <button type="button" onClick={() => setComDesc((p) => [...p, i.id])} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary">+ Descrição</button>
                          )}
                          {i.preco != null && (
                            <button type="button" role="checkbox" aria-checked={!!i.aPartir} onClick={() => mudarItem(s.id, i.id, { aPartir: !i.aPartir })} className={`min-h-[40px] rounded-full px-4 text-[13px] font-medium ${i.aPartir ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>A partir de</button>
                          )}
                          {i.foto && <button type="button" aria-expanded={ajustando === i.id} onClick={() => setAjustando(ajustando === i.id ? null : i.id)} className={`min-h-[40px] rounded-full px-4 text-[13px] font-medium ${ajustando === i.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>Ajustar foto</button>}
                          <button type="button" onClick={() => { alvo.current = { s: s.id, i: i.id }; inputFoto.current?.click(); }} disabled={subindo === i.id} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary disabled:opacity-60">{subindo === i.id ? "Enviando…" : i.foto ? "Trocar foto" : "Enviar foto"}</button>
                          <button type="button" onClick={() => setGaleriaPara({ s: s.id, i: i.id })} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary">Da galeria</button>
                          {i.foto && <button type="button" onClick={() => mudarItem(s.id, i.id, { foto: null, fotoAjuste: null })} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary">Tirar foto</button>}
                          {i.nome.trim() && <button type="button" onClick={() => mostrarNoCatalogo(s, i)} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary">Mostrar no catálogo</button>}
                          <button type="button" onClick={() => removerPrato(s.id, i.id)} className="ml-auto min-h-[40px] rounded-full px-3 text-[13px] font-medium text-text-tertiary">Apagar</button>
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
            </>)}
          </section>
          );
        })}
      </div>

      {trazendo && (
        <TrazerItens
          titulo="Trazer do catálogo"
          ajuda="Escolha o que vira prato. É uma cópia: mudar depois num lado não muda o outro. Vai só a foto de capa."
          itens={trazendo.itens.map((i) => ({ key: i.id, nome: i.titulo, foto: i.foto, preco: i.preco, categoria: i.categoria }))}
          carregando={trazendo.carregando}
          rotuloBotao={(n) => (n === 0 ? "Escolha os itens" : n === 1 ? "Trazer 1 item" : `Trazer ${n} itens`)}
          onConfirmar={trazer}
          onFechar={() => setTrazendo(null)}
        />
      )}

      {galeriaPara && (
        <MinhaGaleriaPicker
          businessId={businessId}
          atual={secoes.find((x) => x.id === galeriaPara.s)?.itens.find((x) => x.id === galeriaPara.i)?.foto ?? null}
          onFechar={() => setGaleriaPara(null)}
          onEscolher={(url) => {
            mudarItem(galeriaPara.s, galeriaPara.i, { foto: url, fotoAjuste: null });
            setGaleriaPara(null);
          }}
        />
      )}

      {apagado && (
        <div role="status" className="fixed inset-x-0 bottom-28 z-40 mx-auto flex w-[calc(100%-48px)] max-w-[392px] items-center justify-between gap-3 rounded-full bg-on-background py-2 pl-5 pr-2 text-[13.5px] text-white shadow-[0_10px_30px_rgba(17,19,24,0.3)]">
          Prato apagado
          <button type="button" onClick={desfazer} className="min-h-[40px] rounded-full bg-white/15 px-4 font-semibold">Desfazer</button>
        </div>
      )}

    </div>
  );
}
