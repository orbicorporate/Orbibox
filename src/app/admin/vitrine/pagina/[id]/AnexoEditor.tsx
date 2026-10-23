"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { nomeArquivoUnico, pesoLegivel } from "@/lib/cardapio";
import { otimizarPdf } from "@/lib/comprimirPdf";
import { LIMITE_IMAGEM, LIMITE_PDF, TIPOS_ANEXO, tituloPadraoAnexo, type Anexo } from "@/lib/anexo";

/**
 * Anexo da página do produto: o dono sobe um PDF ou uma imagem e o visitante
 * vê um botão que abre o arquivo. PDF vai para o storage de PDFs, imagem para o de imagens.
 */
export function AnexoEditor({ businessId, anexo, onChange }: { businessId: string; anexo: Anexo | null; onChange: (a: Anexo | null) => void }) {
  const supabase = useRef(createClient()).current;
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [titulo, setTitulo] = useState(anexo?.titulo ?? "");

  async function enviar(entrada: File) {
    let f = entrada;
    setErro(null);
    setAviso(null);
    const pdf = f.type === "application/pdf";
    const imagem = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(f.type);
    if (!pdf && !imagem) return setErro("Escolha um PDF ou uma imagem (PNG, JPEG ou WebP).");
    if (pdf) {
      setEnviando(true);
      const r = await otimizarPdf(f);
      if (r.reduziu) setAviso(`A Orbi reduziu o PDF de ${pesoLegivel(f.size)} para ${pesoLegivel(r.arquivo.size)}.`);
      f = r.arquivo;
      setEnviando(false);
    }
    if (pdf && f.size > LIMITE_PDF) return setErro(`PDF muito grande (${pesoLegivel(f.size)}). O limite é 10 MB.`);
    if (imagem && f.size > LIMITE_IMAGEM) return setErro(`Imagem muito grande (${pesoLegivel(f.size)}). O limite é 20 MB.`);
    setEnviando(true);
    const bucket = pdf ? "cardapios-pdf" : "box-images";
    const ext = pdf ? "pdf" : f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : f.type === "image/gif" ? "gif" : "jpg";
    const path = `${businessId}/${nomeArquivoUnico("anexo", ext)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, f, { cacheControl: "31536000", upsert: false, contentType: f.type });
    setEnviando(false);
    if (error) return setErro("Não consegui enviar o arquivo. Tente de novo.");
    const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    onChange({ url, tipo: pdf ? "pdf" : "imagem", titulo: titulo.trim(), bytes: f.size });
  }

  return (
    <div className="mt-5">
      <p className="text-[13px] font-semibold text-text-secondary">Arquivo <span className="font-normal text-text-tertiary">(opcional)</span></p>
      <input
        ref={input}
        type="file"
        accept={TIPOS_ANEXO}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviar(f); e.target.value = ""; }}
      />
      {!anexo ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={enviando}
          className="mt-1.5 flex min-h-[72px] w-full items-center gap-3 rounded-full border border-divider bg-white p-2 pr-4 text-left shadow-[0_6px_18px_rgba(17,19,24,0.08)] active:scale-[0.99] disabled:opacity-60"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[13px] font-bold tracking-wide text-white" style={{ background: "linear-gradient(135deg,#E04A4F 0%,#C4282D 48%,#8A1D22 100%)", boxShadow: "0 8px 20px -8px rgba(138,29,34,0.55)" }}>PDF</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-tight">{enviando ? "Enviando…" : "Anexar PDF ou imagem"}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">Vira um botão na página</span>
          </span>
          <span className="shrink-0 rounded-full bg-on-background px-4 py-2 text-[12.5px] font-semibold text-white">Anexar</span>
        </button>
      ) : (
        <div className="mt-1.5 rounded-2xl border border-divider bg-surface-white p-3">
          <p className="px-1 text-[12.5px] text-text-secondary">{anexo.tipo === "pdf" ? "PDF" : "Imagem"}{anexo.bytes ? ` · ${pesoLegivel(anexo.bytes)}` : ""}</p>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => onChange({ ...anexo, titulo: titulo.trim() })}
            placeholder={`Texto do botão (ex.: ${tituloPadraoAnexo(anexo.tipo)})`}
            maxLength={60}
            className="mt-1.5 w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
          />
          <div className="mt-2.5 flex gap-2">
            <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-surface-soft px-4 text-[13.5px] font-medium">Ver</a>
            <button type="button" onClick={() => input.current?.click()} disabled={enviando} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium disabled:opacity-60">{enviando ? "Enviando…" : "Trocar"}</button>
            <button type="button" onClick={() => { setTitulo(""); onChange(null); }} disabled={enviando} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-red-600 disabled:opacity-60">Remover</button>
          </div>
        </div>
      )}
      {aviso && !erro && <p className="mt-1.5 px-1 text-[13px] text-text-secondary">{aviso}</p>}
      {erro && <p role="alert" className="mt-1.5 px-1 text-[13px] text-red-600">{erro}</p>}
    </div>
  );
}
