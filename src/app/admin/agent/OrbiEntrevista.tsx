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
    <div className="rounded-[24px] border border-divider bg-surface-white p-5">
      <div className="flex items-center gap-2.5">
        <OrbiParticleSphere size={30} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        <div className="flex-1">
          <p className="text-[13px] font-semibold">Conversa com a Orbi</p>
          {!concluido && <p className="text-[11.5px] text-text-tertiary">Pergunta {passo} de {TOTAL}</p>}
        </div>
      </div>

      {/* barra de progresso */}
      {!concluido && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-soft">
          <div className="h-full rounded-full orbi-gradient transition-all" style={{ width: `${((historico.length) / TOTAL) * 100}%` }} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {/* histórico */}
        {historico.map((t, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <p className="text-[13.5px] leading-relaxed text-text-secondary">{t.pergunta}</p>
            <p className="self-end rounded-2xl rounded-br-sm bg-surface-soft px-3.5 py-2 text-[13.5px] leading-relaxed">{t.resposta}</p>
          </div>
        ))}

        {/* pergunta atual */}
        {carregando && (
          <div className="flex items-center gap-2 text-[13px] text-text-tertiary">
            <OrbiParticleSphere size={22} colors={orbiColors ?? undefined} vivid className="rounded-full" />
            A Orbi está pensando…
          </div>
        )}
        {perguntaAtual && !carregando && (
          <p className="text-[15px] font-medium leading-relaxed text-on-background">{perguntaAtual}</p>
        )}

        {finalizando && (
          <div className="flex items-center gap-2 text-[13px] text-text-tertiary">
            <OrbiParticleSphere size={22} colors={orbiColors ?? undefined} vivid className="rounded-full" />
            Montando o perfil do seu negócio…
          </div>
        )}

        {concluido && (
          <div className="rounded-2xl bg-[#DEF3E3] p-4">
            <p className="text-[14px] font-semibold text-[#1F9E4C]">✓ Prontinho! Agora a Orbi conhece seu negócio.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#1F9E4C]/90">
              Preenchi o que você me contou nos campos abaixo. Dá uma olhada e ajuste se quiser, mas já está tudo pronto pra eu trabalhar melhor por você.
            </p>
          </div>
        )}

        <div ref={fimRef} />
      </div>

      {/* campo de resposta */}
      {perguntaAtual && !carregando && !concluido && (
        <div className="mt-4">
          <textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Escreva sua resposta…"
            rows={2}
            className="w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14px] outline-none focus:border-on-background"
          />
          <button
            onClick={responder}
            disabled={!resposta.trim()}
            className="mt-2 w-full rounded-full bg-button-primary py-3 text-[14px] font-semibold text-white disabled:opacity-40"
          >
            {historico.length + 1 >= TOTAL ? "Finalizar" : "Responder"}
          </button>
        </div>
      )}
    </div>
  );
}
