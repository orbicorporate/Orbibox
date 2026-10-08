"use client";

import { useState } from "react";
import Link from "next/link";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

const SUGESTOES = ["O que mais chamou atenção esta semana?", "De onde estão vindo meus clientes?", "O que eu faço pra vender mais?"];

/** Campo de pergunta da home: a Orbi responde com os números do negócio. */
export function PerguntaOrbi({ orbiColors }: { orbiColors: string[] | null }) {
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [resposta, setResposta] = useState<{ pergunta: string; resposta: string; href: string | null; rotulo: string | null } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function perguntar(q: string) {
    const pergunta = q.trim();
    if (!pergunta || pensando) return;
    setPensando(true);
    setErro(null);
    try {
      const r = await fetch("/api/copiloto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pergunta }) });
      const d = await r.json();
      if (!r.ok || !d.resposta) throw new Error();
      setResposta({ pergunta, resposta: d.resposta, href: d.href, rotulo: d.rotulo });
      setTexto("");
    } catch {
      setErro("Não consegui responder agora. Tente de novo em instantes.");
    } finally {
      setPensando(false);
    }
  }

  return (
    <section className="mt-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          perguntar(texto);
        }}
        className="flex items-center gap-2.5 rounded-[22px] bg-surface-white p-2 pl-3 ring-1 ring-black/[0.07] transition-shadow focus-within:shadow-[0_8px_24px_-12px_rgba(17,19,24,0.25)]"
      >
        <OrbiParticleSphere size={30} colors={orbiColors ?? undefined} className={`shrink-0 rounded-full ${pensando ? "animate-pulse" : ""}`} />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pergunte à Orbi sobre seus clientes"
          aria-label="Pergunte à Orbi"
          className="min-w-0 flex-1 bg-transparent py-2 text-[14.5px] outline-none placeholder:text-text-tertiary"
          enterKeyHint="send"
        />
        <button
          type="submit"
          disabled={pensando || !texto.trim()}
          aria-label="Perguntar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-background text-white transition-opacity disabled:opacity-25"
        >
          {pensando ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          )}
        </button>
      </form>

      {!resposta && !pensando && (
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {SUGESTOES.map((s) => (
            <button key={s} type="button" onClick={() => perguntar(s)} className="shrink-0 rounded-full bg-surface-soft px-3 py-1.5 text-[12.5px] text-text-secondary active:opacity-60">
              {s}
            </button>
          ))}
        </div>
      )}

      {erro && <p className="mt-2 px-1 text-[12.5px] text-red-600">{erro}</p>}

      {resposta && (
        <div className="orbi-linha-entra mt-3 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
          <p className="text-[12.5px] text-text-tertiary">{resposta.pergunta}</p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed">{resposta.resposta}</p>
          <div className="mt-3 flex items-center gap-3">
            {resposta.href && (
              <Link href={resposta.href} className="rounded-full bg-on-background px-4 py-2 text-[13px] font-medium text-white">
                {resposta.rotulo} →
              </Link>
            )}
            <button type="button" onClick={() => setResposta(null)} className="text-[13px] text-text-secondary underline underline-offset-2">
              Outra pergunta
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
