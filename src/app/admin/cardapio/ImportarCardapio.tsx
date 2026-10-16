"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { novoId, type CardapioSecao } from "@/lib/cardapio";
import { OrbiConcluido, OrbiEncher } from "@/components/orbi/OrbiConcluido";
import OrbiPontos from "@/components/orbi/OrbiPontos";
import { recortarFoto, type CaixaFoto } from "@/lib/recortarFoto";
import { fundoIndisponivel, prepararTirarFundo, tirarFundo } from "@/lib/tirarFundo";
import { MAX_PAGINAS_LEITURA, pdfParaImagens } from "@/lib/pdfParaImagens";

const MAX_FOTOS = 8;

type ItemProposto = { titulo: string; descricao: string; preco: number | null; preco_tipo: "exato" | "a_partir"; marcado: boolean; foto?: CaixaFoto | null; fotoBlob?: Blob | null; fotoPreview?: string | null; usarFoto?: boolean };
type Secao = { nome: string; itens: ItemProposto[] };

/**
 * Importar cardápio: a pessoa cola o texto ou envia foto(s) do cardápio e a
 * Orbi monta os pratos por categoria. Antes de entrar no cardápio tudo passa por
 * uma revisão (marcar, trocar nome e preço), porque a leitura de foto pode errar.
 */
