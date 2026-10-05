"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buscarAjuda, sugestoesDaTela, type Ajuda } from "@/lib/ajuda";
import { OrbiParticleSphere } from "./OrbiParticleSphere";

type Resposta = { pergunta: string; passos: string[]; acao?: { rotulo: string; href: string } | null };

/**
 * Folha de ajuda da Orbi no painel. A pessoa pergunta do jeito dela ("como
 * coloco preço?") e recebe passos curtos com um botão que leva direto pra
 * onde aquilo se faz. Sugestões mudam conforme a tela.
 */
export function AjudaOrbi({ aberto, onFechar, orbiColors, extra }: { aberto: boolean; onFechar: () => void; orbiColors: string[] | null; extra?: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const [texto, setTexto] = useState("");
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function mostrar(a: Ajuda) {
    setErro(null);
    setResposta({ pergunta: a.pergunta, passos: a.passos, acao: a.acao });
  }

  async function perguntar(e?: React.FormEvent) {
    e?.preventDefault();
    const q = texto.trim();
    if (!q) return;
    const local = buscarAjuda(q);
    if (local) {
      mostrar(local);
      setTexto("");
      return;
    }
    setPensando(true);
    setErro(null);
    try {
      const r = await fetch("/api/ajuda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pergunta: q }) });
      const d = await r.json();
      if (!r.ok || !Array.isArray(d.passos) || d.passos.length === 0) throw new Error();
      setResposta({ pergunta: q, passos: d.passos, acao: d.href ? { rotulo: d.rotulo || "Abrir", href: d.href } : null });
      setTexto("");
    } catch {
      setErro("Não consegui responder agora. Tente com outras palavras ou escolha uma das sugestões.");
    } finally {
      setPensando(false);
    }
  }

  if (!aberto || typeof document === "undefined") return null;
  const sugestoes = sugestoesDaTela(pathname);

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-end justify-center bg-black/40 backdrop-blur-[2px]" onClick={onFechar}>
      <div
        role="dialog"
        aria-label="Ajuda da Orbi"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[86vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-[#F3F3F0] px-5 pb-8 pt-3"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/15" />
        <div className="flex items-center gap-3">
          <OrbiParticleSphere size={40} colors={orbiColors ?? undefined} className="rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold leading-tight">Precisa de ajuda?</p>
            <p className="text-[13px] text-text-secondary">Pergunte do seu jeito. Eu mostro o caminho.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-text-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={perguntar} className="mt-4 flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 ring-1 ring-black/[0.07]">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex: como coloco preço?"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            enterKeyHint="send"
          />
          <button type="submit" disabled={pensando || !texto.trim()} className="rounded-full bg-on-background px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40">
            {pensando ? "…" : "Perguntar"}
          </button>
        </form>
        {erro && <p className="mt-2 px-1 text-[12.5px] text-red-600">{erro}</p>}

        {resposta && (
          <div className="mt-4 rounded-[22px] bg-white p-4 shadow-[0_10px_24px_-14px_rgba(17,19,24,0.3)] ring-1 ring-black/[0.06]">
            <p className="text-[14px] font-semibold">{resposta.pergunta}</p>
            <ol className="mt-3 flex flex-col gap-2.5">
              {resposta.passos.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-[14px] leading-snug">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-on-background text-[11px] font-semibold text-white">{i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
            {resposta.acao && (
              <Link href={resposta.acao.href} onClick={onFechar} className="mt-4 flex w-full items-center justify-center rounded-full bg-button-primary py-3 text-[14px] font-medium text-white">
                {resposta.acao.rotulo} →
              </Link>
            )}
          </div>
        )}

        <p className="mt-5 px-1 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">{resposta ? "Outras dúvidas" : "Dúvidas comuns aqui"}</p>
        <div className="mt-2 flex flex-col gap-2">
          {sugestoes.filter((a) => a.pergunta !== resposta?.pergunta).map((a) => (
            <button key={a.id} type="button" onClick={() => mostrar(a)} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-[14px] ring-1 ring-black/[0.05]">
              <span>{a.pergunta}</span>
              <span className="text-text-tertiary">›</span>
            </button>
          ))}
        </div>

        {extra && <div className="mt-5">{extra}</div>}
      </div>
    </div>,
    document.body,
  );
}
