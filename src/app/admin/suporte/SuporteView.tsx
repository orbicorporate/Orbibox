"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { AJUDAS, buscarAjuda } from "@/lib/ajuda";

type Msg = { role: "user" | "assistant"; content: string; href?: string | null; rotulo?: string | null };

const SUGESTOES = ["publicar", "novo-item", "whatsapp", "compartilhar"].map((id) => AJUDAS.find((a) => a.id === id)!).filter(Boolean);

// Resposta da Orbi: linhas "1. ..." viram passos com número; o resto é texto corrido.
function RespostaOrbi({ texto }: { texto: string }) {
  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="flex flex-col gap-2.5">
      {linhas.map((l, i) => {
        const m = l.match(/^(\d+)[.)]\s*(.*)$/);
        return m ? (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-on-background text-[12px] font-semibold text-white">{m[1]}</span>
            <p className="min-w-0 flex-1 text-[14.5px] leading-snug">{m[2]}</p>
          </div>
        ) : (
          <p key={i} className="text-[14.5px] leading-snug">{l}</p>
        );
      })}
    </div>
  );
}

export function SuporteView({ whatsappHref, negocio, orbiColors }: { whatsappHref: string; negocio: string; orbiColors: string[] | null }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  function rolar() { setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50); }

  async function enviar(pergunta: string) {
    const q = pergunta.trim();
    if (!q || pensando) return;
    setErro(null);
    setTexto("");
    const novas: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(novas);
    rolar();
    const local = buscarAjuda(q);
    if (local) {
      setMsgs([...novas, { role: "assistant", content: local.passos.map((p, i) => `${i + 1}. ${p}`).join("\n"), href: local.acao?.href, rotulo: local.acao?.rotulo }]);
      rolar();
      return;
    }
    setPensando(true);
    try {
      const r = await fetch("/api/suporte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensagens: novas.map((m) => ({ role: m.role, content: m.content })) }) });
      const d = await r.json();
      if (!r.ok || !d.resposta) throw new Error();
      setMsgs([...novas, { role: "assistant", content: d.resposta, href: d.href, rotulo: d.rotulo }]);
    } catch {
      setErro("Não consegui responder agora. Tente de novo ou chame o suporte no WhatsApp.");
    } finally {
      setPensando(false);
      rolar();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Suporte</h1>
        <p className="mt-1 text-[14px] text-text-secondary">Fale com a gente ou tire a dúvida com a Orbi.</p>
      </div>

      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[24px] bg-[#1F9E4C] p-4 text-white shadow-[0_14px_28px_-16px_rgba(31,158,76,0.7)] transition-transform active:scale-[.98]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3 21l1.4-5.5A8.5 8.5 0 1 1 21 12Z" /></svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold leading-tight">Falar com o suporte</span>
          <span className="block text-[13px] text-white/80">Nume Company no WhatsApp</span>
        </span>
        <span aria-hidden>→</span>
      </a>

      <div className="overflow-hidden rounded-[26px] bg-white ring-[0.5px] ring-black/10">
        <div className="flex items-center gap-3 p-4">
          <OrbiParticleSphere size={44} colors={orbiColors ?? undefined} className="shrink-0 rounded-full" />
          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-tight">Pergunte à Orbi</p>
            <p className="mt-0.5 truncate text-[12.5px] text-text-secondary">{negocio.trim() ? `Eu te ensino conforme o ${negocio.trim()}` : "Eu te ensino passo a passo"}</p>
          </div>
        </div>

        {msgs.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-divider bg-surface-soft/60 p-4">
            {msgs.map((m, i) => m.role === "user" ? (
              <p key={i} className="ml-auto max-w-[85%] rounded-[20px] rounded-br-md bg-on-background px-4 py-2.5 text-[14px] text-white">{m.content}</p>
            ) : (
              <div key={i} className="rounded-[20px] rounded-bl-md bg-white p-4 ring-[0.5px] ring-black/10">
                <RespostaOrbi texto={m.content} />
                {m.href && <Link href={m.href} className="mt-4 inline-flex rounded-full bg-button-primary px-4 py-2 text-[13px] font-semibold text-white">{m.rotulo || "Abrir"} →</Link>}
              </div>
            ))}
            {pensando && (
              <div className="flex items-center gap-2 px-1 text-[13px] text-text-tertiary">
                <OrbiParticleSphere size={18} colors={orbiColors ?? undefined} className="animate-pulse rounded-full" /> Pensando…
              </div>
            )}
            <div ref={fim} />
          </div>
        )}
        {erro && <p className="px-4 pt-3 text-[12.5px] text-red-600">{erro}</p>}

        {msgs.length === 0 && (
          <div className="grid grid-cols-2 gap-2 px-4 pb-1">
            {SUGESTOES.map((a) => (
              <button key={a.id} type="button" onClick={() => void enviar(a.pergunta)} className="cursor-pointer rounded-2xl bg-surface-soft px-3.5 py-3 text-left text-[13px] font-medium leading-tight active:opacity-70">{a.pergunta}</button>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); void enviar(texto); }} className="m-4 flex items-center gap-2 rounded-full bg-surface-soft p-1.5 pl-4">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex: como coloco o preço?" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" enterKeyHint="send" />
          <button type="submit" disabled={pensando || !texto.trim()} aria-label="Enviar" className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-on-background text-white transition-opacity disabled:opacity-30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </form>
      </div>

      <div>
        <p className="px-1 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Dúvidas comuns</p>
        <div className="mt-2 flex flex-col gap-2">
          {AJUDAS.map((a) => (
            <details key={a.id} className="group rounded-2xl bg-white px-4 py-3 ring-1 ring-black/[0.05]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px]">
                <span>{a.pergunta}</span>
                <span className="text-text-tertiary transition-transform group-open:rotate-90">›</span>
              </summary>
              <ol className="mt-3 flex flex-col gap-2">
                {a.passos.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-on-background text-[11px] font-semibold text-white">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
              {a.acao && <Link href={a.acao.href} className="mt-3 inline-flex rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white">{a.acao.rotulo} →</Link>}
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
