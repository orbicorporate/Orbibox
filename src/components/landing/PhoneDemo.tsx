"use client";

import { useEffect, useState } from "react";
import { TEMAS_LANDING, type InspireLanding } from "./temas";

function Icone({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Celular com uma vitrine de verdade que troca de negócio sozinha (ou ao toque). */
export function PhoneDemo({ inspire }: { inspire: InspireLanding }) {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  useEffect(() => {
    if (pausado) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % TEMAS_LANDING.length), 4800);
    return () => window.clearInterval(t);
  }, [pausado]);

  const tema = TEMAS_LANDING[i];
  const dados = inspire[tema.id];
  const fotos = (dados?.photos ?? []).filter((p) => p.url).slice(0, 4);
  const faixa = dados?.titleStyle === "faixa";

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* brilho atrás do celular, na cor do negócio */}
        <div aria-hidden className="absolute -inset-10 rounded-full opacity-40 blur-3xl transition-colors duration-700" style={{ background: tema.cor }} />
        <div className="relative w-[286px] rounded-[44px] border-[7px] border-[#16171a] bg-background-main shadow-[0_40px_80px_-30px_rgba(17,19,24,0.55)] sm:w-[310px]">
          <div className="absolute left-1/2 top-2 z-10 h-[18px] w-[84px] -translate-x-1/2 rounded-full bg-[#16171a]" aria-hidden />
          <div key={tema.id} className="lp-fade h-[560px] overflow-hidden rounded-[36px] px-4 pb-4 pt-9 sm:h-[600px]">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full font-[family-name:var(--font-manrope)] text-[18px] font-medium text-white" style={{ background: tema.cor }}>
                {tema.nome[0]}
              </span>
              <p className="mt-2 text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{tema.nome}</p>
              <p className="mt-1 max-w-[220px] text-[11px] leading-snug text-text-secondary">{tema.frase}</p>
              <p className="mt-2 font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight tracking-[-0.01em]">{tema.pergunta}</p>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-end justify-between rounded-[18px] px-4 py-3.5 text-white" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${tema.cor} 88%, white), ${tema.cor})` }}>
                <span className="text-[14px]">{tema.principal}</span>
                <span aria-hidden>→</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex h-[70px] flex-col justify-between rounded-[18px] border border-black/10 bg-surface-white p-3 text-on-background">
                  <Icone d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.2A8.4 8.4 0 1 1 21 11.5Z" />
                  <span className="text-[12.5px]">WhatsApp</span>
                </div>
                <div className="flex h-[70px] flex-col justify-between rounded-[18px] border border-black/10 bg-surface-white p-3 text-on-background">
                  <Icone d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <span className="text-[12.5px]">Como chegar</span>
                </div>
              </div>
            </div>

            <p className="mb-1.5 mt-3.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-text-tertiary">{tema.fotos}</p>
            <div className="grid grid-cols-2 gap-2">
              {(fotos.length ? fotos : [null, null, null, null]).map((f, n) => (
                <div key={n} className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-surface-soft">
                  {f && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.title || tema.chip} loading={i === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
                  )}
                  {f?.title && (
                    <span className={faixa ? "absolute inset-x-0 bottom-0 bg-white/92 px-2 py-1.5 text-[10.5px] leading-tight text-on-background" : "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-2 pt-6 text-[10.5px] leading-tight text-white"}>
                      {f.title}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* selo flutuando: a Orbi */}
        <div className="lp-float absolute -right-4 bottom-24 hidden items-center gap-2 rounded-full bg-surface-white px-3.5 py-2 text-[12.5px] shadow-[0_14px_34px_-12px_rgba(17,19,24,0.4)] sm:flex">
          <span className="orbi-gradient flex h-6 w-6 items-center justify-center rounded-full text-[11px]" aria-hidden>✦</span>
          Pergunte à Orbi
        </div>
      </div>

      <div role="tablist" aria-label="Exemplos de negócio" className="mt-8 flex max-w-[360px] flex-wrap justify-center gap-2">
        {TEMAS_LANDING.map((t, n) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={n === i}
            onClick={() => { setI(n); setPausado(true); }}
            className={`min-h-[40px] rounded-full px-4 text-[13.5px] transition-colors ${n === i ? "bg-on-background text-white" : "bg-surface-white text-text-secondary ring-1 ring-black/[0.06]"}`}
          >
            {t.chip}
          </button>
        ))}
      </div>
    </div>
  );
}
