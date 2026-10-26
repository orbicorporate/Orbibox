"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import { comprimirPdf } from "@/lib/comprimirPdf";
import { MAX_PDFS, novoId, pesoLegivel, type CardapioPdf } from "@/lib/cardapio";
import type { Json } from "@/lib/supabase/types";

export type BotaoPdf = { id: string; titulo: string; url: string; ativo: boolean };
type Cardapio = { boxId: string; config: Record<string, unknown>; pdfs: CardapioPdf[] } | null;

const BUCKET = "cardapios-pdf";
const MARCA = "/object/public/cardapios-pdf/";
const LIMITE = 10 * 1024 * 1024;
const AUTO = 5 * 1024 * 1024;

const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background";
const botaoSec = "inline-flex min-h-[44px] items-center justify-center rounded-full border border-divider bg-surface-white px-4 text-[13.5px] font-medium text-text-secondary active:scale-[0.98] disabled:opacity-50";

/**
 * Um lugar só para os PDFs da marca. Antes havia cinco portas diferentes; aqui o dono
 * sobe o arquivo e escolhe o destino: botão na página inicial, ou dentro do Cardápio.
 */
export function CentralPdfs({ businessId, botoes, cardapio }: { businessId: string; botoes: BotaoPdf[]; cardapio: Cardapio }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const input = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nome, setNome] = useState("");
  const [destino, setDestino] = useState<"home" | "cardapio">("home");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [querRemover, setQuerRemover] = useState<string | null>(null);
  // Qual item está trocando de arquivo (null = enviando um novo).
  const trocando = useRef<{ tipo: "home" | "cardapio"; id: string } | null>(null);
  const inputTroca = useRef<HTMLInputElement>(null);

  const pdfs = cardapio?.pdfs ?? [];
  const cardapioCheio = pdfs.length >= MAX_PDFS;

  async function prepararArquivo(f: File): Promise<File | null> {
    if (f.type !== "application/pdf") { setErro("Envie um arquivo PDF."); return null; }
    let arq = f;
    if (arq.size > AUTO) {
      setOcupado("Otimizando o PDF para abrir rápido no celular…");
      try {
        const menor = await comprimirPdf(arq, 4.5 * 1024 * 1024);
        if (menor && menor.size < arq.size) {
          setAviso(`A Orbi otimizou o PDF: de ${pesoLegivel(arq.size)} para ${pesoLegivel(menor.size)}. O texto do PDF deixa de ser selecionável.`);
          arq = menor;
        }
      } catch { /* segue com o original */ }
    }
    if (arq.size > LIMITE) { setErro("O PDF passou de 10 MB. Reduza o arquivo e tente de novo."); return null; }
    return arq;
  }

  async function subir(arq: File, prefixo: string): Promise<string | null> {
    const caminho = `${businessId}/${prefixo}-${new Date().getTime()}.pdf`;
    const { error } = await supabase.storage.from(BUCKET).upload(caminho, arq, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
    if (error) { setErro("Não consegui enviar o PDF. Tente de novo."); return null; }
    return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
  }

  async function apagarArquivo(url: string) {
    const i = url.indexOf(MARCA);
    if (i < 0) return;
    await supabase.storage.from(BUCKET).remove([decodeURIComponent(url.slice(i + MARCA.length))]);
  }

  async function gravarCardapio(novos: CardapioPdf[]): Promise<boolean> {
    if (!cardapio) return false;
    const config = { ...cardapio.config, pdfs: novos, pdf_url: novos[0]?.url ?? null } as Record<string, Json>;
    return conferirSalvo(await supabase.from("smart_boxes").update({ config }).eq("id", cardapio.boxId));
  }

  async function enviarNovo() {
    const titulo = nome.trim();
    if (!arquivo || !titulo || ocupado) return;
    setErro(null);
    setAviso(null);
    setOcupado("Enviando…");
    try {
      const arq = await prepararArquivo(arquivo);
      if (!arq) return;
      const url = await subir(arq, destino === "home" ? "botao" : "cardapio");
      if (!url) return;
      if (destino === "cardapio") {
        if (!(await gravarCardapio([...pdfs, { id: novoId(), nome: titulo, url, bytes: arq.size }]))) return;
      } else {
        const { data: ult } = await supabase.from("smart_boxes").select("position").eq("business_id", businessId).order("position", { ascending: false }).limit(1);
        const posicao = (ult?.[0]?.position ?? -1) + 1;
        const { data: caixa, error } = await supabase
          .from("smart_boxes")
          .insert({ business_id: businessId, box_type: "custom", title: titulo, position: posicao, is_active: true, config: { label: titulo, subtitle: "Abrir PDF", icon: "📄", action: "link", url, icone: false } })
          .select("id")
          .single();
        if (error || !caixa) { setErro("Não consegui criar o botão. Tente de novo."); return; }
        // Já aparece em destaque no topo da página inicial, como o botão de PDF criado pelo Destaque.
        const { data: neg } = await supabase.from("businesses").select("home_destaques").eq("id", businessId).maybeSingle();
        const atuais = Array.isArray(neg?.home_destaques) ? (neg!.home_destaques as { t: string; id: string }[]) : [];
        await supabase.from("businesses").update({ home_destaques: [...atuais, { t: "botao", id: caixa.id }] as Json }).eq("id", businessId);
      }
      setArquivo(null);
      setNome("");
      if (input.current) input.current.value = "";
      setAviso(destino === "home" ? "Pronto. O botão já está em destaque na sua página inicial." : "Pronto. O PDF já está dentro do seu Cardápio.");
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  async function renomearBotao(b: BotaoPdf, novo: string) {
    const t = novo.trim();
    if (!t || t === b.titulo) return;
    const { data } = await supabase.from("smart_boxes").select("config").eq("id", b.id).maybeSingle();
    const config = { ...((data?.config ?? {}) as Record<string, Json>), label: t };
    if (conferirSalvo(await supabase.from("smart_boxes").update({ title: t, config }).eq("id", b.id))) router.refresh();
  }

  async function renomearCardapio(p: CardapioPdf, novo: string) {
    const t = novo.trim();
    if (!t || t === p.nome) return;
    if (await gravarCardapio(pdfs.map((x) => (x.id === p.id ? { ...x, nome: t } : x)))) router.refresh();
  }

  function pedirRemocao(chave: string, executar: () => Promise<void>) {
    if (querRemover !== chave) {
      setQuerRemover(chave);
      window.setTimeout(() => setQuerRemover((a) => (a === chave ? null : a)), 4000);
      return;
    }
    setQuerRemover(null);
    void executar();
  }

  async function removerBotao(b: BotaoPdf) {
    setOcupado("Removendo…");
    try {
      const { error } = await supabase.from("smart_boxes").delete().eq("id", b.id);
      if (error) { setErro("Não consegui remover. Tente de novo."); return; }
      const { data: neg } = await supabase.from("businesses").select("home_destaques").eq("id", businessId).maybeSingle();
      const atuais = Array.isArray(neg?.home_destaques) ? (neg!.home_destaques as { t: string; id: string }[]) : [];
      if (atuais.some((d) => d.t === "botao" && d.id === b.id)) {
        await supabase.from("businesses").update({ home_destaques: atuais.filter((d) => !(d.t === "botao" && d.id === b.id)) as Json }).eq("id", businessId);
      }
      await apagarArquivo(b.url);
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  async function removerDoCardapio(p: CardapioPdf) {
    setOcupado("Removendo…");
    try {
      if (await gravarCardapio(pdfs.filter((x) => x.id !== p.id))) {
        await apagarArquivo(p.url);
        router.refresh();
      }
    } finally {
      setOcupado(null);
    }
  }

  function abrirTroca(tipo: "home" | "cardapio", id: string) {
    trocando.current = { tipo, id };
    inputTroca.current?.click();
  }

  async function trocarArquivo(f: File | null | undefined) {
    const alvo = trocando.current;
    trocando.current = null;
    if (inputTroca.current) inputTroca.current.value = "";
    if (!f || !alvo) return;
    setErro(null);
    setAviso(null);
    setOcupado("Trocando o arquivo…");
    try {
      const arq = await prepararArquivo(f);
      if (!arq) return;
      const url = await subir(arq, alvo.tipo === "home" ? "botao" : "cardapio");
      if (!url) return;
      if (alvo.tipo === "home") {
        const b = botoes.find((x) => x.id === alvo.id);
        const { data } = await supabase.from("smart_boxes").select("config").eq("id", alvo.id).maybeSingle();
        const config = { ...((data?.config ?? {}) as Record<string, Json>), url };
        if (!conferirSalvo(await supabase.from("smart_boxes").update({ config }).eq("id", alvo.id))) return;
        if (b) await apagarArquivo(b.url);
      } else {
        const antigo = pdfs.find((x) => x.id === alvo.id);
        if (!(await gravarCardapio(pdfs.map((x) => (x.id === alvo.id ? { ...x, url, bytes: arq.size } : x))))) return;
        if (antigo) await apagarArquivo(antigo.url);
      }
      setAviso("Arquivo trocado. O link do botão continua o mesmo.");
      router.refresh();
    } finally {
      setOcupado(null);
    }
  }

  const vazio = botoes.length === 0 && pdfs.length === 0;

  return (
    <div className="flex flex-col pb-10">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[30px] font-medium tracking-[-0.02em]">PDFs da marca</h1>
      <p className="mt-1 text-[14px] leading-snug text-text-secondary">
        Cardápio de Natal, tabela de preços, catálogo em PDF. Suba o arquivo aqui e escolha onde o cliente vai encontrá-lo.
      </p>

      <section className="mt-5 rounded-[22px] bg-surface-white p-4 ring-1 ring-divider" aria-label="Enviar PDF">
        <p className="text-[15px] font-medium">Enviar um PDF novo</p>
        <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; setArquivo(f); if (f && !nome.trim()) setNome(f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 60)); }} />
        <button type="button" onClick={() => input.current?.click()} className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-divider bg-surface-soft px-4 text-[14px] font-medium text-text-secondary active:scale-[0.99]">
          {arquivo ? `${arquivo.name} (${pesoLegivel(arquivo.size)})` : "Escolher o arquivo PDF"}
        </button>

        <label className="mt-3 block text-[12.5px] font-medium text-text-tertiary" htmlFor="nome-pdf">Nome que o cliente vai ver</label>
        <input id="nome-pdf" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="Ex.: Cardápio de Natal" className={`${campo} mt-1`} />

        <p className="mt-4 text-[12.5px] font-medium text-text-tertiary">Onde o cliente encontra</p>
        <div className="mt-2 flex flex-col gap-2" role="radiogroup" aria-label="Destino do PDF">
          <button type="button" role="radio" aria-checked={destino === "home"} onClick={() => setDestino("home")} className={`rounded-2xl px-4 py-3 text-left active:scale-[0.99] ${destino === "home" ? "bg-on-background text-white" : "bg-surface-white ring-1 ring-divider"}`}>
            <span className="block text-[14.5px] font-medium">Botão na tela inicial</span>
            <span className={`block text-[12.5px] leading-snug ${destino === "home" ? "text-white/75" : "text-text-tertiary"}`}>Aparece em destaque no topo da sua página e abre o PDF direto.</span>
          </button>
          <button type="button" role="radio" aria-checked={destino === "cardapio"} disabled={!cardapio || cardapioCheio} onClick={() => setDestino("cardapio")} className={`rounded-2xl px-4 py-3 text-left active:scale-[0.99] disabled:opacity-50 ${destino === "cardapio" ? "bg-on-background text-white" : "bg-surface-white ring-1 ring-divider"}`}>
            <span className="block text-[14.5px] font-medium">Dentro do Cardápio</span>
            <span className={`block text-[12.5px] leading-snug ${destino === "cardapio" ? "text-white/75" : "text-text-tertiary"}`}>
              {!cardapio ? "Você ainda não criou o Cardápio." : cardapioCheio ? `O Cardápio já tem ${MAX_PDFS} PDFs.` : "O cliente abre o Cardápio e baixa o arquivo lá."}
            </span>
          </button>
        </div>

        {ocupado && <p className="mt-3 text-[13px] text-text-secondary" role="status">{ocupado}</p>}
        {erro && <p className="mt-3 text-[13px] text-red-700" role="alert">{erro}</p>}
        {aviso && !ocupado && <p className="mt-3 text-[13px] text-text-secondary" role="status">{aviso}</p>}

        <button type="button" onClick={() => void enviarNovo()} disabled={!arquivo || !nome.trim() || !!ocupado} className="mt-4 min-h-[48px] w-full rounded-full bg-on-background text-[15px] font-semibold text-white disabled:opacity-40 active:scale-[0.98]">
          {!arquivo ? "Escolha o arquivo primeiro" : !nome.trim() ? "Dê um nome ao PDF" : destino === "home" ? "Enviar e criar o botão" : "Enviar para o Cardápio"}
        </button>
      </section>

      <input ref={inputTroca} type="file" accept="application/pdf" className="hidden" onChange={(e) => void trocarArquivo(e.target.files?.[0])} />

      {vazio && <p className="mt-6 text-center text-[13.5px] text-text-tertiary">Nenhum PDF ainda. Quando você enviar, ele aparece aqui.</p>}

      {botoes.length > 0 && (
        <section className="mt-7" aria-label="Botões de PDF na página inicial">
          <h2 className="text-[15px] font-medium">Botões na tela inicial</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {botoes.map((b) => (
              <LinhaPdf key={b.id} nome={b.titulo} url={b.url} aoRenomear={(n) => void renomearBotao(b, n)} aoTrocar={() => abrirTroca("home", b.id)}
                confirmando={querRemover === `h-${b.id}`} aoRemover={() => pedirRemocao(`h-${b.id}`, () => removerBotao(b))} ocupado={!!ocupado}
                extra={b.ativo ? undefined : "Desligado. Ligue em Botões para o cliente ver."} />
            ))}
          </ul>
        </section>
      )}

      {pdfs.length > 0 && (
        <section className="mt-7" aria-label="PDFs do Cardápio">
          <h2 className="text-[15px] font-medium">Dentro do Cardápio</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {pdfs.map((p) => (
              <LinhaPdf key={p.id} nome={p.nome} url={p.url} peso={p.bytes} aoRenomear={(n) => void renomearCardapio(p, n)} aoTrocar={() => abrirTroca("cardapio", p.id)}
                confirmando={querRemover === `c-${p.id}`} aoRemover={() => pedirRemocao(`c-${p.id}`, () => removerDoCardapio(p))} ocupado={!!ocupado} />
            ))}
          </ul>
          <Link href="/admin/cardapio" className="mt-3 inline-block text-[13px] text-text-secondary underline underline-offset-2">Pedir para a Orbi montar os pratos a partir de um PDF</Link>
        </section>
      )}

      <p className="mt-8 rounded-2xl bg-surface-soft px-4 py-3 text-[12.5px] leading-snug text-text-secondary">
        Procurando materiais para o cliente baixar, como catálogos e fichas? Eles ficam em <Link href="/admin/materiais" className="underline underline-offset-2">Materiais</Link>.
      </p>
    </div>
  );
}

function LinhaPdf({ nome, url, peso, extra, aoRenomear, aoTrocar, aoRemover, confirmando, ocupado }: {
  nome: string; url: string; peso?: number; extra?: string; aoRenomear: (n: string) => void; aoTrocar: () => void; aoRemover: () => void; confirmando: boolean; ocupado: boolean;
}) {
  return (
    <li className="rounded-[18px] bg-surface-white p-3 ring-1 ring-divider">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDECEC] text-[11px] font-bold text-[#B42318]" aria-hidden>PDF</span>
        <div className="min-w-0 flex-1">
          <input defaultValue={nome} onBlur={(e) => aoRenomear(e.target.value)} maxLength={60} aria-label="Nome do PDF" className="w-full min-w-0 bg-transparent text-[15px] font-medium outline-none" />
          <p className="text-[12px] text-text-tertiary">{peso ? pesoLegivel(peso) : "PDF"}{extra ? ` · ${extra}` : ""}</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <a href={url} target="_blank" rel="noreferrer" className={botaoSec}>Abrir</a>
        <button type="button" onClick={aoTrocar} disabled={ocupado} className={botaoSec}>Trocar arquivo</button>
        <button type="button" onClick={aoRemover} disabled={ocupado} className={`${botaoSec} ${confirmando ? "!border-red-300 !bg-red-50 !text-red-700" : ""}`}>
          {confirmando ? "Toque de novo para apagar" : "Remover"}
        </button>
      </div>
    </li>
  );
}
