"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { MinhaGaleriaPicker } from "@/components/ui/MinhaGaleriaPicker";
import { FotoProntaPicker } from "@/components/ui/FotoProntaPicker";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { MAX_PAGINAS_LEITURA, pdfParaImagens } from "@/lib/pdfParaImagens";
import { MAX_FOTOS, MAX_LISTA, fotosDoItem, listaVazia, novoIdLista, precoDoItem, reduzirFoto, type Lista, type ListaDestino, type ListaItem } from "@/lib/lista";

const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background";

const DESTINOS: { id: ListaDestino; rotulo: string; ajuda: string }[] = [
  { id: "whatsapp", rotulo: "WhatsApp", ajuda: "O cliente toca em um item, vê os detalhes e chama no WhatsApp do negócio." },
  { id: "delivery", rotulo: "Delivery", ajuda: "O cliente toca em um item e vai direto aos seus apps de delivery (iFood, Rappi e outros)." },
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
  const [fotos, setFotos] = useState<string[]>(fotosDoItem(inicial));
  const [sel, setSel] = useState(0);
  const alvoCorte = useRef<number | null>(null);
  const foto = fotos[sel] ?? null;
  const cheiaFotos = fotos.length >= MAX_FOTOS;
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [galeria, setGaleria] = useState(false);
  const [prontas, setProntas] = useState(false);
  const [recorte, setRecorte] = useState<File | null>(null);

  // Toda foto passa pelo recorte: o dono arrasta e aproxima dentro da forma do item (retrato).
  function enviar(f: File | undefined) {
    if (input.current) input.current.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErro("Envie uma foto (JPG ou PNG).");
    if (cheiaFotos) return setErro(`Cada item aceita até ${MAX_FOTOS} fotos. Tire uma para adicionar outra.`);
    setErro(null);
    alvoCorte.current = null;
    setRecorte(f);
  }

  async function ajustarAtual(url: string, substituir = true) {
    if (!substituir && cheiaFotos) return setErro(`Cada item aceita até ${MAX_FOTOS} fotos. Tire uma para adicionar outra.`);
    alvoCorte.current = substituir ? sel : null;
    setErro(null);
    try {
      const r = await fetch(url);
      const b = await r.blob();
      setRecorte(new File([b], "foto.jpg", { type: b.type || "image/jpeg" }));
    } catch {
      setErro("Não consegui abrir a foto para ajustar. Envie de novo.");
    }
  }

  async function subirRecortada(cortada: Blob) {
    setRecorte(null);
    setSubindo(true);
    const blob = await reduzirFoto(new File([cortada], "item.jpg", { type: cortada.type || "image/jpeg" }));
    const path = `${businessId}/lista-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error } = await supabase.storage.from("box-images").upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: blob.type || "image/jpeg" });
    setSubindo(false);
    if (error) return setErro("Não consegui enviar a foto. Tente de novo.");
    const url = supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl;
    const alvo = alvoCorte.current;
    if (alvo !== null && alvo < fotos.length) {
      setFotos((p) => p.map((f, n) => (n === alvo ? url : f)));
    } else {
      setFotos((p) => [...p, url].slice(0, MAX_FOTOS));
      setSel(Math.min(fotos.length, MAX_FOTOS - 1));
    }
  }

  function tirarAtual() {
    setFotos((p) => p.filter((_, n) => n !== sel));
    setSel((n) => Math.max(0, n - 1));
  }

  function tornarCapa() {
    setFotos((p) => [p[sel], ...p.filter((_, n) => n !== sel)]);
    setSel(0);
  }

  function salvar() {
    if (!nome.trim()) return;
    const n = preco.trim() === "" ? null : Number(preco.replace(",", "."));
    onSalvar({ id: inicial.id, nome: nome.trim(), preco: n != null && !Number.isNaN(n) ? n : null, descricao: descricao.trim(), foto: fotos[0] ?? null, fotos, link: link.trim(), esgotado });
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
          <button type="button" onClick={() => input.current?.click()} disabled={subindo} aria-label={foto ? "Trocar foto" : "Adicionar foto"} className="flex h-[100px] w-20 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-surface-soft text-text-tertiary active:scale-[0.98]">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" className="h-full w-full object-cover" />
            ) : (
              <IconeCamera />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium">{subindo ? "Enviando…" : fotos.length > 1 ? `Fotos do item (${fotos.length} de ${MAX_FOTOS})` : foto ? "Foto do item" : "Foto (opcional)"}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setGaleria(true)} disabled={subindo} className="min-h-[36px] rounded-full bg-on-background px-3.5 text-[13px] font-medium text-white">Álbum Orbibox</button>
              <button type="button" onClick={() => input.current?.click()} disabled={subindo} className="min-h-[36px] rounded-full bg-surface-soft px-3.5 text-[13px] font-medium text-text-secondary">Upload</button>
              <button type="button" onClick={() => setProntas(true)} disabled={subindo} className="min-h-[36px] rounded-full bg-surface-soft px-3.5 text-[13px] font-medium text-text-secondary">Busca web</button>
              {foto && <button type="button" onClick={() => ajustarAtual(foto)} disabled={subindo} className="min-h-[36px] rounded-full bg-surface-soft px-3.5 text-[13px] font-medium text-text-secondary">Ajustar</button>}
              {foto && sel > 0 && <button type="button" onClick={tornarCapa} className="min-h-[36px] rounded-full bg-surface-soft px-3.5 text-[13px] font-medium text-text-secondary">Tornar capa</button>}
              {foto && <button type="button" onClick={tirarAtual} className="min-h-[36px] rounded-full px-3 text-[13px] font-medium text-text-secondary">Tirar</button>}
            </div>
          </div>
        </div>
        {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}

        {fotos.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto py-0.5" role="listbox" aria-label="Fotos do item">
            {fotos.map((f, n) => (
              <button key={f + n} type="button" role="option" aria-selected={n === sel} onClick={() => setSel(n)} aria-label={n === 0 ? "Foto de capa" : `Foto ${n + 1}`} className={`relative h-[60px] w-12 shrink-0 overflow-hidden rounded-xl bg-surface-soft transition-transform active:scale-[0.96] ${n === sel ? "ring-2 ring-on-background ring-offset-2 ring-offset-background-main" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f} alt="" className="h-full w-full object-cover" />
                {n === 0 && <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[9px] font-semibold text-white">Capa</span>}
              </button>
            ))}
            {!cheiaFotos && (
              <button type="button" onClick={() => input.current?.click()} disabled={subindo} aria-label="Adicionar outra foto" className="flex h-[60px] w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-text-tertiary/50 text-text-secondary active:scale-[0.96]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
              </button>
            )}
          </div>
        )}

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
      {recorte && <ImageCropModal file={recorte} lockedRatio="retrato" lockedReason="A foto do item aparece no formato retrato. Arraste e aproxime para enquadrar." onCancel={() => setRecorte(null)} onConfirm={(blob) => subirRecortada(blob)} />}
      {galeria && <MinhaGaleriaPicker businessId={businessId} atual={foto} onFechar={() => setGaleria(false)} onEscolher={(url) => { setGaleria(false); ajustarAtual(url, false); }} />}
      {prontas && <FotoProntaPicker businessId={businessId} assunto={nome} formato="retrato" onFechar={() => setProntas(false)} onEscolher={(f) => { setProntas(false); enviar(f); }} />}
    </div>,
    document.body,
  );
}

