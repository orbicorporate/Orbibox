"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { OrbiSimbolo } from "@/components/orbi/OrbiSimbolo";
import { OrbiMiniVerde } from "@/components/orbi/OrbiConcluido";
import { MinhaGaleriaPicker } from "./MinhaGaleriaPicker";
import { reduzirFoto } from "@/lib/lista";

type Ref = { id: string; file: File; previa: string };
const MAX_REFS = 3;

/**
 * Gerador de imagem em formato de conversa: o dono descreve o que quer, anexa
 * imagens de referência (opcional) e a Orbi cria. Dá pra pedir ajuste em cima
 * do resultado, que vira a referência da próxima rodada.
 */
export function GeradorImagemSheet({
  businessId,
  assunto,
  formato,
  aspect,
  onUsar,
  onIndisponivel,
  onFechar,
  refInicialUrl,
  sugestoes,
  edicao = false,
}: {
  businessId: string;
  assunto: string;
  formato: string;
  aspect: number;
  onUsar: (arquivo: File) => void;
  onIndisponivel: () => void;
  onFechar: () => void;
  /** Foto que já nasce anexada como referência (editar uma foto que já existe). */
  refInicialUrl?: string;
  /** Pedidos prontos que preenchem o campo de texto com um toque. */
  sugestoes?: string[];
  edicao?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [refs, setRefs] = useState<Ref[]>([]);
  const [gerando, setGerando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [galeria, setGaleria] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && !gerando && onFechar();
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", tecla);
    };
  }, [onFechar, gerando]);

  async function addRef(file: File) {
    setErro(null);
    if (!file.type.startsWith("image/")) return setErro("Escolha um arquivo de imagem.");
    try {
      const reduzida = await reduzirFoto(file, 1024);
      const f = new File([reduzida], "ref.jpg", { type: reduzida.type || "image/jpeg" });
      setRefs((r) => (r.length >= MAX_REFS ? r : [...r, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, file: f, previa: URL.createObjectURL(f) }]));
    } catch {
      setErro("Não consegui abrir essa imagem.");
    }
  }

  async function refDaGaleria(url: string) {
    setGaleria(false);
    try {
      const b = await (await fetch(url)).blob();
      await addRef(new File([b], "ref.jpg", { type: b.type || "image/jpeg" }));
    } catch {
      setErro("Não consegui abrir essa foto da galeria.");
    }
  }

  const refCarregada = useRef(false);
  useEffect(() => {
    if (!refInicialUrl || refCarregada.current) return;
    refCarregada.current = true;
    void refDaGaleria(refInicialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refInicialUrl]);

  function tirarRef(id: string) {
    setRefs((r) => {
      const alvo = r.find((x) => x.id === id);
      if (alvo) URL.revokeObjectURL(alvo.previa);
      return r.filter((x) => x.id !== id);
    });
  }

  async function gerar() {
    if (texto.trim().length < 3 || gerando) return;
    setErro(null);
    setGerando(true);
    try {
      const corpo = new FormData();
      corpo.append("businessId", businessId);
      corpo.append("assunto", assunto);
      corpo.append("formato", formato);
      corpo.append("instrucao", texto.trim());
      refs.forEach((r) => corpo.append("imagem", r.file));
      const r = await fetch("/api/gerar-capa", { method: "POST", body: corpo });
      const json = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (r.status === 501) {
        onIndisponivel();
        onFechar();
        return;
      }
      if (!r.ok || !json.url) return setErro(json.error ?? "A IA não conseguiu agora. Tente de novo.");
      setResultado(json.url);
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  async function usar() {
    if (!resultado) return;
    try {
      const b = await (await fetch(resultado)).blob();
      onUsar(new File([b], "capa.jpg", { type: b.type || "image/webp" }));
    } catch {
      setErro("Não consegui abrir a imagem criada.");
    }
  }

  // Pede ajuste: a imagem criada vira referência e o foco volta pro campo de texto.
  async function ajustar() {
    if (!resultado) return;
    try {
      const b = await (await fetch(resultado)).blob();
      const f = new File([b], "ref.jpg", { type: b.type || "image/webp" });
      setRefs([{ id: `${Date.now()}-r`, file: f, previa: URL.createObjectURL(f) }]);
      setResultado(null);
      setTexto("");
      window.setTimeout(() => campo.current?.focus(), 50);
    } catch {
      setErro("Não consegui abrir a imagem criada.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={edicao ? "Criar capa com a Orbi" : "Criar imagem com a Orbi"}>
      <button aria-label="Fechar" onClick={() => !gerando && onFechar()} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-3xl bg-surface-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center gap-3 border-b border-divider px-5 py-3.5">
          <OrbiSimbolo size={30} />
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-on-background">{edicao ? "Criar capa com a Orbi" : "Criar imagem com a Orbi"}</p>
          <button type="button" onClick={onFechar} disabled={gerando} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px] text-text-secondary disabled:opacity-50">✕</button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {resultado ? (
            <div>
              <div className="overflow-hidden rounded-2xl bg-surface-soft" style={{ aspectRatio: aspect, maxHeight: 360 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultado} alt="Imagem criada pela Orbi" className="h-full w-full object-cover" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={usar} className="min-h-[46px] flex-1 rounded-full bg-on-background px-5 text-[14px] font-semibold text-white active:scale-[0.98]">Usar esta imagem</button>
                <button type="button" onClick={ajustar} className="min-h-[46px] rounded-full bg-surface-soft px-5 text-[14px] font-medium text-text-secondary active:scale-[0.98]">Pedir ajuste</button>
              </div>
              <button type="button" onClick={() => setResultado(null)} className="mt-2 min-h-[40px] rounded-full px-2 text-[13px] text-text-tertiary">Começar de novo</button>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="gerador-prompt" className="text-[13px] font-medium text-on-background">{edicao ? "O que você quer ver na capa?" : "O que você quer ver na imagem?"}</label>
                {sugestoes && sugestoes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sugestoes.map((t) => (
                      <button key={t} type="button" disabled={gerando} onClick={() => { setTexto(t); window.setTimeout(() => campo.current?.focus(), 30); }} className="min-h-[38px] rounded-full bg-surface-soft px-3.5 text-[12.5px] font-medium text-text-secondary disabled:opacity-50">{t.split(".")[0]}</button>
                    ))}
                  </div>
                )}
                <textarea
                  id="gerador-prompt"
                  ref={campo}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  disabled={gerando}
                  rows={4}
                  maxLength={900}
                  placeholder={refs.length > 0 ? "Ex.: a logo anexada em destaque, fotografia do produto poética e minimalista com fundo claro" : "Ex.: fotografia do produto poética e minimalista com fundo claro"}
                  className="mt-2 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14.5px] leading-relaxed outline-none focus:border-on-background disabled:opacity-60"
                />
              </div>

              <div>
                <p className="text-[13px] font-medium text-on-background">Imagens de referência <span className="font-normal text-text-tertiary">(até {MAX_REFS})</span></p>
                <p className="mt-1.5 rounded-2xl bg-[#FFF6DB] px-3.5 py-2.5 text-[13px] leading-snug text-[#6B4A00]">
                  <span aria-hidden>📸 </span>Envie a foto do seu produto. É importante ter ela para a Orbi usar: a imagem sai muito mais fiel ao que você vende.
                </p>
                <p className="mt-1.5 text-[12px] text-text-tertiary">Pode ser também a logo ou um estilo que você gosta. Diga no texto como usar cada uma.</p>
                <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void addRef(f); e.target.value = ""; }} />
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  {refs.map((r) => (
                    <span key={r.id} className="relative h-16 w-16 overflow-hidden rounded-xl bg-surface-soft ring-1 ring-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.previa} alt="" className="h-full w-full object-contain" />
                      <button type="button" onClick={() => tirarRef(r.id)} disabled={gerando} aria-label="Tirar referência" className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-[10px] text-white">✕</button>
                    </span>
                  ))}
                  {refs.length < MAX_REFS && (
                    <>
                      <button type="button" onClick={() => entrada.current?.click()} disabled={gerando} className="orbi-gradient min-h-[46px] rounded-full px-5 text-[14px] font-semibold text-on-background shadow-[0_8px_20px_-10px_rgba(110,197,214,0.9)] transition-transform active:scale-[0.97] disabled:opacity-60">Enviar foto do produto</button>
                      <button type="button" onClick={() => setGaleria(true)} disabled={gerando} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary disabled:opacity-60">Minha galeria</button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
          {erro && <p role="alert" className="text-[12.5px] text-red-600">{erro}</p>}
        </div>

        {!resultado && (
          <div className="border-t border-divider px-5 py-3.5">
            <button
              type="button"
              onClick={gerar}
              disabled={gerando || texto.trim().length < 3}
              className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-on-background text-[14.5px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {gerando ? (<><OrbiMiniVerde size={16} />{edicao ? "Criando a capa… pode levar até 1 minuto" : "Criando… pode levar até 1 minuto"}</>) : edicao ? "Criar capa" : "Criar imagem"}
            </button>
          </div>
        )}
      </div>

      {galeria && <MinhaGaleriaPicker camada="z-[140]" businessId={businessId} onFechar={() => setGaleria(false)} onEscolher={(url) => void refDaGaleria(url)} />}
    </div>,
    document.body,
  );
}
