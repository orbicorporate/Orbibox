"use client";

import { useState, useEffect, useRef } from "react";
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

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [perguntaAtual, historico, concluido]);

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

  async function responder() {
    if (!resposta.trim() || !perguntaAtual || carregando) return;
    const novoHist = [...historico, { pergunta: perguntaAtual, resposta: resposta.trim() }];
    setHistorico(novoHist);
    setResposta("");
    setPerguntaAtual(null);

    if (novoHist.length >= TOTAL) {
      // Terminou: gera os campos.
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

  if (!aberto) {
    return (
      <button onClick={iniciar} className="orbi-card-light flex w-full items-center gap-3.5 rounded-[24px] p-5 text-left">
        <OrbiParticleSphere size={44} colors={orbiColors ?? undefined} vivid className="shrink-0 rounded-full" />
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold text-on-background">Deixe a Orbi te conhecer</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-text-secondary">Responda 5 perguntas rápidas e a Orbi entende seu negócio e seu público pra trabalhar muito melhor por você.</span>
        </span>
        <span className="text-text-tertiary">→</span>
      </button>
    );
  }

  const passo = Math.min(historico.length + 1, TOTAL);

  return (
    <div className="flex flex-col rounded-[24px] border border-divider bg-surface-white">
      {/* Cabeçalho fixo do chat */}
      <div className="flex items-center gap-2.5 border-b border-divider p-4">
        <OrbiParticleSphere size={34} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        <div className="flex-1">
          <p className="text-[14px] font-semibold">Orbi</p>
          <p className="text-[11.5px] text-text-tertiary">{concluido ? "Conversa concluída" : `conhecendo seu negócio · ${passo} de ${TOTAL}`}</p>
        </div>
      </div>
      {!concluido && (
        <div className="h-0.5 w-full overflow-hidden bg-surface-soft">
          <div className="h-full orbi-gradient transition-all" style={{ width: `${(historico.length / TOTAL) * 100}%` }} />
        </div>
      )}

      {/* Mensagens */}
      <div className="flex flex-col gap-3 p-4">
        {historico.map((t, i) => (
          <div key={i} className="flex flex-col gap-3">
            {/* balão da Orbi */}
            <div className="flex items-end gap-2">
              <OrbiParticleSphere size={26} colors={orbiColors ?? undefined} vivid className="mb-0.5 shrink-0 rounded-full" />
              <p className="max-w-[82%] rounded-2xl rounded-bl-md bg-surface-soft px-3.5 py-2.5 text-[14px] leading-relaxed">{t.pergunta}</p>
            </div>
            {/* balão do usuário */}
            <p className="max-w-[82%] self-end rounded-2xl rounded-br-md bg-button-primary px-3.5 py-2.5 text-[14px] leading-relaxed text-white">{t.resposta}</p>
          </div>
        ))}

        {/* pergunta atual da Orbi */}
        {perguntaAtual && !carregando && !concluido && (
          <div className="flex items-end gap-2">
            <OrbiParticleSphere size={26} colors={orbiColors ?? undefined} vivid className="mb-0.5 shrink-0 rounded-full" />
            <p className="max-w-[82%] rounded-2xl rounded-bl-md bg-surface-soft px-3.5 py-2.5 text-[14px] leading-relaxed">{perguntaAtual}</p>
          </div>
        )}

        {/* Orbi digitando */}
        {(carregando || finalizando) && (
          <div className="flex items-end gap-2">
            <OrbiParticleSphere size={26} colors={orbiColors ?? undefined} vivid className="mb-0.5 shrink-0 rounded-full" />
            <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-surface-soft px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" />
            </span>
          </div>
        )}

        {concluido && (
          <div className="rounded-2xl bg-[#DEF3E3] p-4">
            <p className="text-[14px] font-semibold text-[#1F9E4C]">✓ Prontinho! Agora eu conheço seu negócio.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#1F9E4C]/90">
              Preenchi o que você me contou nos campos abaixo. Dá uma olhada e ajuste se quiser, mas já está tudo pronto pra eu trabalhar melhor por você.
            </p>
          </div>
        )}

        <div ref={fimRef} />
      </div>

      {/* Campo de resposta */}
      {perguntaAtual && !carregando && !concluido && (
        <div className="border-t border-divider p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); responder(); } }}
              placeholder="Escreva sua resposta…"
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14px] outline-none focus:border-on-background"
            />
            <button
              onClick={responder}
              disabled={!resposta.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-button-primary text-white disabled:opacity-40"
              aria-label={historico.length + 1 >= TOTAL ? "Finalizar" : "Enviar"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
