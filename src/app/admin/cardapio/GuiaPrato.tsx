"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { novoId, type CardapioItem } from "@/lib/cardapio";

const SUGESTOES = ["Entradas", "Pratos principais", "Bebidas", "Sobremesas"];
const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background";

function Cabecalho({ n, titulo, onFechar }: { n: number; titulo: string; onFechar: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-text-tertiary">Passo {n} de 2</p>
        <p className="mt-1 font-[family-name:var(--font-manrope)] text-[19px] font-medium leading-tight">{titulo}</p>
      </div>
      <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
    </div>
  );
}

/**
 * Passo a passo para cadastrar um por um: 1) escolher ou criar a categoria,
 * 2) preencher o prato (só o nome é obrigatório). Ao terminar, oferece
 * adicionar outro prato na mesma categoria, mudar de categoria ou concluir.
 * Evita criar categorias vazias soltas.
 */
export function GuiaPrato({ businessId, categorias, onSalvar, onFechar }: { businessId: string; categorias: string[]; onSalvar: (categoria: string, item: CardapioItem) => void; onFechar: () => void }) {
  const supabase = useRef(createClient()).current;
  const inputFoto = useRef<HTMLInputElement>(null);
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [categoria, setCategoria] = useState("");
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [descricao, setDescricao] = useState("");
  const [comDescricao, setComDescricao] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState("");

  const existentes = categorias.filter((c) => c.trim());
  const sugeridas = SUGESTOES.filter((s) => !existentes.some((e) => e.toLowerCase() === s.toLowerCase()));

  function limparPrato() {
    setNome(""); setPreco(""); setDescricao(""); setComDescricao(false); setFoto(null); setErro(null);
  }

  async function enviarFoto(f: File | undefined) {
    if (inputFoto.current) inputFoto.current.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErro("Envie uma foto (JPG ou PNG).");
    setErro(null);
    setSubindo(true);
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `${businessId}/cardapio-prato-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("box-images").upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
    setSubindo(false);
    if (error) return setErro("Não consegui enviar a foto. Tente de novo.");
    setFoto(supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl);
  }

  function adicionar() {
    if (!nome.trim() || !categoria.trim()) return;
    const n = preco.trim() === "" ? null : Number(preco.replace(",", "."));
    onSalvar(categoria.trim(), { id: novoId(), nome: nome.trim(), descricao: descricao.trim(), preco: n != null && !Number.isNaN(n) ? n : null, aPartir: false, foto });
    setUltimo(nome.trim());
    limparPrato();
    setPasso(3);
  }

  return (
    <div className="mt-4 rounded-[24px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
      <input ref={inputFoto} type="file" accept="image/*" className="hidden" onChange={(e) => enviarFoto(e.target.files?.[0])} />

      {passo === 1 && (
        <>
          <Cabecalho n={1} titulo="Em qual categoria vai o prato?" onFechar={onFechar} />
          <p className="mt-1.5 text-[13px] leading-snug text-text-secondary">Categoria é o grupo no cardápio, como Entradas ou Bebidas. O cliente navega por elas.</p>
          {existentes.length > 0 && (
            <>
              <p className="mt-4 text-[12px] uppercase tracking-wide text-text-tertiary">Suas categorias</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {existentes.map((c) => (
                  <button key={c} type="button" onClick={() => { setCategoria(c); setPasso(2); }} className="min-h-[44px] rounded-full bg-surface-soft px-4 text-[14px] font-medium">{c}</button>
                ))}
              </div>
            </>
          )}
          <p className="mt-4 text-[12px] uppercase tracking-wide text-text-tertiary">{existentes.length > 0 ? "Ou crie uma nova" : "Escolha uma ou escreva a sua"}</p>
          {sugeridas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {sugeridas.map((c) => (
                <button key={c} type="button" onClick={() => { setCategoria(c); setPasso(2); }} className="min-h-[44px] rounded-full border border-divider px-4 text-[14px]">{c}</button>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <input value={categoria} onChange={(e) => setCategoria(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && categoria.trim()) setPasso(2); }} maxLength={40} placeholder="Ex: Rodízio, Lanches, Porções" aria-label="Nome da categoria" className={`${campo} min-w-0 flex-1`} />
            <button type="button" onClick={() => setPasso(2)} disabled={!categoria.trim()} className="min-h-[48px] shrink-0 rounded-full bg-on-background px-5 text-[14px] font-semibold text-white disabled:opacity-40">Continuar</button>
          </div>
        </>
      )}

      {passo === 2 && (
        <>
          <Cabecalho n={2} titulo={`Agora o prato de ${categoria}`} onFechar={onFechar} />
          <p className="mt-1.5 text-[13px] leading-snug text-text-secondary">Só o nome é obrigatório. Preço, descrição e foto você coloca se quiser.</p>
          <div className="mt-3 flex flex-col gap-2.5">
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Nome do prato" aria-label="Nome do prato" autoFocus className={campo} />
            <label className="flex items-center gap-2 rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] text-text-secondary focus-within:border-on-background">
              R$
              <input value={preco} onChange={(e) => setPreco(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" placeholder="Preço (opcional)" aria-label="Preço" className="min-w-0 flex-1 bg-transparent text-[15px] text-on-background outline-none" />
            </label>
            {comDescricao && <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={600} placeholder="Ingredientes, tamanho, o que acompanha" aria-label="Descrição do prato" className={`${campo} resize-y text-[14px] leading-snug`} />}
            <div className="flex flex-wrap items-center gap-2">
              {!comDescricao && <button type="button" onClick={() => setComDescricao(true)} className="min-h-[44px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary">+ Descrição</button>}
              <button type="button" onClick={() => inputFoto.current?.click()} disabled={subindo} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary disabled:opacity-50">
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto} alt="" className="h-6 w-6 rounded-md object-cover" />
                ) : null}
                {subindo ? "Enviando…" : foto ? "Trocar foto" : "+ Foto"}
              </button>
            </div>
          </div>
          {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setPasso(1)} className="min-h-[48px] flex-1 rounded-full bg-surface-soft text-[14px] font-medium">Voltar</button>
            <button type="button" onClick={adicionar} disabled={!nome.trim() || subindo} className="min-h-[48px] flex-[2] rounded-full bg-on-background text-[14.5px] font-semibold text-white disabled:opacity-40">Adicionar prato</button>
          </div>
        </>
      )}

      {passo === 3 && (
        <div role="status">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F9E4C]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
            <div>
              <p className="text-[15.5px] font-semibold leading-snug">{ultimo} entrou em {categoria}</p>
              <p className="mt-0.5 text-[13px] text-text-secondary">Já aparece na lista logo abaixo. E agora?</p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" onClick={() => setPasso(2)} className="min-h-[48px] rounded-full bg-on-background text-[14.5px] font-semibold text-white">+ Outro prato em {categoria}</button>
            <button type="button" onClick={() => { setCategoria(""); setPasso(1); }} className="min-h-[48px] rounded-full border border-divider text-[14px] font-medium">Outra categoria</button>
            <button type="button" onClick={onFechar} className="min-h-[44px] rounded-full text-[14px] font-medium text-text-secondary">Concluir</button>
          </div>
        </div>
      )}
    </div>
  );
}
