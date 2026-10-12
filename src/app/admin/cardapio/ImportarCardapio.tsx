"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";

type ItemProposto = { titulo: string; descricao: string; preco: number | null; preco_tipo: "exato" | "a_partir"; marcado: boolean };
type Secao = { nome: string; itens: ItemProposto[] };

/**
 * Importar cardápio: a pessoa cola o texto ou envia foto(s) do cardápio e a
 * Orbi monta os itens por categoria. Antes de entrar no catálogo tudo passa por
 * uma revisão (marcar, trocar nome e preço), porque a leitura de foto pode errar.
 */
export function ImportarCardapio({ businessId, slug }: { businessId: string; slug: string }) {
  const supabase = useRef(createClient()).current;
  const inputFoto = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<{ nome: string; url: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
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

  async function adicionar() {
    if (!secoes || total === 0 || salvando) return;
    setSalvando(true);
    setErro(null);
    // Os novos itens entram no topo, depois do que já existe, na ordem do cardápio.
    const { data: primeiro } = await supabase.from("content_items").select("position").eq("business_id", businessId).order("position", { ascending: true }).limit(1).maybeSingle();
    let pos = (primeiro?.position ?? 0) - total - 1;
    const linhas = secoes.flatMap((s) =>
      s.itens
        .filter((i) => i.marcado && i.titulo.trim())
        .map((i) => ({
          business_id: businessId,
          type: "product",
          title: i.titulo.trim(),
          description: i.descricao.trim() || null,
          price: i.preco,
          price_type: i.preco == null ? "sem" : i.preco_tipo,
          status: "published",
          brand_label: s.nome,
          position: pos++,
        })),
    );
    const res = await supabase.from("content_items").insert(linhas);
    if (!conferirSalvo(res)) {
      setSalvando(false);
      return;
    }
    // Registra as categorias novas, pra aparecerem na ordem do cardápio.
    const { data: neg } = await supabase.from("businesses").select("vitrine_categories").eq("id", businessId).maybeSingle();
    const atuais = (neg?.vitrine_categories as string[] | null) ?? [];
    const novas = secoes.filter((s) => s.itens.some((i) => i.marcado && i.titulo.trim())).map((s) => s.nome).filter((n) => !atuais.includes(n));
    if (novas.length > 0) await supabase.from("businesses").update({ vitrine_categories: [...atuais, ...novas] }).eq("id", businessId);
    setSalvando(false);
    setFeito(linhas.length);
    setSecoes(null);
    setTexto("");
    setFotos([]);
  }

  const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background";

  if (!aberto && feito === null) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="mt-5 flex w-full items-center gap-3 rounded-[22px] bg-surface-white p-4 text-left ring-1 ring-black/[0.06] active:scale-[0.99]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-soft text-[20px]" aria-hidden>✨</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Importar cardápio com a Orbi</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-text-secondary">Cole o texto ou envie uma foto do cardápio e a Orbi monta os itens por categoria.</span>
        </span>
        <span aria-hidden className="text-text-tertiary">→</span>
      </button>
    );
  }

  if (feito !== null) {
    return (
      <div className="mt-5 rounded-[22px] bg-[#DEF3E3] p-4">
        <p className="text-[15px] font-semibold text-[#14733A]">{feito} {feito === 1 ? "item adicionado" : "itens adicionados"} ao cardápio</p>
        <p className="mt-1 text-[13px] leading-snug text-[#14733A]/85">Já estão publicados. Falta colocar as fotos de cada um, se quiser.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/vitrine" className="inline-flex min-h-[44px] items-center rounded-full bg-on-background px-5 text-[13.5px] font-semibold text-white">Editar itens</Link>
          {slug && <Link href={`/${slug}`} target="_blank" className="inline-flex min-h-[44px] items-center rounded-full bg-white px-5 text-[13.5px] font-medium">Ver minha página ↗</Link>}
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
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">Cole o cardápio do jeito que estiver (pode ser bagunçado) ou envie foto. A Orbi separa por categoria, com nome, descrição e preço, e você revisa antes de entrar.</p>
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
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">A Orbi encontrou {secoes.reduce((n, s) => n + s.itens.length, 0)} itens. Confira, ajuste nome e preço e desmarque o que não quiser.</p>
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
            <button type="button" onClick={adicionar} disabled={total === 0 || salvando} className="min-h-[48px] flex-[2] rounded-full bg-on-background text-[14.5px] font-semibold text-white disabled:opacity-40">
              {salvando ? "Adicionando…" : `Adicionar ${total} ${total === 1 ? "item" : "itens"}`}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-text-tertiary">Itens sem preço ficam sem preço no cardápio.</p>
        </>
      )}
    </div>
  );
}
