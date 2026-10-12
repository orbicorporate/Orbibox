"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LIMITE_MB = 10;

/**
 * PDF do cardápio para o cliente baixar. O principal é enviar o arquivo (fica
 * guardado aqui, abre e baixa direto). Quem já tem o PDF num site ou no Drive
 * pode colar o link, mas link do Drive costuma pedir permissão e abrir uma
 * página do Google em vez de baixar, então avisamos.
 */
export function PdfCardapio({ businessId, url, onChange }: { businessId: string; url: string; onChange: (url: string) => void }) {
  const supabase = useRef(createClient()).current;
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modoLink, setModoLink] = useState(false);
  const [link, setLink] = useState("");
  const [grande, setGrande] = useState<number | null>(null);

  // Apaga do armazenamento o PDF antigo quando ele é trocado ou removido, pra não acumular arquivo esquecido.
  async function apagarAntigo(antigo: string) {
    const marca = "/object/public/cardapios-pdf/";
    const i = antigo.indexOf(marca);
    if (i < 0) return;
    await supabase.storage.from("cardapios-pdf").remove([decodeURIComponent(antigo.slice(i + marca.length))]);
  }

  async function enviar(f: File | null | undefined) {
    if (!f) return;
    setErro(null);
    setGrande(null);
    if (f.type !== "application/pdf") return setErro("Envie um arquivo PDF.");
    if (f.size > LIMITE_MB * 1024 * 1024) return setGrande(f.size);
    setEnviando(true);
    const path = `${businessId}/cardapio-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("cardapios-pdf").upload(path, f, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
    setEnviando(false);
    if (input.current) input.current.value = "";
    if (error) return setErro("Não consegui enviar o PDF. Tente de novo.");
    const antigo = url;
    onChange(supabase.storage.from("cardapios-pdf").getPublicUrl(path).data.publicUrl);
    if (antigo) void apagarAntigo(antigo);
  }

  function salvarLink() {
    const v = link.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) return setErro("Cole um link que comece com https://");
    setErro(null);
    onChange(v);
    setModoLink(false);
    setLink("");
  }

  const ehDrive = /drive\.google\.com|docs\.google\.com/i.test(url);

  return (
    <div className="mt-4 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
      <p className="text-[14.5px] font-medium">Cardápio em PDF</p>
      <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">Aparece um botão &quot;Baixar cardápio em PDF&quot; na tela do cardápio.</p>

      {url ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a href={url} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center rounded-full bg-surface-soft px-4 text-[13.5px] font-medium">Ver o PDF atual ↗</a>
          <button type="button" onClick={() => input.current?.click()} className="min-h-[44px] rounded-full border border-divider px-4 text-[13.5px] font-medium">Trocar</button>
          <button type="button" onClick={() => { const antigo = url; onChange(""); void apagarAntigo(antigo); }} className="min-h-[44px] rounded-full border border-divider px-4 text-[13.5px] font-medium text-text-secondary">Remover</button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={enviando} className="min-h-[44px] rounded-full bg-on-background px-5 text-[13.5px] font-semibold text-white disabled:opacity-60">{enviando ? "Enviando…" : "Enviar PDF"}</button>
          <button type="button" onClick={() => setModoLink((m) => !m)} className="min-h-[44px] rounded-full border border-divider px-5 text-[13.5px] font-medium">Já tenho um link</button>
        </div>
      )}
      <input ref={input} type="file" accept="application/pdf" className="hidden" onChange={(e) => enviar(e.target.files?.[0])} />

      {modoLink && !url && (
        <div className="mt-3">
          <div className="flex gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." inputMode="url" className="min-w-0 flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
            <button type="button" onClick={salvarLink} className="min-h-[44px] rounded-full bg-on-background px-5 text-[13.5px] font-semibold text-white">Salvar</button>
          </div>
          <p className="mt-1.5 text-[12px] leading-snug text-text-tertiary">Link do Google Drive: deixe como &quot;Qualquer pessoa com o link&quot;, senão o cliente vê um pedido de acesso. Enviar o arquivo aqui é mais seguro.</p>
        </div>
      )}
      {url && ehDrive && <p className="mt-2 text-[12px] leading-snug text-[#9A4F06]">Esse é um link do Drive. Se o cliente ver &quot;pedir acesso&quot;, mude o compartilhamento para &quot;Qualquer pessoa com o link&quot; ou envie o arquivo aqui.</p>}
      {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}

      {grande !== null && (
        <div role="alert" className="mt-3 rounded-2xl bg-[#FDEEDF] p-3.5 ring-1 ring-[#C2650A]/25">
          <p className="text-[14px] font-semibold text-[#9A4F06]">Esse PDF tem {(grande / 1024 / 1024).toFixed(1).replace(".", ",")} MB e o limite é {LIMITE_MB} MB</p>
          <p className="mt-1 text-[12.5px] leading-snug text-[#9A4F06]/90">Arquivo grande demora pra baixar no celular do cliente, principalmente com internet fraca, e muita gente desiste. Um cardápio bem feito costuma ficar abaixo de 5 MB. Como reduzir:</p>
          <ol className="mt-2 list-decimal pl-5 text-[12.5px] leading-relaxed text-[#9A4F06]/90">
            <li>Abra o PDF em um compressor grátis, como ilovepdf.com/pt/comprimir_pdf ou smallpdf.com/pt/comprimir-pdf, e escolha compressão recomendada.</li>
            <li>No Mac: abra no Preview, vá em Arquivo, Exportar, e em Filtro Quartz escolha &quot;Reduce File Size&quot;.</li>
            <li>No Canva: Compartilhar, Baixar, PDF para impressão desmarcado e qualidade &quot;Menor tamanho&quot;.</li>
          </ol>
          <p className="mt-2 text-[12.5px] leading-snug text-[#9A4F06]/90">Se mesmo assim passar, divida em dois PDFs (por exemplo, Comidas e Bebidas) e envie o link de um deles, ou use &quot;Já tenho um link&quot; com o arquivo no seu site.</p>
        </div>
      )}
    </div>
  );
}