type Proposto = { id: string; nome: string; preco: number | null; descricao: string };

function Passo({ n, titulo, sub, children }: { n: number; titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 rounded-[26px] border border-divider bg-surface-white p-4 shadow-[0_4px_14px_rgba(17,19,24,0.05)]" aria-label={titulo}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-on-background text-[12px] font-semibold text-white" aria-hidden>{n}</span>
        <div className="min-w-0">
          <p className="text-[15.5px] font-semibold leading-tight">{titulo}</p>
          {sub && <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function ListaAtiva({ businessId, lista, temWhatsapp, onChange }: { businessId: string; lista: Lista; temWhatsapp: boolean; onChange: (l: Lista | null) => void }) {
  const supabase = useRef(createClient()).current;
  const arquivos = useRef<HTMLInputElement>(null);
  const [titulo, setTitulo] = useState(lista.titulo);
  const [edicao, setEdicao] = useState<{ item: ListaItem; novo: boolean } | null>(null);
  const [colar, setColar] = useState(false);
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<{ nome: string; blob: Blob }[]>([]);
  const [lendoArquivo, setLendoArquivo] = useState(false);
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

  /** PDF vira uma imagem por página; foto entra como está. A Orbi lê tudo como foto. */
  async function anexar(files: FileList | null) {
    if (arquivos.current) arquivos.current.value = "";
    if (!files || files.length === 0) return;
    setErro(null);
    setLendoArquivo(true);
    const novos: { nome: string; blob: Blob }[] = [];
    for (const f of Array.from(files)) {
      if (anexos.length + novos.length >= MAX_PAGINAS_LEITURA) break;
      if (f.type === "application/pdf") {
        try {
          const { imagens, paginas } = await pdfParaImagens(f);
          imagens.forEach((blob, n) => { if (anexos.length + novos.length < MAX_PAGINAS_LEITURA) novos.push({ nome: `${f.name} (página ${n + 1})`, blob }); });
          if (paginas > MAX_PAGINAS_LEITURA) setErro(`Li as ${MAX_PAGINAS_LEITURA} primeiras páginas do PDF. Depois importe o resto.`);
        } catch {
          setErro("Não consegui abrir esse PDF. Tente uma foto ou cole o texto.");
        }
      } else if (f.type.startsWith("image/")) {
        novos.push({ nome: f.name, blob: f });
      } else {
        setErro("Envie PDF, foto (JPG ou PNG) ou cole o texto.");
      }
    }
    setAnexos((p) => [...p, ...novos]);
    setLendoArquivo(false);
  }

  async function ler() {
    setErro(null);
    setLendo(true);
    const caminhos: string[] = [];
    try {
      const urls: string[] = [];
      for (const a of anexos) {
        const tipo = a.blob.type || "image/jpeg";
        const ext = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
        const path = `${businessId}/lista-leitura-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error } = await supabase.storage.from("box-images").upload(path, a.blob, { cacheControl: "3600", upsert: false, contentType: tipo });
        if (error) { setErro("Não consegui enviar o arquivo. Tente de novo."); return; }
        caminhos.push(path);
        urls.push(supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl);
      }
      const res = await fetch("/api/importar-cardapio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, texto, imagens: urls, modo: "lista" }) });
      const json = await res.json();
      if (!res.ok) return setErro(json.error ?? "A Orbi não conseguiu ler a lista agora.");
      const todos = (json.categorias as { itens: { titulo: string; descricao: string; preco: number | null }[] }[]).flatMap((c) => c.itens);
      setPropostos(todos.slice(0, MAX_LISTA - lista.itens.length).map((i) => ({ id: novoIdLista(), nome: i.titulo, preco: i.preco, descricao: i.descricao })));
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      // As páginas só serviam para a leitura: não deixa arquivo esquecido no armazenamento.
      if (caminhos.length > 0) void supabase.storage.from("box-images").remove(caminhos);
      setLendo(false);
    }
  }

  function adicionarPropostos() {
    const novos = (propostos ?? []).filter((p) => p.nome.trim()).map((p) => ({ id: p.id, nome: p.nome.trim(), preco: p.preco, descricao: p.descricao, foto: null, link: "", esgotado: false }));
    if (novos.length > 0) onChange({ ...lista, itens: [...lista.itens, ...novos] });
    setPropostos(null);
    setTexto("");
    setAnexos([]);
    setColar(false);
  }

  const podeLer = !lendo && !lendoArquivo && (texto.trim().length > 0 || anexos.length > 0);

  return (
    <div className="mt-8">
      <div className="px-1">
        <label htmlFor="lista-titulo" className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Título da lista</label>
        <input id="lista-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={() => titulo !== lista.titulo && onChange({ ...lista, titulo: titulo.trim() })} maxLength={50} placeholder="Ex: Blusas, Nossos pratos" className={`${campo} mt-1.5`} />
      </div>

      <Passo n={1} titulo="Itens" sub={lista.itens.length === 0 ? "Comece colando ou enviando a lista, é o jeito mais rápido." : `${lista.itens.length} ${lista.itens.length === 1 ? "item" : "itens"}. Toque num item para pôr foto e detalhes.`}>
        {!colar && (
          <button type="button" onClick={() => setColar(true)} disabled={cheia} className="orbi-gradient mt-3.5 flex min-h-[64px] w-full items-center gap-3 rounded-[22px] p-3.5 text-left text-on-background disabled:opacity-40 active:scale-[0.99]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 text-[18px]" aria-hidden>✨</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold">Colar texto, PDF ou foto</span>
              <span className="block text-[12.5px] leading-snug opacity-75">A Orbi separa nome e preço, você confere antes de entrar.</span>
            </span>
          </button>
        )}

        {colar && propostos === null && (
          <div className="mt-3.5 rounded-[20px] bg-surface-soft p-3.5">
            <input ref={arquivos} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => void anexar(e.target.files)} />
            <button type="button" onClick={() => arquivos.current?.click()} disabled={lendoArquivo || lendo} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-on-background text-[14px] font-semibold text-white disabled:opacity-50 active:scale-[0.99]">
              {lendoArquivo ? "Abrindo o arquivo…" : anexos.length > 0 ? "Adicionar outro PDF ou foto" : "Enviar PDF ou foto"}
            </button>
            {anexos.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {anexos.map((a, n) => (
                  <li key={a.nome + n} className="flex items-center justify-between gap-2 rounded-xl bg-surface-white px-3 py-1.5 text-[12.5px]">
                    <span className="min-w-0 truncate">{a.nome}</span>
                    <button type="button" onClick={() => setAnexos((p) => p.filter((_, k) => k !== n))} aria-label={`Tirar ${a.nome}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[11px]">✕</button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1.5 text-center text-[12px] text-text-tertiary">Até {MAX_PAGINAS_LEITURA} fotos ou páginas de PDF.</p>
            <p className="mt-3 text-center text-[12px] font-medium uppercase tracking-wide text-text-tertiary">ou cole o texto</p>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} placeholder={"Ex:\nBlusa canelada preta, P ao G, R$ 59,90\nBlusa linho off white R$ 89"} className={`${campo} mt-2 resize-y text-[14px] leading-relaxed`} />
            {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { setColar(false); setErro(null); setAnexos([]); }} className="min-h-[46px] flex-1 rounded-full bg-surface-white text-[14px] font-medium ring-1 ring-black/[0.08]">Cancelar</button>
              <button type="button" onClick={ler} disabled={!podeLer} className="min-h-[46px] flex-[2] rounded-full bg-on-background text-[14px] font-semibold text-white disabled:opacity-40">{lendo ? "A Orbi está lendo…" : "Orbi, monta a lista"}</button>
            </div>
          </div>
        )}

        {colar && propostos !== null && (
          <div className="mt-3.5 rounded-[20px] bg-surface-soft p-3.5">
            <p className="text-[13.5px] font-medium">A Orbi encontrou {propostos.length} {propostos.length === 1 ? "item" : "itens"}</p>
            <p className="mt-0.5 text-[12.5px] text-text-tertiary">Ajuste o nome e o preço ou tire o que não quiser.</p>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {propostos.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-xl border border-divider bg-surface-white p-2">
                  <input value={p.nome} onChange={(e) => setPropostos((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, nome: e.target.value } : x)))} aria-label="Nome do item" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
                  <input value={p.preco == null ? "" : String(p.preco).replace(".", ",")} onChange={(e) => { const v = e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""); setPropostos((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, preco: v === "" ? null : Number(v) || 0 } : x))); }} inputMode="decimal" placeholder="Preço" aria-label={`Preço de ${p.nome}`} className="w-[64px] rounded-lg border border-divider px-2 py-1 text-right text-[13.5px] outline-none focus:border-on-background" />
                  <button type="button" onClick={() => setPropostos((l) => (l ?? []).filter((x) => x.id !== p.id))} aria-label="Tirar item" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[12px]">✕</button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setPropostos(null)} className="min-h-[46px] flex-1 rounded-full bg-surface-white text-[14px] font-medium ring-1 ring-black/[0.08]">Voltar</button>
              <button type="button" onClick={adicionarPropostos} disabled={propostos.length === 0} className="min-h-[46px] flex-[2] rounded-full bg-on-background text-[14px] font-semibold text-white disabled:opacity-40">Adicionar {propostos.length} {propostos.length === 1 ? "item" : "itens"}</button>
            </div>
          </div>
        )}

        {lista.itens.length > 0 && (
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
                    {fotosDoItem(i).length > 1 && <span className="absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">{fotosDoItem(i).length} fotos</span>}
                    {i.esgotado && <span className="absolute left-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] text-text-secondary">Esgotado</span>}
                  </span>
                  <span className="mt-1 block truncate text-[12.5px] font-medium">{i.nome || "Sem nome"}</span>
                  <span className="block truncate text-[11.5px] text-text-tertiary">{precoDoItem(i.preco) ?? "Sem preço"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!cheia ? (
          <button type="button" onClick={novoItem} className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-dashed border-on-background/30 text-[13.5px] font-medium text-text-secondary active:scale-[0.99]">
            <span className="text-[18px] leading-none" aria-hidden>+</span> Adicionar um item
          </button>
        ) : (
          <p className="mt-2 text-[12.5px] text-text-tertiary">Limite de {MAX_LISTA} itens por lista. Para mais, crie outra página própria.</p>
        )}
      </Passo>

      <details className="group mt-3 rounded-[26px] border border-divider bg-surface-white shadow-[0_4px_14px_rgba(17,19,24,0.05)]">
        <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-2.5 px-4 py-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[12px] font-semibold text-text-secondary" aria-hidden>2</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15.5px] font-semibold leading-tight">Ao tocar num item</span>
            <span className="block truncate text-[12.5px] text-text-tertiary">{destino.rotulo}{lista.orbi !== false ? ", Orbi ligada" : ""}</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-tertiary transition-transform group-open:rotate-180" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
        </summary>
        <div className="px-4 pb-4">
          <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Botão do item</p>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Destino do botão">
            {DESTINOS.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={lista.destino === d.id} onClick={() => lista.destino !== d.id && onChange({ ...lista, destino: d.id })} className={`min-h-[44px] rounded-full px-4 text-[13.5px] font-medium ${lista.destino === d.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{d.rotulo}</button>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-text-tertiary">{destino.ajuda}</p>
          {lista.destino === "whatsapp" && !temWhatsapp && <p className="mt-1 text-[12.5px] leading-snug text-[#9A4F06]">Cadastre o WhatsApp do negócio para esse botão aparecer.</p>}

          <button type="button" role="switch" aria-checked={lista.orbi !== false} onClick={() => onChange({ ...lista, orbi: lista.orbi === false })} className="mt-3 flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-divider bg-surface-white px-4 text-left text-[14px]">
            <span>
              <span className="block font-medium">Perguntar à Orbi</span>
              <span className="block text-[12px] text-text-tertiary">Botão discreto embaixo do principal, pra tirar dúvidas do item</span>
            </span>
            <span className={`ml-3 h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${lista.orbi !== false ? "orbi-gradient" : "bg-divider"}`}>
              <span className={`block h-5 w-5 rounded-full bg-surface-white shadow transition-transform ${lista.orbi !== false ? "translate-x-5" : ""}`} />
            </span>
          </button>
        </div>
      </details>

      <div className="mt-5 flex justify-center">
        <button type="button" onClick={removerLista} className="min-h-[44px] rounded-full px-4 text-[13px] font-medium text-red-600 active:opacity-70">Remover lista</button>
      </div>

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
