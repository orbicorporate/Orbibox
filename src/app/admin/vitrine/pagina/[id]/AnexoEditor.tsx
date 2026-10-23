"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { nomeArquivoUnico, pesoLegivel } from "@/lib/cardapio";
import { otimizarPdf } from "@/lib/comprimirPdf";
import { LIMITE_IMAGEM, LIMITE_PDF, MAX_ANEXOS, TIPOS_ANEXO, tituloPadraoAnexo, type Anexo } from "@/lib/anexo";

/**
 * Anexos da página do produto: o dono sobe até 4 arquivos (PDF ou imagem) e o visitante
 * vê um botão para cada um. PDF vai para o storage de PDFs, imagem para o de imagens.
 * PDF pesado é reduzido sozinho antes de enviar.
 */
export function AnexoEditor({ businessId, anexos, onChange }: { businessId: string; anexos: Anexo[]; onChange: (a: Anexo[]) => void }) {
  const supabase = useRef(createClient()).current;
  const input = useRef<HTMLInputElement>(null);
  const trocando = useRef<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviarUm(entrada: File): Promise<Anexo | null> {
    let f = entrada;
    const pdf = f.type === "application/pdf";
    const imagem = ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(f.type);
    if (!pdf && !imagem) { setErro("Escolha um PDF ou uma imagem (PNG, JPEG ou WebP)."); return null; }
    if (pdf) {
      const r = await otimizarPdf(f);
      if (r.reduziu) setAviso(`A Orbi reduziu o PDF de ${pesoLegivel(f.size)} para ${pesoLegivel(r.arquivo.size)}.`);
      f = r.arquivo;
    }
    if (pdf && f.size > LIMITE_PDF) { setErro(`PDF muito grande (${pesoLegivel(f.size)}). O limite é 10 MB.`); return null; }
    if (imagem && f.size > LIMITE_IMAGEM) { setErro(`Imagem muito grande (${pesoLegivel(f.size)}). O limite é 20 MB.`); return null; }
    const bucket = pdf ? "cardapios-pdf" : "box-images";
    const ext = pdf ? "pdf" : f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : f.type === "image/gif" ? "gif" : "jpg";
    const path = `${businessId}/${nomeArquivoUnico("anexo", ext)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, f, { cacheControl: "31536000", upsert: false, contentType: f.type });
    if (error) { setErro("Não consegui enviar o arquivo. Tente de novo."); return null; }
    const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    return { url, tipo: pdf ? "pdf" : "imagem", titulo: "", bytes: f.size };
  }

  async function escolher(files: FileList | null) {
    const escolhidos = files ? Array.from(files) : [];
    if (input.current) input.current.value = "";
    if (escolhidos.length === 0) return;
    setErro(null);
    setAviso(null);
    setEnviando(true);
    const idx = trocando.current;
    trocando.current = null;
    let lista = [...anexos];
    if (idx !== null) {
      const novo = await enviarUm(escolhidos[0]);
      if (novo) lista[idx] = { ...novo, titulo: lista[idx]?.titulo ?? "" };
    } else {
      const vagas = MAX_ANEXOS - lista.length;
      if (escolhidos.length > vagas) setAviso(`O limite é ${MAX_ANEXOS} arquivos. Enviei só os ${vagas} primeiros.`);
      for (const f of escolhidos.slice(0, vagas)) {
        const novo = await enviarUm(f);
        if (novo) lista = [...lista, novo];
      }
    }
    setEnviando(false);
    if (lista.length !== anexos.length || lista.some((a, i) => a !== anexos[i])) onChange(lista);
  }

  function mudarTitulo(i: number, titulo: string) {
    const atual = anexos[i];
    if (!atual || atual.titulo === titulo) return;
    onChange(anexos.map((a, n) => (n === i ? { ...a, titulo } : a)));
  }

  return (
    <div className="mt-5">
      <p className="text-[13px] font-semibold text-text-secondary">Arquivos <span className="font-normal text-text-tertiary">(opcional, até {MAX_ANEXOS})</span></p>
      <input ref={input} type="file" accept={TIPOS_ANEXO} multiple className="hidden" onChange={(e) => void escolher(e.target.files)} />

      {anexos.map((anexo, i) => (
        <CartaoAnexo
          key={`${anexo.url}-${i}`}
          anexo={anexo}
          enviando={enviando}
          onTitulo={(t) => mudarTitulo(i, t)}
          onTrocar={() => { trocando.current = i; input.current?.click(); }}
          onRemover={() => onChange(anexos.filter((_, n) => n !== i))}
        />
      ))}

      {anexos.length < MAX_ANEXOS && (
        <button
          type="button"
          onClick={() => { trocando.current = null; input.current?.click(); }}
          disabled={enviando}
          className="mt-1.5 flex min-h-[72px] w-full items-center gap-3 rounded-full border border-divider bg-white p-2 pr-4 text-left shadow-[0_6px_18px_rgba(17,19,24,0.08)] active:scale-[0.99] disabled:opacity-60"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[13px] font-bold tracking-wide text-white" style={{ background: "linear-gradient(135deg,#E04A4F 0%,#C4282D 48%,#8A1D22 100%)", boxShadow: "0 8px 20px -8px rgba(138,29,34,0.55)" }}>PDF</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-tight">{enviando ? "Enviando…" : anexos.length === 0 ? "Anexar PDF ou imagem" : "Anexar outro arquivo"}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{anexos.length === 0 ? "Vira um botão na página" : `${anexos.length} de ${MAX_ANEXOS}`}</span>
          </span>
          <span className="shrink-0 rounded-full bg-on-background px-4 py-2 text-[12.5px] font-semibold text-white">Anexar</span>
        </button>
      )}

      {aviso && !erro && <p className="mt-1.5 px-1 text-[13px] text-text-secondary">{aviso}</p>}
      {erro && <p role="alert" className="mt-1.5 px-1 text-[13px] text-red-600">{erro}</p>}
    </div>
  );
}

function CartaoAnexo({ anexo, enviando, onTitulo, onTrocar, onRemover }: { anexo: Anexo; enviando: boolean; onTitulo: (t: string) => void; onTrocar: () => void; onRemover: () => void }) {
  const [titulo, setTitulo] = useState(anexo.titulo);
  return (
    <div className="mt-1.5 rounded-2xl border border-divider bg-surface-white p-3">
      <p className="px-1 text-[12.5px] text-text-secondary">{anexo.tipo === "pdf" ? "PDF" : "Imagem"}{anexo.bytes ? ` · ${pesoLegivel(anexo.bytes)}` : ""}</p>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onBlur={() => onTitulo(titulo.trim())}
        placeholder={`Texto do botão (ex.: ${tituloPadraoAnexo(anexo.tipo)})`}
        maxLength={60}
        className="mt-1.5 w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
      />
      <div className="mt-2.5 flex gap-2">
        <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-surface-soft px-4 text-[13.5px] font-medium">Ver</a>
        <button type="button" onClick={onTrocar} disabled={enviando} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium disabled:opacity-60">{enviando ? "Enviando…" : "Trocar"}</button>
        <button type="button" onClick={onRemover} disabled={enviando} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-red-600 disabled:opacity-60">Remover</button>
      </div>
    </div>
  );
}
