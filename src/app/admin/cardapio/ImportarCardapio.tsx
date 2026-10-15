"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { novoId, type CardapioSecao } from "@/lib/cardapio";

type ItemProposto = { titulo: string; descricao: string; preco: number | null; preco_tipo: "exato" | "a_partir"; marcado: boolean };
type Secao = { nome: string; itens: ItemProposto[] };

/**
 * Importar cardápio: a pessoa cola o texto ou envia foto(s) do cardápio e a
 * Orbi monta os pratos por categoria. Antes de entrar no cardápio tudo passa por
 * uma revisão (marcar, trocar nome e preço), porque a leitura de foto pode errar.
 */
export function ImportarCardapio({ businessId, onAdicionar, onManual, compacto = false }: { businessId: string; onAdicionar: (novas: CardapioSecao[]) => void; onManual: () => void; /** Já há pratos: mostra só atalhos pequenos. */ compacto?: boolean }) {
  const supabase = useRef(createClient()).current;
  const inputFoto = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<{ nome: string; url: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [secoes, setSecoes] = useState<Secao[] | null>(null);
  const [feito, setFeito] = useState<number | null>(null);

  async function enviarFotos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    setErro(null);
    setEnviando(true);
    const novas: { nome: string; url: string }[] = [];
    for (const f of Array.from(lista).slice(0, 4 - fotos.length)) {
      if (!f.type.startsWith("image/")) {
        setErro("Envie fotos (JPG ou PNG). Para PDF, cole o texto.");
        continue;
      }
      const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const path = `${businessId}/cardapio-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage.from("box-images").upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
      if (error) {
        setErro("Não consegui enviar a foto. Tente de novo.");
        continue;
      }
      novas.push({ nome: f.name, url: supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl });
    }
    setFotos((p) => [...p, ...novas]);
    setEnviando(false);
    if (inputFoto.current) inputFoto.current.value = "";
  }

  async function ler() {
    setErro(null);
    setLendo(true);
    try {
      const res = await fetch("/api/importar-cardapio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, texto, imagens: fotos.map((f) => f.url) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.error ?? "A Orbi não conseguiu ler o cardápio agora.");
        return;
      }
      setSecoes((json.categorias as { nome: string; itens: Omit<ItemProposto, "marcado">[] }[]).map((c) => ({ nome: c.nome, itens: c.itens.map((i) => ({ ...i, marcado: true })) })));
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setLendo(false);
    }
  }

  const total = (secoes ?? []).reduce((n, s) => n + s.itens.filter((i) => i.marcado && i.titulo.trim()).length, 0);

  function mudar(si: number, ii: number, patch: Partial<ItemProposto>) {
    setSecoes((p) => (p ?? []).map((s, a) => (a !== si ? s : { ...s, itens: s.itens.map((i, b) => (b === ii ? { ...i, ...patch } : i)) })));
  }

  function adicionar() {
    if (!secoes || total === 0) return;
    const novas: CardapioSecao[] = secoes
      .map((sec) => ({
        id: novoId(),
        nome: sec.nome.trim(),
        itens: sec.itens.filter((i) => i.marcado && i.titulo.trim()).map((i) => ({ id: novoId(), nome: i.titulo.trim(), descricao: i.descricao.trim(), preco: i.preco, aPartir: i.preco != null && i.preco_tipo === "a_partir", foto: null })),
      }))
      .filter((sec) => sec.itens.length > 0);
    onAdicionar(novas);
    setFeito(novas.reduce((n, sec) => n + sec.itens.length, 0));
    setSecoes(null);
    setTexto("");
    setFotos([]);
  }

  const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background";

  if (!aberto && feito === null) {
    if (compacto) {
      return (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setAberto(true)} className="min-h-[44px] rounded-full bg-on-background px-5 text-[13.5px] font-semibold text-white active:scale-[0.98]">Colar mais pratos</button>
          <button type="button" onClick={onManual} className="min-h-[44px] rounded-full border border-divider bg-surface-white px-5 text-[13.5px] font-medium active:scale-[0.98]">+ Categoria ou prato</button>
        </div>
      );
    }
    return (
      <div className="mt-3 flex flex-col gap-4">
        <div>
          <button type="button" onClick={() => setAberto(true)} className="flex min-h-[56px] w-full items-center gap-3 rounded-full bg-on-background pl-3 pr-5 text-left text-[15px] font-semibold text-white active:scale-[0.99]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-[15px]" aria-hidden>✦</span>
            Colar o texto e a Orbi monta
          </button>
          <p className="mt-1.5 px-4 text-[12.5px] leading-snug text-text-tertiary">Mais rápido. Cole o cardápio do jeito que estiver, ou envie foto, e a Orbi separa por categoria. Você revisa antes de entrar.</p>
        </div>
        <div>
          <button type="button" onClick={onManual} className="flex min-h-[56px] w-full items-center gap-3 rounded-full border border-divider bg-surface-white pl-3 pr-5 text-left text-[15px] font-semibold active:scale-[0.99]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[16px]" aria-hidden>+</span>
            Adicionar um por um
          </button>
          <p className="mt-1.5 px-4 text-[12.5px] leading-snug text-text-tertiary">Crie a categoria e depois cada prato, com nome e preço. Foto e descrição são opcionais.</p>
        </div>
      </div>
    );
  }

  if (feito !== null) {
    return (
      <div className="mt-5 rounded-[22px] bg-[#DEF3E3] p-4">
        <p className="text-[15px] font-semibold text-[#14733A]">{feito} {feito === 1 ? "prato adicionado" : "pratos adicionados"} ao cardápio</p>
        <p className="mt-1 text-[13px] leading-snug text-[#14733A]/85">Já estão na lista logo abaixo. Se quiser, coloque foto em cada um.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setFeito(null); setAberto(true); }} className="min-h-[44px] rounded-full bg-white px-5 text-[13.5px] font-medium">Importar mais</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-[24px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
      <div className="flex items-center justify-between">
        <p className="text-[16px] font-semibold">Importar cardápio</p>
        <button type="button" onClick={() => { setAberto(false); setSecoes(null); setErro(null); }} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
      </div>

      {secoes === null ? (
        <>
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">Cole o cardápio do jeito que estiver (pode ser bagunçado) ou envie foto. A Orbi separa por categoria, com nome, descrição e preço, e você revisa antes de entrar. Nada disso mexe no seu Catálogo.</p>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={7} placeholder={"Ex:\nLANCHES\nX-Burger  pão, carne, queijo  R$ 22,00\nX-Salada  R$ 25,00\n\nBEBIDAS\nCoca-Cola lata  R$ 6"} className={`${campo} mt-3 resize-y text-[14px] leading-relaxed`} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input ref={inputFoto} type="file" accept="image/*" multiple className="hidden" onChange={(e) => enviarFotos(e.target.files)} />
            <button type="button" onClick={() => inputFoto.current?.click()} disabled={enviando || fotos.length >= 4} className="min-h-[44px] rounded-full border border-divider px-5 text-[13.5px] font-medium disabled:opacity-50">
              {enviando ? "Enviando…" : fotos.length > 0 ? "Adicionar outra foto" : "Enviar foto do cardápio"}
            </button>
            {fotos.map((f, n) => (
              <span key={f.url} className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft py-1.5 pl-3 pr-1.5 text-[12.5px] text-text-secondary">
                Foto {n + 1}
                <button type="button" onClick={() => setFotos((p) => p.filter((x) => x.url !== f.url))} aria-label="Remover foto" className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px]">✕</button>
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-text-tertiary">Até 4 fotos. Quanto mais nítida, melhor a leitura.</p>

          {erro && <p role="alert" className="mt-3 text-[13px] text-red-600">{erro}</p>}
          <button type="button" onClick={ler} disabled={lendo || enviando || (!texto.trim() && fotos.length === 0)} className="mt-4 min-h-[48px] w-full rounded-full bg-on-background text-[14.5px] font-semibold text-white disabled:opacity-40">
            {lendo ? "A Orbi está lendo o cardápio…" : "Orbi, monta meu cardápio"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">A Orbi encontrou {secoes.reduce((n, s) => n + s.itens.length, 0)} pratos. Confira, ajuste nome e preço e desmarque o que não quiser.</p>
          <div className="mt-3 flex flex-col gap-4">
            {secoes.map((s, si) => (
              <div key={si}>
                <input value={s.nome} onChange={(e) => setSecoes((p) => (p ?? []).map((x, a) => (a === si ? { ...x, nome: e.target.value } : x)))} maxLength={40} aria-label="Nome da categoria" className="w-full bg-transparent font-[family-name:var(--font-manrope)] text-[16px] font-semibold outline-none" />
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {s.itens.map((i, ii) => (
                    <div key={ii} className={`flex items-start gap-2.5 rounded-2xl border p-2.5 ${i.marcado ? "border-divider" : "border-transparent bg-surface-soft opacity-60"}`}>
                      <button type="button" role="checkbox" aria-checked={i.marcado} onClick={() => mudar(si, ii, { marcado: !i.marcado })} className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${i.marcado ? "bg-on-background text-white" : "border border-divider text-transparent"}`}>✓</button>
                      <div className="min-w-0 flex-1">
                        <input value={i.titulo} onChange={(e) => mudar(si, ii, { titulo: e.target.value })} aria-label="Nome do item" className="w-full bg-transparent text-[14.5px] font-medium outline-none" />
                        {i.descricao && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-text-tertiary">{i.descricao}</p>}
                      </div>
                      <label className="flex shrink-0 items-center gap-1 text-[13px] text-text-secondary">
                        {i.preco_tipo === "a_partir" && i.preco != null && <span className="text-[11px] text-text-tertiary">a partir de</span>}
                        <span>R$</span>
                        <input
                          value={i.preco == null ? "" : String(i.preco).replace(".", ",")}
                          onChange={(e) => { const v = e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""); mudar(si, ii, { preco: v === "" ? null : Number(v) || 0 }); }}
                          inputMode="decimal"
                          placeholder="--"
                          aria-label={`Preço de ${i.titulo}`}
                          className="w-[58px] rounded-lg border border-divider bg-surface-white px-2 py-1 text-right text-[13.5px] outline-none focus:border-on-background"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {erro && <p role="alert" className="mt-3 text-[13px] text-red-600">{erro}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setSecoes(null)} className="min-h-[48px] flex-1 rounded-full bg-surface-soft text-[14px] font-medium">Voltar</button>
            <button type="button" onClick={adicionar} disabled={total === 0} className="min-h-[48px] flex-[2] rounded-full bg-on-background text-[14.5px] font-semibold text-white disabled:opacity-40">
              {`Adicionar ${total} ${total === 1 ? "prato" : "pratos"}`}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-text-tertiary">Pratos sem preço ficam sem preço no cardápio.</p>
        </>
      )}
    </div>
  );
}
