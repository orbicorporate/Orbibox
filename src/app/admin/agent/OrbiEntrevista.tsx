"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type Turno = { pergunta: string; resposta: string };

// 5 perguntas fixas e estratégicas. Ordem pensada pra a Orbi entender o
// essencial do negócio. Fixas = impossível repetir.
const PERGUNTAS = [
  "Pra começar, me conta: o que o seu negócio faz e pra quem?",
  "O que faz o seu negócio ser diferente ou especial, na sua visão?",
  "Quem é o seu cliente ideal? (quem compra, o que valoriza, como é)",
  "Como você quer que a sua marca soe? (ex: próxima e descontraída, ou elegante e sóbria)",
  "E onde você mais quer que a Orbi te ajude no dia a dia?",
];
const TOTAL = PERGUNTAS.length;

export function OrbiEntrevista({ businessId, orbiColors, onDone }: { businessId: string; orbiColors?: string[] | null; onDone?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState<Turno[]>([]);
  const [resposta, setResposta] = useState("");
  const [finalizando, setFinalizando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Índice da pergunta atual = quantas já foram respondidas.
  const idx = historico.length;
  const perguntaAtual = idx < TOTAL ? PERGUNTAS[idx] : null;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [historico, concluido, finalizando]);

  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [aberto]);

  async function avancar(respostaTexto: string) {
    if (!perguntaAtual || finalizando) return;
    const novoHist = [...historico, { pergunta: perguntaAtual, resposta: respostaTexto }];
    setHistorico(novoHist);
    setResposta("");

    if (novoHist.length >= TOTAL) {
      setFinalizando(true);
      try {
        await fetch("/api/orbi-entrevista", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, historico: novoHist, acao: "finalizar" }),
        });
        setConcluido(true);
        onDone?.();
      } catch {
        setConcluido(true);
      } finally {
        setFinalizando(false);
      }
    }
  }

  function responder() { if (resposta.trim()) avancar(resposta.trim()); }
  function pular() { if (!finalizando) avancar("(prefiro não responder essa)"); }

  function iniciar() { setAberto(true); }

  // Card de convite (fechado). Sem a esfera da Orbi de propósito, pra não
  // repetir a esfera que já aparece no card do agente logo abaixo.
  if (!aberto) {
    return (
      <button onClick={iniciar} className="orbi-card-light flex w-full items-center gap-3.5 rounded-[24px] p-6 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-[family-name:var(--font-manrope)] text-[20px] font-semibold leading-tight text-on-background">Comece clicando aqui</span>
          <span className="mt-1.5 block text-[14px] leading-relaxed text-text-secondary">Deixa a Orbi conhecer seu negócio. São só 5 perguntas rápidas, e ela passa a trabalhar muito melhor por você.</span>
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-on-background text-white">→</span>
      </button>
    );
  }

  const passo = Math.min(historico.length + 1, TOTAL);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] mx-auto flex max-w-[440px] flex-col bg-background-main">
      {/* Cabeçalho fixo */}
      <header className="flex items-center gap-3 border-b border-divider bg-surface-white px-4 py-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <OrbiParticleSphere size={44} colors={orbiColors ?? undefined} className="rounded-full" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight">Orbi</p>
          <p className="text-[12px] text-text-tertiary">
            {concluido ? "conversa concluída" : finalizando ? "montando seu perfil…" : `pergunta ${passo} de ${TOTAL}`}
          </p>
        </div>
        <button onClick={() => setAberto(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary" aria-label="Fechar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </header>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        <div className="flex flex-col gap-3">
          {historico.map((t, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-surface-white px-4 py-3 text-[15px] leading-[1.5] shadow-[0_1px_6px_rgba(17,19,24,0.08)]">
                {t.pergunta}
              </div>
              <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-on-background px-4 py-3 text-[15px] leading-[1.5] text-white">
                {t.resposta}
              </div>
            </div>
          ))}

          {perguntaAtual && !concluido && (
            <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-surface-white px-4 py-3 text-[15px] leading-[1.5] shadow-[0_1px_6px_rgba(17,19,24,0.08)]">
              {perguntaAtual}
            </div>
          )}

          {finalizando && (
            <div className="flex w-fit items-center gap-1.5 self-start rounded-2xl rounded-bl-md bg-surface-white px-4 py-3.5 shadow-[0_1px_6px_rgba(17,19,24,0.08)]">
              <span className="h-2 w-2 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-text-tertiary" />
            </div>
          )}

          {concluido && (
            <div className="rounded-2xl bg-[#DEF3E3] p-5">
              <p className="text-[15px] font-semibold text-[#1F9E4C]">✓ Prontinho! Agora eu conheço seu negócio.</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#1F9E4C]/90">
                Preenchi tudo o que você me contou nos campos da sua configuração. Dá uma olhada e ajuste se quiser.
              </p>
              <button onClick={() => setAberto(false)} className="mt-4 w-full rounded-full bg-[#1F9E4C] py-3 text-[14px] font-semibold text-white">
                Ver o que a Orbi preencheu
              </button>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Barra de resposta fixa */}
      {!concluido && (
        <div className="border-t border-divider bg-surface-white px-4 pt-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-end gap-2">
            <textarea
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); responder(); } }}
              placeholder={perguntaAtual ? "Escreva sua resposta…" : "Aguarde a Orbi…"}
              disabled={!perguntaAtual || finalizando}
              rows={1}
              className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background disabled:opacity-60"
            />
            <button
              onClick={responder}
              disabled={!resposta.trim() || !perguntaAtual || finalizando}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-button-primary text-white disabled:opacity-40"
              aria-label="Enviar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
          </div>
          {perguntaAtual && !finalizando && (
            <button onClick={pular} className="mt-2 w-full text-center text-[13px] font-medium text-text-tertiary">
              Pular esta pergunta
            </button>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
