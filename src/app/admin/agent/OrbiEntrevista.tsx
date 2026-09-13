"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type Turno = { pergunta: string; resposta: string };
const TOTAL = 5;

export function OrbiEntrevista({ businessId, orbiColors, heroGradient, onDone }: { businessId: string; orbiColors?: string[] | null; heroGradient?: string[] | null; onDone?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState<Turno[]>([]);
  const [perguntaAtual, setPerguntaAtual] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [concluido, setConcluido] = useState<{ sobre?: string; diferenciais?: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const halo = heroGradient && heroGradient.length >= 2 ? heroGradient : ["#B7F34A", "#6EE7D8"];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [perguntaAtual, historico, concluido, carregando, finalizando]);

  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [aberto]);

  async function proximaPergunta(hist: Turno[]) {
    setCarregando(true);
    try {
      const res = await fetch("/api/orbi-entrevista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, historico: hist, acao: "proxima" }),
      });
      const data = await res.json();
      setPerguntaAtual(data.pergunta || "Me conta um pouco mais sobre o seu negócio?");
    } catch {
      setPerguntaAtual("Me conta um pouco mais sobre o seu negócio?");
    } finally {
      setCarregando(false);
    }
  }

  function iniciar() {
    setAberto(true);
    if (historico.length === 0 && !perguntaAtual) proximaPergunta([]);
  }

  async function avancar(respostaTexto: string) {
    if (!perguntaAtual || carregando || finalizando) return;
    const novoHist = [...historico, { pergunta: perguntaAtual, resposta: respostaTexto }];
    setHistorico(novoHist);
    setResposta("");
    setPerguntaAtual(null);

    if (novoHist.length >= TOTAL) {
      setFinalizando(true);
      try {
        const res = await fetch("/api/orbi-entrevista", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, historico: novoHist, acao: "finalizar" }),
        });
        const data = await res.json();
        setConcluido({ sobre: data.sobre, diferenciais: data.diferenciais });
        onDone?.();
      } catch {
        setConcluido({});
      } finally {
        setFinalizando(false);
      }
    } else {
      proximaPergunta(novoHist);
    }
  }

  function responder() { if (resposta.trim()) avancar(resposta.trim()); }
  function pular() { if (!carregando && !finalizando) avancar("(prefiro não responder essa)"); }

  // Card de convite (fechado)
  if (!aberto) {
    return (
      <button onClick={iniciar} className="orbi-card-light flex w-full items-center gap-3.5 rounded-[24px] p-5 text-left">
        <OrbiParticleSphere size={48} colors={orbiColors ?? undefined} className="shrink-0 rounded-full" />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold text-on-background">Deixe a Orbi te conhecer</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-text-secondary">Responda 5 perguntas rápidas num papo com a Orbi. Ela entende seu negócio e seu público pra trabalhar muito melhor por você.</span>
        </span>
        <span className="text-text-tertiary">→</span>
      </button>
    );
  }

  const passo = Math.min(historico.length + 1, TOTAL);

  if (typeof document === "undefined") return null;

  return createPortal(
    // Mesmo layout do chat real da Orbi: fundo com halo da marca, avatar
    // grande no topo, balões com degradê suave, campo flutuante embaixo.
    <div className="fixed inset-0 z-[9999] mx-auto flex max-w-[440px] flex-col overflow-hidden bg-background-main">
      <div
        className="pointer-events-none absolute -bottom-56 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full opacity-25 blur-[80px]"
        style={{ backgroundImage: `linear-gradient(135deg, ${halo[0]}, ${halo[1]})` }}
      />

      <button
        onClick={() => setAberto(false)}
        className="absolute left-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-surface-white text-[16px] shadow"
        aria-label="Fechar"
      >
        ×
      </button>

      {/* Progresso discreto no topo direito */}
      {!concluido && (
        <div className="absolute right-5 top-6 z-50 rounded-full bg-surface-white px-3 py-1.5 text-[12px] font-medium text-text-secondary shadow">
          {passo} de {TOTAL}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pb-40 pt-20" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Avatar grande da Orbi */}
        <div className="mx-auto relative">
          <OrbiParticleSphere size={112} colors={orbiColors ?? undefined} className="rounded-full" />
          <span className="absolute bottom-3 right-3 h-4 w-4 rounded-full border-2 border-surface-white bg-orbi-gradient-start" />
        </div>
        <p className="mt-2 text-center text-[14px] text-text-tertiary">Orbi · conhecendo seu negócio</p>

        <div className="mt-6 flex flex-col gap-4">
          {historico.map((t, i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="max-w-[85%] rounded-2xl bg-gradient-to-br from-orbi-gradient-start/15 via-surface-white to-orbi-gradient-end/10 px-5 py-4 text-[16px] leading-[1.6] shadow-[0_2px_12px_rgba(17,19,24,0.06)]">
                {t.pergunta}
              </div>
              <div className="ml-auto max-w-[85%] rounded-2xl bg-on-background px-5 py-4 text-[16px] leading-[1.6] text-white">
                {t.resposta}
              </div>
            </div>
          ))}

          {perguntaAtual && !carregando && !concluido && (
            <div className="max-w-[85%] rounded-2xl bg-gradient-to-br from-orbi-gradient-start/15 via-surface-white to-orbi-gradient-end/10 px-5 py-4 text-[16px] leading-[1.6] shadow-[0_2px_12px_rgba(17,19,24,0.06)]">
              {perguntaAtual}
            </div>
          )}

          {(carregando || finalizando) && (
            <div className="flex items-center gap-2.5 self-start rounded-2xl bg-surface-white px-3 py-2 shadow-[0_2px_12px_rgba(17,19,24,0.06)]">
              <OrbiParticleSphere size={36} colors={orbiColors ?? undefined} className="rounded-full" />
              <span className="text-[14px] text-text-tertiary">{finalizando ? "Montando seu perfil…" : "Orbi está pensando…"}</span>
            </div>
          )}

          {concluido && (
            <div className="rounded-2xl bg-[#DEF3E3] p-5">
              <p className="text-[15px] font-semibold text-[#1F9E4C]">✓ Prontinho! Agora eu conheço seu negócio.</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#1F9E4C]/90">
                Preenchi tudo o que você me contou nos campos da sua configuração. Dá uma olhada e ajuste se quiser, mas já está pronto pra eu trabalhar melhor por você.
              </p>
              <button onClick={() => setAberto(false)} className="mt-4 w-full rounded-full bg-[#1F9E4C] py-3 text-[14px] font-semibold text-white">
                Ver o que a Orbi preencheu
              </button>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Degradê que esconde o conteúdo rolando atrás do campo */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background-main via-background-main to-transparent" />

      {/* Campo flutuante, igual ao chat real */}
      {perguntaAtual && !carregando && !concluido && (
        <>
          <form
            onSubmit={(e) => { e.preventDefault(); responder(); }}
            className="absolute inset-x-6 bottom-14 z-10 flex items-center gap-2 rounded-full bg-surface-white p-2 pl-4 shadow-[0_8px_30px_rgba(17,19,24,0.12)]"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orbi-gradient-start opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orbi-gradient-start" />
            </span>
            <input
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="Escreva sua resposta…"
              autoFocus
              className="flex-1 bg-transparent text-[14px] outline-none"
            />
            <button
              type="submit"
              disabled={!resposta.trim()}
              aria-label="Enviar"
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${resposta.trim() ? "orbi-gradient" : "bg-surface-soft"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={resposta.trim() ? "text-on-background" : "text-text-tertiary"} aria-hidden>
                <path d="M7 11l5-5 5 5" /><path d="M12 6v13" />
              </svg>
            </button>
          </form>
          <button onClick={pular} className="absolute inset-x-0 bottom-5 z-10 text-center text-[13px] font-medium text-text-tertiary">
            Pular esta pergunta
          </button>
        </>
      )}
    </div>,
    document.body
  );
}
