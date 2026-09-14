"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { OrbiInsightCard, OrbiInsightHeader } from "@/components/orbi/OrbiInsightCard";

type Canal = { canal: string; quando: string; texto: string; dica: string };
type Estrategia = { alvo: string; porque: string };
type Plano = { estrategia: Estrategia; canais: Canal[]; no_balcao: string[]; evite: string[] };

// Ícone por canal, desenhado em linha pra não virar emoji colorido no iOS.
const ICONES: Record<string, { glifo: string; cor: string; fundo: string }> = {
  status: { glifo: "◍", cor: "#1F9E4C", fundo: "#DEF3E3" },
  story: { glifo: "◎", cor: "#B0309E", fundo: "#FBE4F6" },
  direta: { glifo: "◈", cor: "#1D4ED8", fundo: "#E2EAFE" },
  grupo: { glifo: "◫", cor: "#C2650A", fundo: "#FDEEDF" },
};

function iconeDoCanal(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes("status")) return ICONES.status;
  if (n.includes("story") || n.includes("stories") || n.includes("instagram")) return ICONES.story;
  if (n.includes("direta") || n.includes("direct") || n.includes("antigo") || n.includes("mensagem")) return ICONES.direta;
  return ICONES.grupo;
}

export function VoucherPlanoOrbi({ voucherId, voucherTitulo, orbiColors }: { voucherId: string; voucherTitulo: string; orbiColors?: string[] | null }) {
  const [plano, setPlano] = useState<Plano | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);

  async function gerar() {
    if (carregando) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/voucher-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Não consegui montar o plano."); return; }
      setPlano(data);
      setAberto(true);
    } catch {
      setErro("Erro ao falar com a Orbi. Tenta de novo.");
    } finally {
      setCarregando(false);
    }
  }

  async function copiar(texto: string, i: number) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(i);
      setTimeout(() => setCopiado(null), 1500);
    } catch { /* sem clipboard */ }
  }

  return (
    <>
      <OrbiInsightCard className="mt-4">
        <OrbiInsightHeader />
        <p className="relative mt-3 font-[family-name:var(--font-manrope)] text-[21px] font-semibold leading-tight tracking-[-0.01em]">
          Como fazer esse voucher render
        </p>
        <p className="relative mt-2 text-[14.5px] leading-relaxed text-text-secondary">
          A Orbi monta o plano de divulgação: onde postar, quando, e o texto pronto pra copiar.
        </p>

        {carregando ? (
          <div className="relative mt-5 flex items-center gap-2.5">
            <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
              <OrbiParticleSphere size={24} colors={orbiColors ?? undefined} className="rounded-full" />
            </span>
            <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/40">
              <span className="orbi-progress-bar orbi-gradient block h-full rounded-full shadow-[0_0_8px_rgba(110,231,216,0.9)]" />
            </span>
            <span className="shrink-0 text-[11.5px] text-text-tertiary">pensando…</span>
          </div>
        ) : (
          <button
            onClick={plano ? () => setAberto(true) : gerar}
            className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-on-background px-6 py-3.5 text-[14.5px] font-semibold text-white"
          >
            {plano ? "Ver plano de divulgação →" : "Montar plano de divulgação"}
          </button>
        )}

        {erro && <p className="relative mt-3 text-[13px] text-red-600">{erro}</p>}
      </OrbiInsightCard>

      {aberto && plano && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] mx-auto flex max-w-[440px] flex-col bg-background-main">
          <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 border-b border-divider/50 bg-surface-white/70 px-4 py-3 backdrop-blur-xl">
            <button onClick={() => setAberto(false)} aria-label="Voltar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight">Plano de divulgação</p>
              <p className="truncate text-[12px] text-text-tertiary">{voucherTitulo}</p>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10" style={{ paddingTop: "66px", WebkitOverflowScrolling: "touch" }}>
            {/* Estratégia: por que esse voucher existe */}
            {(plano.estrategia?.alvo || plano.estrategia?.porque) && (
              <div className="orbi-rise orbi-card-light relative overflow-hidden rounded-[30px] px-6 py-6">
                {/* Esfera e rótulo na mesma linha, à esquerda: sobra espaço
                    pro texto e o bloco deixa de ser um quadrado centralizado. */}
                <div className="relative flex items-center gap-2.5">
                  <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-full">
                    <OrbiParticleSphere size={32} colors={orbiColors ?? undefined} vivid className="rounded-full" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">A jogada</span>
                </div>

                {plano.estrategia.alvo && (
                  <p className="relative mt-3.5 font-[family-name:var(--font-manrope)] text-[21px] font-semibold leading-[1.25] tracking-[-0.01em] text-on-background">
                    {plano.estrategia.alvo}
                  </p>
                )}
                {plano.estrategia.porque && (
                  <p className="relative mt-2.5 text-[15px] leading-[1.6] text-text-secondary">
                    {plano.estrategia.porque}
                  </p>
                )}
              </div>
            )}

            {/* Canais, com texto pronto */}
            {plano.canais.map((c, i) => {
              const ic = iconeDoCanal(c.canal);
              return (
                <div
                  key={i}
                  className="orbi-rise mt-4 rounded-[26px] border border-divider bg-surface-white px-6 py-6"
                  style={{ animationDelay: `${80 + i * 70}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px]"
                      style={{ backgroundColor: ic.fundo, color: ic.cor }}
                    >
                      {ic.glifo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold leading-tight tracking-[-0.01em]">
                        {c.canal}
                      </p>
                      {c.quando && <p className="mt-0.5 text-[13px] text-text-tertiary">{c.quando}</p>}
                    </div>
                  </div>

                  {c.texto && (
                    <div className="mt-4 rounded-[20px] bg-surface-soft px-5 py-4">
                      <p className="whitespace-pre-line text-[15.5px] leading-[1.65] text-on-background">{c.texto}</p>
                      <button
                        onClick={() => copiar(c.texto, i)}
                        className="mt-3.5 w-full rounded-full bg-on-background py-2.5 text-[13.5px] font-semibold text-white"
                      >
                        {copiado === i ? "Copiado ✓" : "Copiar texto"}
                      </button>
                    </div>
                  )}

                  {c.dica && (
                    <p className="mt-3.5 text-[13.5px] leading-relaxed text-text-secondary">
                      <span className="font-semibold text-on-background">Pra render mais: </span>
                      {c.dica}
                    </p>
                  )}
                </div>
              );
            })}

            {/* No balcão */}
            {plano.no_balcao.length > 0 && (
              <div className="orbi-rise mt-4 rounded-[26px] border border-divider bg-surface-white px-6 py-6" style={{ animationDelay: "380ms" }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ECEDE9] text-[15px] text-on-background">◆</span>
                  <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold leading-tight tracking-[-0.01em]">
                    Quando o cliente chegar
                  </p>
                </div>
                <div className="mt-5 flex flex-col gap-4">
                  {plano.no_balcao.map((t, i) => (
                    <div key={i} className="flex items-start gap-3.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[13px] font-semibold">
                        {i + 1}
                      </span>
                      <p className="min-w-0 flex-1 text-[15.5px] leading-[1.6] text-on-background">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* O que evitar */}
            {plano.evite.length > 0 && (
              <div className="orbi-rise mt-4 rounded-[26px] border border-divider bg-surface-white px-6 py-6" style={{ animationDelay: "450ms" }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FDEEDF] text-[15px] text-[#C2650A]">▲</span>
                  <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold leading-tight tracking-[-0.01em]">
                    Não faça isso
                  </p>
                </div>
                <div className="mt-5 flex flex-col gap-4">
                  {plano.evite.map((t, i) => (
                    <p key={i} className="text-[15.5px] leading-[1.6] text-text-secondary">{t}</p>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { setPlano(null); setAberto(false); gerar(); }}
              className="mt-5 w-full rounded-full border border-divider bg-surface-white py-3.5 text-[14.5px] font-semibold"
            >
              Gerar outro plano
            </button>
            <button
              onClick={() => setAberto(false)}
              className="mt-2.5 w-full rounded-full bg-on-background py-4 text-[15.5px] font-semibold text-white"
            >
              Voltar ao voucher
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
