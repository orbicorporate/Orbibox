"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { MinhaGaleriaPicker } from "@/components/ui/MinhaGaleriaPicker";
import { FotoProntaPicker } from "@/components/ui/FotoProntaPicker";
import { MAX_LISTA, listaVazia, novoIdLista, precoDoItem, reduzirFoto, type Lista, type ListaDestino, type ListaItem } from "@/lib/lista";

const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background";

const DESTINOS: { id: ListaDestino; rotulo: string; ajuda: string }[] = [
  { id: "whatsapp", rotulo: "WhatsApp", ajuda: "O cliente toca em um item, vê os detalhes e chama no WhatsApp do negócio." },
  { id: "link", rotulo: "Link do item", ajuda: "Cada item leva ao link que você colar nele, como a página do produto no seu site." },
  { id: "nenhum", rotulo: "Sem botão", ajuda: "Os itens só mostram foto, preço e detalhes." },
];

function IconeCamera() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
  );
}

/** Folha para criar ou editar um item: foto, nome, preço, descrição e, se o destino for link, o link. */
function FolhaItem({ businessId, inicial, novo, destino, onSalvar, onApagar, onFechar }: { businessId: string; inicial: ListaItem; novo: boolean; destino: ListaDestino; onSalvar: (i: ListaItem) => void; onApagar: () => void; onFechar: () => void }) {
  const supabase = useRef(createClient()).current;
  const input = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState(inicial.nome);
  const [preco, setPreco] = useState(inicial.preco == null ? "" : String(inicial.preco).replace(".", ","));
  const [descricao, setDescricao] = useState(inicial.descricao ?? "");
  const [link, setLink] = useState(inicial.link ?? "");
  const [esgotado, setEsgotado] = useState(!!inicial.esgotado);
  const [foto, setFoto] = useState<string | null>(inicial.foto ?? null);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [galeria, setGaleria] = useState(false);
  const [prontas, setProntas] = useState(false);

  async function enviar(f: File | undefined) {
    if (input.current) input.current.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErro("Envie uma foto (JPG ou PNG).");
    setErro(null);
    setSubindo(true);
    const blob = await reduzirFoto(f);
    const path = `${businessId}/lista-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error } = await supabase.storage.from("box-images").upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: blob.type || "image/jpeg" });
    setSubindo(false);
    if (error) return setErro("Não consegui enviar a foto. Tente de novo.");
    setFoto(supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl);
  }

  function salvar() {
    if (!nome.trim()) return;
    const n = preco.trim() === "" ? null : Number(preco.replace(",", "."));
    onSalvar({ id: inicial.id, nome: nome.trim(), preco: n != null && !Number.isNaN(n) ? n : null, descricao: descricao.trim(), foto, link: link.trim(), esgotado });
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={novo ? "Novo item" : "Editar item"}>
      <button type="button" aria-label="Fechar" onClick={onFechar} className="veu-entra absolute inset-0 bg-black/40" />
      <div className="folha-sobe absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-background-main p-5 pb-8">
        <div className="flex items-center justify-between">
          <p className="font-[family-name:var(--font-manrope)] text-[19px] font-medium">{novo ? "Novo item" : "Editar item"}</p>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
        </div>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => enviar(e.target.files?.[0])} />

        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => input.current?.click()} disabled={subindo} aria-label={foto ? "Trocar foto" : "Adicionar foto"} className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-surface-soft text-text-tertiary active:scale-[0.98]">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" className="h-full w-full object-cover" />
            ) : (
              <IconeCamera />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium">{subindo ? "Enviando…" : foto ? "Foto do item" : "Foto (opcional)"}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setGaleria(true)} disabled={subindo} className="min-h-[36px] rounded-full bg-on-background px-3.5 text-[13px] font-medium text-white">Banco de imagens</button>
              <button type="button" onClick={() => setProntas(true)} disabled={subindo} className="min-h-[36px] rounded-full bg-surface-soft px-3.5 text-[13px] font-medium text-text-secondary">Fotos prontas</button>
              <button type="button" onClick={() => input.current?.click()} disabled={subindo} className="min-h-[36px] rounded-full bg-surface-soft px-3.5 text-[13px] font-medium text-text-secondary">Enviar</button>
              {foto && <button type="button" onClick={() => setFoto(null)} className="min-h-[36px] rounded-full px-3 text-[13px] font-medium text-text-secondary">Tirar</button>}
            </div>
          </div>
        </div>
        {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}

        <div className="mt-3 flex flex-col gap-2.5">
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Nome do item" aria-label="Nome do item" autoFocus={novo} className={campo} />
          <label className="flex items-center gap-2 rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] text-text-secondary focus-within:border-on-background">
            R$
            <input value={preco} onChange={(e) => setPreco(e.target.value.replace(/[^0-9.,]/g, ""))} inputMode="decimal" placeholder="Preço (opcional)" aria-label="Preço" className="min-w-0 flex-1 bg-transparent text-[15px] text-on-background outline-none" />
          </label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value.replace(/\n/g, " "))} rows={2} maxLength={120} placeholder="Descrição curta (até 2 linhas)" aria-label="Descrição" className={`${campo} resize-none text-[14px] leading-snug`} />
          {destino === "link" && (
            <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="Link do item (ex: loja.com/blusa)" aria-label="Link do item" className={campo} />
          )}
          <button type="button" role="switch" aria-checked={esgotado} onClick={() => setEsgotado((v) => !v)} className="flex min-h-[48px] items-center justify-between rounded-2xl bg-surface-white px-4 text-[14.5px] ring-1 ring-black/[0.06]">
            Esgotado
            <span className={`relative h-7 w-12 rounded-full transition-colors ${esgotado ? "bg-on-background" : "bg-divider"}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${esgotado ? "left-6" : "left-1"}`} />
            </span>
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          {!novo && <button type="button" onClick={onApagar} className="min-h-[48px] rounded-full px-4 text-[14px] font-medium text-red-600">Apagar</button>}
          <button type="button" onClick={salvar} disabled={!nome.trim() || subindo} className="min-h-[48px] flex-1 rounded-full bg-on-background text-[14.5px] font-semibold text-white disabled:opacity-40">{novo ? "Adicionar item" : "Salvar"}</button>
        </div>
      </div>
      {galeria && <MinhaGaleriaPicker businessId={businessId} atual={foto} onFechar={() => setGaleria(false)} onEscolher={(url) => { setGaleria(false); setFoto(url); }} />}
      {prontas && <FotoProntaPicker businessId={businessId} assunto={nome} formato="retrato" onFechar={() => setProntas(false)} onEscolher={(f) => { setProntas(false); enviar(f); }} />}
    </div>,
    document.body,
  );
}

type Proposto = { id: string; nome: string; preco: number | null; descricao: string };

function ListaAtiva({ businessId, lista, temWhatsapp, onChange }: { businessId: string; lista: Lista; temWhatsapp: boolean; onChange: (l: Lista | null) => void }) {
  const [titulo, setTitulo] = useState(lista.titulo);
  const [edicao, setEdicao] = useState<{ item: ListaItem; novo: boolean } | null>(null);
  const [colar, setColar] = useState(false);
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [propostos, setPropostos] = useState<Proposto[] | null>(null);

  const cheia = lista.itens.length >= MAX_LISTA;
  const destino = DESTINOS.find((d) => d.id === lista.destino) ?? DESTINOS[0];

  function novoItem() {
    if (cheia) return;
    setEdicao({ item: { id: novoIdLista(), nome: "", preco: null, descricao: "", foto: null, link: "", esgotado: false }, novo: true });
  }

  function salvarItem(i: ListaItem) {
    const existe = lista.itens.some((x) => x.id === i.id);
    onChange({ ...lista, itens: existe ? lista.itens.map((x) => (x.id === i.id ? i : x)) : [...lista.itens, i] });
    setEdicao(null);
  }

  function apagarItem(id: string) {
    onChange({ ...lista, itens: lista.itens.filter((x) => x.id !== id) });
    setEdicao(null);
  }

  function removerLista() {
    if (lista.itens.length > 0 && !window.confirm(`Remover a lista e os ${lista.itens.length} itens dela?`)) return;
    onChange(null);
  }

  async function ler() {
    setErro(null);
    setLendo(true);
    try {
      const res = await fetch("/api/importar-cardapio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, texto, modo: "lista" }) });
      const json = await res.json();
      if (!res.ok) return setErro(json.error ?? "A Orbi não conseguiu ler a lista agora.");
      const todos = (json.categorias as { itens: { titulo: string; descricao: string; preco: number | null }[] }[]).flatMap((c) => c.itens);
      setPropostos(todos.slice(0, MAX_LISTA - lista.itens.length).map((i) => ({ id: novoIdLista(), nome: i.titulo, preco: i.preco, descricao: i.descricao })));
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setLendo(false);
    }
  }

  function adicionarPropostos() {
    const novos = (propostos ?? []).filter((p) => p.nome.trim()).map((p) => ({ id: p.id, nome: p.nome.trim(), preco: p.preco, descricao: p.descricao, foto: null, link: "", esgotado: false }));
    if (novos.length > 0) onChange({ ...lista, itens: [...lista.itens, ...novos] });
    setPropostos(null);
    setTexto("");
    setColar(false);
  }

  return (
    <div className="mt-8 rounded-[26px] border border-divider bg-surface-white p-4 shadow-[0_6px_18px_rgba(17,19,24,0.06)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[16px] font-semibold">Lista de itens</p>
        <button type="button" onClick={removerLista} className="min-h-[36px] rounded-full px-2 text-[12.5px] font-medium text-text-tertiary">Remover lista</button>
      </div>

      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={() => titulo !== lista.titulo && onChange({ ...lista, titulo: titulo.trim() })} maxLength={50} placeholder="Título da lista (ex: Blusas)" aria-label="Título da lista" className={`${campo} mt-2`} />

      <p className="mt-4 text-[12px] uppercase tracking-wide text-text-tertiary">Botão ao tocar num item</p>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Destino do botão">
        {DESTINOS.map((d) => (
          <button key={d.id} type="button" role="radio" aria-checked={lista.destino === d.id} onClick={() => lista.destino !== d.id && onChange({ ...lista, destino: d.id })} className={`min-h-[44px] rounded-full px-4 text-[13.5px] font-medium ${lista.destino === d.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{d.rotulo}</button>
        ))}
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-text-tertiary">{destino.ajuda}</p>
      {lista.destino === "whatsapp" && !temWhatsapp && <p className="mt-1 text-[12.5px] leading-snug text-[#9A4F06]">Cadastre o WhatsApp do negócio para esse botão aparecer.</p>}

      <ul className="mt-4 grid grid-cols-3 gap-2.5">
        {lista.itens.map((i) => (
          <li key={i.id}>
            <button type="button" onClick={() => setEdicao({ item: i, novo: false })} className="block w-full text-left active:scale-[0.97]" aria-label={`Editar ${i.nome || "item sem nome"}`}>
              <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-soft text-text-tertiary">
                {i.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.foto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <IconeCamera />
                )}
                {i.esgotado && <span className="absolute left-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] text-text-secondary">Esgotado</span>}
              </span>
              <span className="mt-1 block truncate text-[12.5px] font-medium">{i.nome || "Sem nome"}</span>
              <span className="block truncate text-[11.5px] text-text-tertiary">{precoDoItem(i.preco) ?? "Sem preço"}</span>
            </button>
          </li>
        ))}
        {!cheia && (
          <li>
            <button type="button" onClick={novoItem} className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-on-background/25 text-[12.5px] text-text-secondary active:scale-[0.97]">
              <span className="text-[22px] leading-none" aria-hidden>+</span>
              Item
            </button>
          </li>
        )}
      </ul>
      {cheia && <p className="mt-2 text-[12.5px] text-text-tertiary">Limite de {MAX_LISTA} itens por lista. Para mais, crie outra página própria.</p>}

      {!colar && (
        <button type="button" onClick={() => setColar(true)} disabled={cheia} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-surface-white px-4 text-[13.5px] font-medium ring-1 ring-black/[0.08] disabled:opacity-40">
          <span aria-hidden>✨</span> Colar lista e a Orbi monta
        </button>
      )}

      {colar && propostos === null && (
        <div className="mt-4 rounded-[20px] bg-surface-white p-3.5 ring-1 ring-black/[0.06]">
          <p className="text-[13.5px] font-medium">Cole os itens do jeito que estiverem</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">Nome, preço e detalhes. A Orbi separa e você confere antes de entrar. As fotos você coloca depois, item por item.</p>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} placeholder={"Ex:\nBlusa canelada preta, P ao G, R$ 59,90\nBlusa linho off white R$ 89"} className={`${campo} mt-2.5 resize-y text-[14px] leading-relaxed`} />
          {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => { setColar(false); setErro(null); }} className="min-h-[46px] flex-1 rounded-full bg-surface-soft text-[14px] font-medium">Cancelar</button>
            <button type="button" onClick={ler} disabled={lendo || !texto.trim()} className="min-h-[46px] flex-[2] rounded-full bg-on-background text-[14px] font-semibold text-white disabled:opacity-40">{lendo ? "A Orbi está lendo…" : "Orbi, monta a lista"}</button>
          </div>
        </div>
      )}

      {colar && propostos !== null && (
        <div className="mt-4 rounded-[20px] bg-surface-white p-3.5 ring-1 ring-black/[0.06]">
          <p className="text-[13.5px] font-medium">A Orbi encontrou {propostos.length} {propostos.length === 1 ? "item" : "itens"}</p>
          <p className="mt-0.5 text-[12.5px] text-text-tertiary">Ajuste o nome e o preço ou tire o que não quiser.</p>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {propostos.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl border border-divider p-2">
                <input value={p.nome} onChange={(e) => setPropostos((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, nome: e.target.value } : x)))} aria-label="Nome do item" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
                <input value={p.preco == null ? "" : String(p.preco).replace(".", ",")} onChange={(e) => { const v = e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""); setPropostos((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, preco: v === "" ? null : Number(v) || 0 } : x))); }} inputMode="decimal" placeholder="Preço" aria-label={`Preço de ${p.nome}`} className="w-[64px] rounded-lg border border-divider px-2 py-1 text-right text-[13.5px] outline-none focus:border-on-background" />
                <button type="button" onClick={() => setPropostos((l) => (l ?? []).filter((x) => x.id !== p.id))} aria-label="Tirar item" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[12px]">✕</button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setPropostos(null)} className="min-h-[46px] flex-1 rounded-full bg-surface-soft text-[14px] font-medium">Voltar</button>
            <button type="button" onClick={adicionarPropostos} disabled={propostos.length === 0} className="min-h-[46px] flex-[2] rounded-full bg-on-background text-[14px] font-semibold text-white disabled:opacity-40">Adicionar {propostos.length} {propostos.length === 1 ? "item" : "itens"}</button>
          </div>
        </div>
      )}

      {edicao && (
        <FolhaItem
          key={edicao.item.id}
          businessId={businessId}
          inicial={edicao.item}
          novo={edicao.novo}
          destino={lista.destino}
          onSalvar={salvarItem}
          onApagar={() => apagarItem(edicao.item.id)}
          onFechar={() => setEdicao(null)}
        />
      )}
    </div>
  );
}

/** Bloco opcional "Lista de itens" do editor da página própria. */
export function ListaItensEditor({ businessId, lista, temWhatsapp, onChange }: { businessId: string; lista: Lista | null; temWhatsapp: boolean; onChange: (l: Lista | null) => void }) {
  if (!lista) {
    return (
      <button type="button" onClick={() => onChange(listaVazia())} className="mt-7 flex w-full items-center gap-3.5 rounded-[26px] bg-on-background p-4 text-left text-white shadow-[0_8px_22px_rgba(17,19,24,0.22)] active:scale-[0.99]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[22px] font-light leading-none text-on-background" aria-hidden>+</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Quer listar itens nesta página?</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-white/70">Comece aqui.</span>
        </span>
      </button>
    );
  }
  return <ListaAtiva businessId={businessId} lista={lista} temWhatsapp={temWhatsapp} onChange={onChange} />;
}
