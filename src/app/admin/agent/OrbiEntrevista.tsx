"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type Turno = { pergunta: string; resposta: string };
const TOTAL = 5;

export function OrbiEntrevista({ businessId, orbiColors, onDone }: { businessId: string; orbiColors?: string[] | null; onDone?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [historico, setHistorico] = useState<Turno[]>([]);
  const [perguntaAtual, setPerguntaAtual] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [concluido, setConcluido] = useState<{ sobre?: string; diferenciais?: string } | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [perguntaAtual, historico, concluido, carregando, finalizando]);

  // Trava o scroll do corpo enquanto o chat de tela cheia está aberto.
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

  function responder() {
    if (!resposta.trim()) return;
    avancar(resposta.trim());
  }

  function pular() {
    if (carregando || finalizando) return;
    avancar("(prefiro não responder essa)");
  }

  // Card de convite (fechado)
  if (!aberto) {
    return (
      <button onClick={iniciar} className="orbi-card-light flex w-full items-center gap-3.5 rounded-[24px] p-5 text-left">
        <OrbiParticleSphere size={48} colors={orbiColors ?? undefined} vivid className="shrink-0 rounded-full" />
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
    <div className="fixed inset-0 z-[9999] flex flex-col bg-background-main">
      {/* Cabeçalho fixo */}
      <div className="flex items-center gap-3 border-b border-divider px-4 py-3.5">
        <OrbiParticleSphere size={40} colors={orbiColors ?? undefined} vivid className="shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight">Orbi</p>
          <p className="text-[12px] text-text-tertiary">
            {concluido ? "conversa concluída" : finalizando ? "montando seu perfil…" : carregando ? "digitando…" : `conhecendo seu negócio · ${passo} de ${TOTAL}`}
          </p>
        </div>
        <button onClick={() => setAberto(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary" aria-label="Fechar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="h-0.5 w-full bg-surface-soft">
        <div className="h-full orbi-gradient transition-all" style={{ width: `${(historico.length / TOTAL) * 100}%` }} />
      </div>

      {/* Mensagens (rola) */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex max-w-[560px] flex-col gap-3.5">
          {historico.map((t, i) => (
            <div key={i} className="flex flex-col gap-3.5">
              <div className="flex items-end gap-2">
                <OrbiParticleSphere size={28} colors={orbiColors ?? undefined} vivid className="mb-0.5 shrink-0 rounded-full" />
                <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-surface-white px-4 py-2.5 text-[15px] leading-relaxed shadow-sm">{t.pergunta}</p>
              </div>
              <p className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-button-primary px-4 py-2.5 text-[15px] leading-relaxed text-white">{t.resposta}</p>
            </div>
          ))}

          {perguntaAtual && !carregando && !concluido && (
            <div className="flex items-end gap-2">
              <OrbiParticleSphere size={28} colors={orbiColors ?? undefined} vivid className="mb-0.5 shrink-0 rounded-full" />
              <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-surface-white px-4 py-2.5 text-[15px] leading-relaxed shadow-sm">{perguntaAtual}</p>
            </div>
          )}

          {(carregando || finalizando) && (
            <div className="flex items-end gap-2">
              <OrbiParticleSphere size={28} colors={orbiColors ?? undefined} vivid className="mb-0.5 shrink-0 rounded-full" />
              <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-surface-white px-4 py-3.5 shadow-sm">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" />
              </span>
            </div>
          )}

          {concluido && (
            <div className="mt-2 rounded-2xl bg-[#DEF3E3] p-5">
              <p className="text-[15px] font-semibold text-[#1F9E4C]">✓ Prontinho! Agora eu conheço seu negócio.</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#1F9E4C]/90">
                Preenchi tudo o que você me contou nos campos da sua configuração. Dá uma olhada e ajuste se quiser, mas já está pronto pra eu trabalhar melhor por você.
              </p>
              <button onClick={() => setAberto(false)} className="mt-4 w-full rounded-full bg-[#1F9E4C] py-3 text-[14px] font-semibold text-white">
                Ver o que a Orbi preencheu
              </button>
            </div>
          )}

          <div ref={fimRef} />
        </div>
      </div>

      {/* Barra de resposta fixa embaixo */}
      {perguntaAtual && !carregando && !concluido && (
        <div className="border-t border-divider bg-surface-white px-4 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto max-w-[560px]">
            <div className="flex items-end gap-2">
              <textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); responder(); } }}
                placeholder="Escreva sua resposta…"
                rows={1}
                autoFocus
                className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
              />
              <button
                onClick={responder}
                disabled={!resposta.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-button-primary text-white disabled:opacity-40"
                aria-label="Enviar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              </button>
            </div>
            <button onClick={pular} className="mt-2 w-full text-center text-[13px] font-medium text-text-tertiary">
              Pular esta pergunta
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
