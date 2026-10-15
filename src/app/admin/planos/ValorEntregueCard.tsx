"use client";

import { useEffect, useState, type ReactNode } from "react";

type Linha = { n: number; texto: string; chave: string };

// Cada resultado ganha a sua cor e um ícone de linha, pra a lista virar uma
// vitrine de conquistas e não uma tabela de números.
const ESTILO: Record<string, { fundo: string; cor: string; icone: ReactNode }> = {
  visitas: {
    fundo: "#EEFCCB",
    cor: "#2F6B00",
    icone: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  },
  produtos: {
    fundo: "#FFEAD7",
    cor: "#A8481A",
    icone: <><path d="M5 8h14l-1 11H6L5 8z" /><path d="M9 8V6.5a3 3 0 016 0V8" /></>,
  },
  conversas: {
    fundo: "#EFE6FF",
    cor: "#6A3FC4",
    icone: <path d="M20 11.5a7.5 7.5 0 01-10.9 6.7L4 19.5l1.4-4.4A7.5 7.5 0 1120 11.5z" />,
  },
  whatsapp: {
    fundo: "#DDF9F4",
    cor: "#00695F",
    icone: <path d="M6.5 4h3l1.4 3.8-1.9 1.3a10 10 0 005 5l1.3-1.9 3.8 1.4v3A2 2 0 0117.2 19 13.5 13.5 0 015 6.8 2 2 0 016.5 4z" />,
  },
  contatos: {
    fundo: "#FFE4EE",
    cor: "#B0285F",
    icone: <><circle cx="10" cy="8.5" r="3.3" /><path d="M3.5 19a6.5 6.5 0 0113 0" /><path d="M18 8v5M15.5 10.5h5" /></>,
  },
  resgates: {
    fundo: "#E1ECFF",
    cor: "#1D4ED8",
    icone: <><path d="M4 8.5A1.5 1.5 0 015.5 7h13A1.5 1.5 0 0120 8.5V10a2 2 0 000 4v1.5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 15.5V14a2 2 0 000-4z" /><path d="M14 7.5v9" strokeDasharray="1.5 2" /></>,
  },
};

const CONFETES = ["#B7F34A", "#6EE7D8", "#A78BFA", "#FFB86B", "#FF8FB7", "#7DB4FF"];

/** Número que sobe de zero até o valor, com desaceleração no fim. */
function Contador({ alvo, atraso }: { alvo: number; atraso: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dur = reduz ? 0 : 1100;
    let raf = 0;
    let ini = 0;
    const t = window.setTimeout(() => {
      const passo = (agora: number) => {
        if (!ini) ini = agora;
        const p = dur === 0 ? 1 : Math.min(1, (agora - ini) / dur);
        setV(Math.round((1 - Math.pow(1 - p, 3)) * alvo));
        if (p < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    }, reduz ? 0 : atraso);
    return () => { window.clearTimeout(t); cancelAnimationFrame(raf); };
  }, [alvo, atraso]);
  return <>{v.toLocaleString("pt-BR")}</>;
}

/**
 * Vitrine do que o Orbibox fez no teste. Feita pra dar vontade de continuar:
 * fundo vivo, confete na entrada, números que sobem e cada resultado numa cor.
 */
export function ValorEntregueCard({ rotulo, titulo, linhas, vazio, fecho }: { rotulo: string; titulo: string; linhas: Linha[]; vazio: string; fecho: string }) {
  const [destaque, ...demais] = linhas;
  const est = destaque ? ESTILO[destaque.chave] : null;

  return (
    <section className="valor-card relative mb-6 mt-2 overflow-hidden rounded-[28px] p-5 text-[#10231A]">
      {/* Confete que cai uma vez só na entrada */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="valor-confete absolute top-0 block rounded-[2px]"
            style={{
              left: `${(i * 37) % 100}%`,
              width: 6 + (i % 3) * 2,
              height: 10 + (i % 2) * 4,
              backgroundColor: CONFETES[i % CONFETES.length],
              animationDelay: `${(i % 8) * 0.12}s`,
              animationDuration: `${1.6 + (i % 5) * 0.25}s`,
            }}
          />
        ))}
      </div>

      <div className="relative">
        <p className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#2F6B00]">{rotulo}</p>
        <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">
          {titulo} <span className="valor-estrela inline-block" aria-hidden>✦</span>
        </h1>

        {destaque && est && (
          <div className="valor-entra mt-5 flex items-center gap-4 rounded-[24px] bg-gradient-to-br from-white/85 to-white/45 p-4 shadow-[0_8px_24px_-12px_rgba(16,35,26,0.35)] ring-1 ring-white/70 backdrop-blur-md" style={{ animationDelay: "0.1s" }}>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: est.fundo, color: est.cor }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{est.icone}</svg>
            </span>
            <p className="min-w-0 flex-1 leading-tight">
              <span className="block font-[family-name:var(--font-manrope)] text-[44px] font-semibold tabular-nums tracking-[-0.02em]" style={{ color: est.cor }}>
                <Contador alvo={destaque.n} atraso={250} />
              </span>
              <span className="block text-[14.5px] text-[#2B3A33]">{destaque.texto}</span>
            </p>
          </div>
        )}

        {demais.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-2.5">
            {demais.map((l, i) => {
              const e = ESTILO[l.chave];
              const ultimoImpar = demais.length % 2 === 1 && i === demais.length - 1;
              return (
                <li
                  key={l.chave}
                  className={`valor-entra rounded-[20px] bg-gradient-to-br from-white/80 to-white/40 p-3.5 shadow-[0_6px_20px_-12px_rgba(16,35,26,0.35)] ring-1 ring-white/70 backdrop-blur-md ${ultimoImpar ? "col-span-2" : ""}`}
                  style={{ animationDelay: `${0.25 + i * 0.09}s` }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: e.fundo, color: e.cor }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{e.icone}</svg>
                  </span>
                  <p className="mt-2.5 font-[family-name:var(--font-manrope)] text-[30px] font-semibold leading-none tabular-nums tracking-[-0.02em]" style={{ color: e.cor }}>
                    <Contador alvo={l.n} atraso={450 + i * 90} />
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-[#2B3A33]">{l.texto}</p>
                </li>
              );
            })}
          </ul>
        )}

        {linhas.length === 0 && <p className="mt-4 rounded-[20px] bg-white/70 p-4 text-[14.5px] leading-relaxed">{vazio}</p>}

        <p className="mt-5 text-[15px] font-medium leading-snug">{fecho}</p>
        <a href="#planos" className="mt-3 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#10231A] px-6 text-[14.5px] font-semibold text-white transition-transform active:scale-[0.97]">
          Ver os planos <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
