"use client";

import { useEffect, useRef, useState } from "react";
import { OrbiMiniVerde } from "@/components/orbi/OrbiConcluido";
import { createClient } from "@/lib/supabase/client";
import { MAX_PDFS, novoId, pesoLegivel, type CardapioPdf } from "@/lib/cardapio";
import { comprimirPdf } from "@/lib/comprimirPdf";

const LIMITE_MB = 10;

/**
 * PDFs do cardápio para o cliente baixar (por exemplo Cardápio, Bebidas e
 * Sobremesas). O principal é enviar o arquivo (fica guardado aqui, abre e baixa
 * direto). Quem já tem o PDF num site ou no Drive pode colar o link, mas link
 * do Drive costuma pedir permissão e abrir uma página do Google em vez de
 * baixar, então avisamos.
 */
export function PdfCardapio({ businessId, pdfs, onChange, onMontar }: { businessId: string; pdfs: CardapioPdf[]; onChange: (pdfs: CardapioPdf[]) => void; /** A Orbi lê este PDF e monta a lista de pratos. */ onMontar?: (pdf: CardapioPdf) => void }) {
  const supabase = useRef(createClient()).current;
  const input = useRef<HTMLInputElement>(null);
  // Qual PDF está sendo trocado (null = enviando um novo).
  const trocando = useRef<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modoLink, setModoLink] = useState(false);
  const [link, setLink] = useState("");
  const [grande, setGrande] = useState<{ tamanho: number; arquivo: File } | null>(null);
  const [reduzindo, setReduzindo] = useState(false);

  const cheio = pdfs.length >= MAX_PDFS;
  const [reduzindoId, setReduzindoId] = useState<string | null>(null);

  // PDFs enviados antes de guardarmos o peso: descobre o tamanho uma vez e salva.
  const pesoTentado = useRef(false);
  useEffect(() => {
    if (pesoTentado.current) return;
    const faltam = pdfs.filter((p) => !p.bytes && p.url.includes("/object/public/cardapios-pdf/"));
    if (faltam.length === 0) return;
    pesoTentado.current = true;
    (async () => {
      const pesos = new Map<string, number>();
      for (const p of faltam) {
        try {
          const r = await fetch(p.url, { method: "HEAD" });
          const n = Number(r.headers.get("content-length"));
          if (r.ok && n > 0) pesos.set(p.id, n);
        } catch { /* sem peso, segue */ }
      }
      if (pesos.size > 0) onChange(pdfs.map((p) => (pesos.has(p.id) ? { ...p, bytes: pesos.get(p.id) } : p)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reduz um PDF que já está enviado: baixa, comprime no navegador e troca o arquivo.
  async function reduzirExistente(p: CardapioPdf) {
    setErro(null);
    setReduzindoId(p.id);
    try {
      const r = await fetch(p.url);
      if (!r.ok) throw new Error("baixar");
      const original = new File([await r.blob()], "cardapio.pdf", { type: "application/pdf" });
      const menor = await comprimirPdf(original, 4.5 * 1024 * 1024);
      if (!menor) throw new Error("comprimir");
      setReduzindoId(null);
      trocando.current = p.id;
      await enviar(menor);
      return;
    } catch {
      setErro("Não consegui reduzir esse PDF aqui. Use um compressor externo, ou divida o arquivo em dois.");
    }
    setReduzindoId(null);
  }

  // Apaga do armazenamento o PDF antigo quando ele é trocado ou removido, pra não acumular arquivo esquecido.
  async function apagarAntigo(antigo: string) {
    const marca = "/object/public/cardapios-pdf/";
    const i = antigo.indexOf(marca);
    if (i < 0) return;
    await supabase.storage.from("cardapios-pdf").remove([decodeURIComponent(antigo.slice(i + marca.length))]);
  }

  function nomePadrao() {
    return pdfs.length === 0 ? "Cardápio" : `PDF ${pdfs.length + 1}`;
  }

  function abrirEscolha(id: string | null) {
    trocando.current = id;
    input.current?.click();
  }

  async function enviar(f: File | null | undefined) {
    if (!f) return;
    setErro(null);
    setGrande(null);
    if (f.type !== "application/pdf") return setErro("Envie um arquivo PDF.");
    if (f.size > LIMITE_MB * 1024 * 1024) return setGrande({ tamanho: f.size, arquivo: f });
    setEnviando(true);
    const path = `${businessId}/cardapio-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("cardapios-pdf").upload(path, f, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
    setEnviando(false);
    if (input.current) input.current.value = "";
    if (error) return setErro("Não consegui enviar o PDF. Tente de novo.");
    const url = supabase.storage.from("cardapios-pdf").getPublicUrl(path).data.publicUrl;
    const alvo = trocando.current;
    trocando.current = null;
    if (alvo) {
      const antigo = pdfs.find((p) => p.id === alvo)?.url;
      onChange(pdfs.map((p) => (p.id === alvo ? { ...p, url, bytes: f.size } : p)));
      if (antigo) void apagarAntigo(antigo);
    } else {
      onChange([...pdfs, { id: novoId(), nome: nomePadrao(), url, bytes: f.size }]);
    }
  }

  async function reduzir() {
    if (!grande) return;
    const original = grande.arquivo;
    setReduzindo(true);
    setErro(null);
    try {
      const menor = await comprimirPdf(original, LIMITE_MB * 1024 * 1024 * 0.9);
      if (!menor) {
        setErro("Não consegui reduzir esse PDF aqui. Use um dos caminhos abaixo.");
      } else {
        setReduzindo(false);
        await enviar(menor);
        return;
      }
    } catch {
      setErro("Não consegui reduzir esse PDF aqui. Use um dos caminhos abaixo.");
    }
    setReduzindo(false);
  }

  function salvarLink() {
    const v = link.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) return setErro("Cole um link que comece com https://");
    setErro(null);
    onChange([...pdfs, { id: novoId(), nome: nomePadrao(), url: v }]);
    setModoLink(false);
    setLink("");
  }

  function remover(p: CardapioPdf) {
    onChange(pdfs.filter((x) => x.id !== p.id));
    void apagarAntigo(p.url);
  }

  function renomear(id: string, nome: string) {
    const limpo = nome.trim();
    const atual = pdfs.find((p) => p.id === id);
    if (!atual || atual.nome === limpo) return;
    onChange(pdfs.map((p) => (p.id === id ? { ...p, nome: limpo } : p)));
  }

  const temDrive = pdfs.some((p) => /drive\.google\.com|docs\.google\.com/i.test(p.url));

  return (
    <div className="mt-3 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
      <p className="text-[14.5px] font-medium">{pdfs.length === 0 ? "Envie seu cardápio em PDF" : pdfs.length === 1 ? "Seu PDF" : "Seus PDFs"}</p>
      <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">
        Cada PDF vira um botão para o cliente abrir. Dê um nome a cada um, como Cardápio, Bebidas ou Sobremesas. Até {MAX_PDFS} arquivos de {LIMITE_MB} MB.
      </p>

      {pdfs.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2.5">
          {pdfs.map((p) => (
            <li key={p.id} className="rounded-2xl bg-surface-soft p-3">
              <label className="block text-[11.5px] font-medium uppercase tracking-wide text-text-tertiary" htmlFor={`pdf-${p.id}`}>Nome do botão</label>
              <input
                id={`pdf-${p.id}`}
                defaultValue={p.nome}
                maxLength={40}
                placeholder="Ex.: Bebidas"
                onBlur={(e) => renomear(p.id, e.target.value)}
                className="mt-1 w-full rounded-xl border border-divider bg-surface-white px-3.5 py-2.5 text-[14px] outline-none focus:border-on-background"
              />
              {p.bytes != null && (
                <p className={`mt-2 text-[12.5px] leading-snug ${p.bytes > 5 * 1024 * 1024 ? "text-[#9A4F06]" : "text-text-tertiary"}`}>
                  {pesoLegivel(p.bytes)}
                  {p.bytes > 5 * 1024 * 1024 ? ". Acima de 5 MB demora para abrir no celular do cliente." : ""}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {p.bytes != null && p.bytes > 5 * 1024 * 1024 && (
                  <button type="button" onClick={() => reduzirExistente(p)} disabled={reduzindoId !== null || enviando} className="min-h-[44px] rounded-full border border-[#C2650A]/40 bg-[#FDEEDF] px-4 text-[13.5px] font-semibold text-[#9A4F06] disabled:opacity-60">
                    {reduzindoId === p.id ? "Reduzindo…" : "Reduzir este PDF"}
                  </button>
                )}
                <a href={p.url} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center rounded-full bg-surface-white px-4 text-[13.5px] font-medium ring-1 ring-black/[0.06]">Ver o PDF ↗</a>
                <button type="button" onClick={() => abrirEscolha(p.id)} disabled={enviando} className="min-h-[44px] rounded-full border border-divider bg-surface-white px-4 text-[13.5px] font-medium disabled:opacity-60">Trocar arquivo</button>
                <button type="button" onClick={() => remover(p)} className="min-h-[44px] rounded-full border border-divider bg-surface-white px-4 text-[13.5px] font-medium text-text-secondary">Remover</button>
                {onMontar && <button type="button" onClick={() => onMontar(p)} className="min-h-[44px] rounded-full bg-on-background px-4 text-[13.5px] font-semibold text-white active:scale-[0.98]"><span aria-hidden>✦ </span>Monte os itens</button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!cheio ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => abrirEscolha(null)} disabled={enviando} className={`min-h-[44px] rounded-full px-5 text-[13.5px] font-semibold disabled:opacity-60 ${pdfs.length === 0 ? "bg-on-background text-white" : "border border-divider"}`}>
            {enviando ? <span className="inline-flex items-center gap-2"><OrbiMiniVerde size={16} />Enviando…</span> : pdfs.length === 0 ? "Enviar PDF" : "Enviar outro PDF"}
          </button>
          <button type="button" onClick={() => setModoLink((m) => !m)} className="min-h-[44px] rounded-full border border-divider px-5 text-[13.5px] font-medium">
            {pdfs.length === 0 ? "Já tenho um link" : "Adicionar por link"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] leading-snug text-text-tertiary">Limite de {MAX_PDFS} PDFs. Remova um para enviar outro.</p>
      )}
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => enviar(e.target.files?.[0])} />

      {modoLink && !cheio && (
        <div className="mt-3">
          <div className="flex gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." inputMode="url" className="min-w-0 flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
            <button type="button" onClick={salvarLink} className="min-h-[44px] rounded-full bg-on-background px-5 text-[13.5px] font-semibold text-white">Salvar</button>
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-text-tertiary">Link do Google Drive: deixe como &quot;Qualquer pessoa com o link&quot;, senão o cliente vê um pedido de acesso. Enviar o arquivo aqui é mais seguro.</p>
        </div>
      )}
      {temDrive && <p className="mt-2 text-[12px] leading-snug text-[#9A4F06]">Um dos PDFs é link do Drive. Se o cliente ver &quot;pedir acesso&quot;, mude o compartilhamento para &quot;Qualquer pessoa com o link&quot; ou envie o arquivo aqui.</p>}
      {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}

      {grande !== null && (
        <div role="alert" className="mt-3 rounded-2xl bg-[#FDEEDF] p-3.5 ring-1 ring-[#C2650A]/25">
          <p className="text-[14px] font-semibold text-[#9A4F06]">Esse PDF tem {(grande.tamanho / 1024 / 1024).toFixed(1).replace(".", ",")} MB e o limite é {LIMITE_MB} MB</p>
          <button type="button" onClick={reduzir} disabled={reduzindo} className="mt-3 min-h-[44px] rounded-full bg-on-background px-5 text-[13.5px] font-semibold text-white disabled:opacity-60">
            {reduzindo ? "Reduzindo…" : "Reduzir e enviar automático"}
          </button>
          <p className="mt-1.5 text-[12px] leading-snug text-[#9A4F06]/90">Funciona bem para cardápio feito de imagem. Se o seu PDF tem texto para copiar ou links, a redução transforma cada página em imagem.</p>
          <p className="mt-3 text-[12.5px] leading-snug text-[#9A4F06]/90">Arquivo grande demora pra baixar no celular do cliente, principalmente com internet fraca, e muita gente desiste. Um cardápio bem feito costuma ficar abaixo de 5 MB. Ou reduza por conta própria:</p>
          <ol className="mt-2 list-decimal pl-5 text-[12.5px] leading-relaxed text-[#9A4F06]/90">
            <li>Abra o PDF em um compressor grátis, como ilovepdf.com/pt/comprimir_pdf ou smallpdf.com/pt/comprimir-pdf, e escolha compressão recomendada.</li>
            <li>No Mac: abra no Preview, vá em Arquivo, Exportar, e em Filtro Quartz escolha &quot;Reduce File Size&quot;.</li>
            <li>No Canva: Compartilhar, Baixar, PDF para impressão desmarcado e qualidade &quot;Menor tamanho&quot;.</li>
          </ol>
          <p className="mt-2 text-[12.5px] leading-snug text-[#9A4F06]/90">Se mesmo assim passar, divida em dois PDFs (por exemplo, Comidas e Bebidas) e envie os dois aqui, cada um com o seu nome.</p>
        </div>
      )}
    </div>
  );
}