export function ImportarCardapio({ businessId, onAdicionar, onManual, compacto = false, doPdf = null, onConsumido }: { businessId: string; onAdicionar: (novas: CardapioSecao[]) => void; onManual: () => void; /** Já há pratos: mostra só atalhos pequenos. */ compacto?: boolean; /** PDF já enviado que a Orbi deve ler agora. */ doPdf?: { url: string; nome: string; chave: number } | null; onConsumido?: () => void }) {
  const supabase = useRef(createClient()).current;
  const inputFoto = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<{ nome: string; url: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [recorte, setRecorte] = useState<{ n: number; total: number } | null>(null);
  const [baixando, setBaixando] = useState<number | null>(null);
  const [semFundoAviso, setSemFundoAviso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [secoes, setSecoes] = useState<Secao[] | null>(null);
  const [feito, setFeito] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function subirImagem(f: Blob, tipo: string): Promise<{ nome: string; url: string } | null> {
    const ext = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
    const path = `${businessId}/cardapio-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await supabase.storage.from("box-images").upload(path, f, { cacheControl: "3600", upsert: false, contentType: tipo });
    if (error) return null;
    return { nome: path, url: supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl };
  }

  /** Aceita fotos e PDFs. Cada página do PDF vira uma imagem para a Orbi ler. */
  async function enviarFotos(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    setErro(null);
    setEnviando(true);
    const novas: { nome: string; url: string }[] = [];
    for (const f of Array.from(lista)) {
      if (fotos.length + novas.length >= MAX_FOTOS) break;
      let partes: { blob: Blob; tipo: string }[] = [];
      if (f.type === "application/pdf") {
        try {
          const { imagens, paginas } = await pdfParaImagens(f);
          partes = imagens.map((blob) => ({ blob, tipo: "image/jpeg" }));
          if (paginas > MAX_PAGINAS_LEITURA) setErro(`Li as ${MAX_PAGINAS_LEITURA} primeiras páginas do PDF. Depois importe o resto.`);
        } catch {
          setErro("Não consegui abrir esse PDF. Tente enviar foto ou colar o texto.");
          continue;
        }
      } else if (f.type.startsWith("image/")) {
        partes = [{ blob: f, tipo: f.type }];
      } else {
        setErro("Envie foto (JPG ou PNG) ou PDF.");
        continue;
      }
      for (const { blob, tipo } of partes) {
        if (fotos.length + novas.length >= MAX_FOTOS) break;
        const up = await subirImagem(blob, tipo);
        if (up) novas.push({ nome: f.name, url: up.url });
        else setErro("Não consegui enviar o arquivo. Tente de novo.");
      }
    }
    setFotos((p) => [...p, ...novas]);
    setEnviando(false);
    if (inputFoto.current) inputFoto.current.value = "";
  }

  // PDF já enviado no cardápio: baixa, transforma em imagens e a Orbi já lê.
  const chaveFeita = useRef<number | null>(null);
  useEffect(() => {
    if (!doPdf || chaveFeita.current === doPdf.chave) return;
    chaveFeita.current = doPdf.chave;
    onConsumido?.();
    (async () => {
      setAberto(true);
      setFeito(null);
      setErro(null);
      setLendo(true);
      try {
        const r = await fetch(doPdf.url);
        if (!r.ok) throw new Error("baixar");
        const { imagens } = await pdfParaImagens(await r.blob());
        const subidas: { nome: string; url: string }[] = [];
        for (const blob of imagens) {
          const up = await subirImagem(blob, "image/jpeg");
          if (up) subidas.push({ nome: `${doPdf.nome}.pdf`, url: up.url });
        }
        if (subidas.length === 0) throw new Error("vazio");
        setFotos(subidas);
        await ler(subidas);
      } catch {
        setLendo(false);
        setErro("Não consegui ler esse PDF aqui. Se ele for um link do Drive, envie o arquivo. Ou cole o texto abaixo.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doPdf]);

  // Começa a baixar o recortador de fundo assim que a pessoa abre a importação, para a primeira foto não esperar.
  useEffect(() => {
    if (aberto) prepararTirarFundo();
  }, [aberto]);

  async function ler(usar?: { nome: string; url: string }[]) {
    setErro(null);
    setLendo(true);
    try {
      const res = await fetch("/api/importar-cardapio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, texto, imagens: (usar ?? fotos).map((f) => f.url) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.error ?? "A Orbi não conseguiu ler o cardápio agora.");
        return;
      }
      const base = (usar ?? fotos).map((f) => f.url);
      const propostas = (json.categorias as { nome: string; itens: Omit<ItemProposto, "marcado">[] }[]).map((c) => ({ nome: c.nome, itens: c.itens.map((i) => ({ ...i, marcado: true })) }));
      // Recorta a foto de cada prato da própria imagem lida. Se um recorte falhar, o prato segue sem foto.
      // Depois tira o fundo de cada recorte (fundo claro e neutro). Se isso falhar, fica o recorte como veio.
      const comFoto = propostas.reduce((n, c) => n + c.itens.filter((i) => i.foto && base[i.foto.imagem - 1]).length, 0);
      let n = 0;
      setSemFundoAviso(false);
      setRecorte({ n: 0, total: comFoto });
      for (const c of propostas) {
        for (const i of c.itens) {
          const cx = i.foto;
          const url = cx ? base[cx.imagem - 1] : null;
          if (!cx || !url) continue;
          try {
            let blob = await recortarFoto(url, cx);
            if (blob) {
              try { blob = await tirarFundo(blob, setBaixando); } catch { setSemFundoAviso(true); /* mantém o recorte com o fundo original */ }
              i.fotoBlob = blob; i.fotoPreview = URL.createObjectURL(blob); i.usarFoto = true;
            }
          } catch { /* sem foto para este prato */ }
          n += 1;
          setRecorte({ n, total: comFoto });
        }
      }
      setSecoes(propostas);
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setLendo(false);
      setRecorte(null);
      setBaixando(null);
    }
  }

  const total = (secoes ?? []).reduce((n, s) => n + s.itens.filter((i) => i.marcado && i.titulo.trim()).length, 0);

  function mudar(si: number, ii: number, patch: Partial<ItemProposto>) {
    setSecoes((p) => (p ?? []).map((s, a) => (a !== si ? s : { ...s, itens: s.itens.map((i, b) => (b === ii ? { ...i, ...patch } : i)) })));
  }

  async function adicionar() {
    if (!secoes || total === 0) return;
    setSalvando(true);
    const novas: CardapioSecao[] = [];
    for (const sec of secoes) {
      const itens = [];
      for (const i of sec.itens.filter((x) => x.marcado && x.titulo.trim())) {
        let foto: string | null = null;
        if (i.usarFoto && i.fotoBlob) foto = (await subirImagem(i.fotoBlob, "image/jpeg"))?.url ?? null;
        itens.push({ id: novoId(), nome: i.titulo.trim(), descricao: i.descricao.trim(), preco: i.preco, aPartir: i.preco != null && i.preco_tipo === "a_partir", foto });
      }
      if (itens.length > 0) novas.push({ id: novoId(), nome: sec.nome.trim(), itens });
    }
    setSalvando(false);
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
          <p className="mt-1.5 px-4 text-[12.5px] leading-snug text-text-tertiary">Mais rápido. Cole o cardápio do jeito que estiver, ou envie foto ou PDF, e a Orbi separa por categoria. Você revisa antes de entrar.</p>
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
      <OrbiConcluido className="mt-5" titulo={`${feito} ${feito === 1 ? "prato adicionado" : "pratos adicionados"} ao cardápio`} texto="Já estão na lista logo abaixo. Se quiser, coloque foto em cada um.">
        <button type="button" onClick={() => { setFeito(null); setAberto(true); }} className="min-h-[44px] rounded-full bg-white px-5 text-[13.5px] font-medium active:scale-[0.98]">Importar mais</button>
      </OrbiConcluido>
    );
  }

  return (
    <div className="mt-5 rounded-[24px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
      <div className="flex items-center justify-between">
        <p className="text-[16px] font-semibold">Importar cardápio</p>
        <button type="button" onClick={() => { setAberto(false); setSecoes(null); setErro(null); }} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
      </div>

      {lendo ? (
        <div role="status" aria-live="polite" className="flex flex-col items-center px-2 py-10 text-center">
          <OrbiEncher size={112} estado="carregando" progresso={recorte && recorte.total > 0 ? 0.55 + 0.4 * (recorte.n / recorte.total) : undefined} />
          <p className="mt-5 text-[16px] font-semibold">{recorte ? "A Orbi está recortando as fotos" : "A Orbi está lendo o cardápio"}</p>
          {recorte && recorte.total > 0 && !(recorte.n === 0 && baixando !== null && baixando < 1) && <OrbiPontos n={recorte.n} total={recorte.total} className="mt-4" />}
          <p className="mt-3 max-w-[300px] text-[13px] leading-snug text-text-secondary">{recorte ? (recorte.n === 0 && baixando !== null && baixando < 1 ? `Baixando o recortador de fundo, só na primeira vez: ${Math.round(baixando * 100)}%.` : fundoIndisponivel() ? `Não consegui tirar o fundo agora. Deixando só o recorte dos pratos: ${recorte.n} de ${recorte.total}.` : `Tirando o fundo de cada prato: ${recorte.n} de ${recorte.total}.`) : "Separando por categoria, com nome e preço. Pode levar alguns segundos."}</p>
        </div>
      ) : secoes === null ? (
        <>
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">Cole o cardápio do jeito que estiver (pode ser bagunçado) ou envie foto ou PDF. A Orbi separa por categoria, com nome, descrição e preço, e você revisa antes de entrar. Nada disso mexe no seu Catálogo.</p>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={7} placeholder={"Ex:\nLANCHES\nX-Burger  pão, carne, queijo  R$ 22,00\nX-Salada  R$ 25,00\n\nBEBIDAS\nCoca-Cola lata  R$ 6"} className={`${campo} mt-3 resize-y text-[14px] leading-relaxed`} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input ref={inputFoto} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => enviarFotos(e.target.files)} />
            <button type="button" onClick={() => inputFoto.current?.click()} disabled={enviando || fotos.length >= MAX_FOTOS} className="min-h-[44px] rounded-full border border-divider px-5 text-[13.5px] font-medium disabled:opacity-50">
              {enviando ? "Enviando…" : fotos.length > 0 ? "Adicionar outro arquivo" : "Enviar foto ou PDF do cardápio"}
            </button>
            {fotos.map((f, n) => (
              <span key={f.url} className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft py-1.5 pl-3 pr-1.5 text-[12.5px] text-text-secondary">
                {f.nome.toLowerCase().endsWith(".pdf") ? `Página ${n + 1}` : `Foto ${n + 1}`}
                <button type="button" onClick={() => setFotos((p) => p.filter((x) => x.url !== f.url))} aria-label="Remover arquivo" className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px]">✕</button>
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-text-tertiary">Até 8 fotos ou páginas de PDF. Quanto mais nítido, melhor a leitura.</p>

          {erro && <p role="alert" className="mt-3 text-[13px] text-red-600">{erro}</p>}
          <button type="button" onClick={() => ler()} disabled={lendo || enviando || (!texto.trim() && fotos.length === 0)} className="mt-4 min-h-[48px] w-full rounded-full bg-on-background text-[14.5px] font-semibold text-white disabled:opacity-40">
            Orbi, monta meu cardápio
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">A Orbi encontrou {secoes.reduce((n, s) => n + s.itens.length, 0)} pratos{secoes.some((x) => x.itens.some((i) => i.fotoPreview)) ? " e recortou as fotos que estavam no cardápio. Toque na foto para tirar a que não ficou boa" : ""}. Confira, ajuste nome e preço e desmarque o que não quiser.</p>
          {semFundoAviso && <p role="status" className="mt-2 rounded-2xl bg-surface-soft px-3.5 py-2.5 text-[12.5px] leading-snug text-text-secondary">Não consegui tirar o fundo de algumas fotos (a internet pode estar lenta). Elas ficaram só com o recorte. Depois, em cada prato, toque na foto e use Tirar fundo.</p>}
          <div className="mt-3 flex flex-col gap-4">
            {secoes.map((s, si) => (
              <div key={si}>
                <input value={s.nome} onChange={(e) => setSecoes((p) => (p ?? []).map((x, a) => (a === si ? { ...x, nome: e.target.value } : x)))} maxLength={40} aria-label="Nome da categoria" className="w-full bg-transparent font-[family-name:var(--font-manrope)] text-[16px] font-semibold outline-none" />
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {s.itens.map((i, ii) => (
                    <div key={ii} className={`flex items-start gap-2.5 rounded-2xl border p-2.5 ${i.marcado ? "border-divider" : "border-transparent bg-surface-soft opacity-60"}`}>
                      <button type="button" role="checkbox" aria-checked={i.marcado} onClick={() => mudar(si, ii, { marcado: !i.marcado })} className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${i.marcado ? "bg-on-background text-white" : "border border-divider text-transparent"}`}>✓</button>
                      {i.fotoPreview && (
                        <button type="button" onClick={() => mudar(si, ii, { usarFoto: !i.usarFoto })} aria-pressed={!!i.usarFoto} aria-label={i.usarFoto ? "Tirar a foto deste prato" : "Usar a foto deste prato"} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-soft ring-1 ring-black/[0.06] active:scale-[0.96]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={i.fotoPreview} alt="" className={`h-full w-full object-cover transition-opacity ${i.usarFoto ? "" : "opacity-30"}`} />
                          {!i.usarFoto && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-text-secondary">sem foto</span>}
                        </button>
                      )}
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
              {salvando ? "Salvando fotos…" : `Adicionar ${total} ${total === 1 ? "prato" : "pratos"}`}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-text-tertiary">Pratos sem preço ficam sem preço no cardápio.</p>
        </>
      )}
    </div>
  );
}
