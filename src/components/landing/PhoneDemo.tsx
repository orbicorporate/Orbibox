"use client";

import { useEffect, useRef, useState } from "react";
import { OrbiAvatar, lerEsfera, escalaDoAvatar } from "@/components/orbi/OrbiAvatar";
import { MARCAS_LANDING, type IconeBolinha } from "./marcas";

/** Rola suave com aceleração e freio (easeInOutSine), sem o tranco do scroll nativo. */
function deslizar(el: HTMLElement, eixo: "left" | "top", destino: number, ms: number, ids: number[]) {
  const ini = eixo === "left" ? el.scrollLeft : el.scrollTop;
  const t0 = performance.now();
  const passo = (agora: number) => {
    const k = Math.min(1, (agora - t0) / ms);
    const v = ini + (destino - ini) * (k * k * k * (k * (6 * k - 15) + 10));
    if (eixo === "left") el.scrollLeft = v; else el.scrollTop = v;
    if (k < 1) ids.push(window.requestAnimationFrame(passo));
  };
  ids.push(window.requestAnimationFrame(passo));
}

const ICONES: Record<IconeBolinha, { cor: string; d: string[] }> = {
  whatsapp: { cor: "#25D366", d: ["M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z", "M9 8.5c-.3 1.6.8 3.6 2.4 5s3.3 2 4.6 1.6"] },
  endereco: { cor: "#EA4335", d: ["M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z", "M12 12.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"] },
  voucher: { cor: "#111318", d: ["M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 0 0-6V6H3Z", "M14 6v12"] },
  presente: { cor: "#E8508A", d: ["M4 8.5h16v4H4z", "M5 12.5V20h14v-7.5", "M12 8.5V20", "M12 8.5C10 8.5 8 7.8 8 6.2 8 4.9 9 4 10.1 4 11.4 4 12 5.2 12 8.5Zm0 0c2 0 4-.7 4-2.3C16 4.9 15 4 13.9 4 12.6 4 12 5.2 12 8.5Z"] },
  cardapio: { cor: "#F29D38", d: ["M7 3v8a2 2 0 0 0 2 2v8", "M5 3v6a2 2 0 0 0 2 2", "M9 3v6", "M17 21V3c-2.2 1.2-3.5 3.6-3.5 6.5 0 2 1 3.2 3.5 3.5"] },
  delivery: { cor: "#EA1D2C", d: ["M8.6 17h6.8l-2.4-7H9", "M14 6h3l1 4", "M5 10h4", "M8.6 17a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0Z", "M20.6 17a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0Z"] },
  materiais: { cor: "#7B4FE0", d: ["M7 3h7l4 4v14H7z", "M14 3v4h4", "M10 13h5M10 16.5h5"] },
  catalogo: { cor: "#0E9AA7", d: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"] },
};

function Bolinha({ tipo, rotulo }: { tipo: IconeBolinha; rotulo: string }) {
  const ic = ICONES[tipo];
  return (
    <div className="flex w-[58px] flex-col items-center gap-1">
      <span
        className="flex h-[46px] w-[46px] items-center justify-center rounded-full text-white"
        style={{ background: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 48%), ${ic.cor}`, boxShadow: "inset 0 -6px 10px -5px rgba(0,0,0,0.22)" }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {ic.d.map((d) => <path key={d} d={d} />)}
        </svg>
      </span>
      <span className="max-w-full truncate text-[9.5px] leading-none text-text-secondary">{rotulo}</span>
    </div>
  );
}

/** Celular com a vitrine de verdade de marcas reais, trocando de marca sozinho (ou ao toque). */
export function PhoneDemo() {
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  useEffect(() => {
    if (pausado) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % MARCAS_LANDING.length), 4800);
    return () => window.clearInterval(t);
  }, [pausado]);

  const m = MARCAS_LANDING[i];
  const linha = useRef<HTMLDivElement>(null);
  const pagina = useRef<HTMLDivElement>(null);

  // Cada marca: as bolinhas deslizam pro lado, depois a tela sobe mostrando mais.
  useEffect(() => {
    if (pausado) return;
    const l = linha.current, p = pagina.current;
    if (!l || !p) return;
    l.scrollTo({ left: 0 });
    p.scrollTo({ top: 0 });
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return;
    const anim: number[] = [];
    const t = [
      window.setTimeout(() => deslizar(l, "left", l.scrollWidth, 1700, anim), 900),
      window.setTimeout(() => deslizar(l, "left", 0, 1500, anim), 3000),
      window.setTimeout(() => deslizar(p, "top", p.scrollHeight, 6500, anim), 4200),
    ];
    return () => { t.forEach(window.clearTimeout); anim.forEach(window.cancelAnimationFrame); };
  }, [i, pausado]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div aria-hidden className="absolute -inset-10 rounded-full opacity-40 blur-3xl transition-colors duration-700" style={{ background: m.cor }} />
        <div className="relative w-[286px] rounded-[44px] border-[7px] border-[#16171a] shadow-[0_40px_80px_-30px_rgba(17,19,24,0.55)] transition-colors duration-700 sm:w-[310px]" style={{ background: m.fundo }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[37px]">
            <div className="absolute -bottom-24 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full opacity-30 blur-[60px] transition-all duration-700" style={{ backgroundImage: `linear-gradient(135deg, ${m.halo[0]}, ${m.halo[1]})` }} />
          </div>
          <div className="absolute left-1/2 top-2 z-10 h-[18px] w-[84px] -translate-x-1/2 rounded-full bg-[#16171a]" aria-hidden />
          <div key={m.id} ref={pagina} onPointerDown={() => setPausado(true)} className="lp-fade relative z-[1] h-[560px] overflow-y-auto overscroll-contain rounded-[36px] px-4 pb-6 pt-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:h-[600px]">
            <div className="flex flex-col items-center text-center">
              <OrbiAvatar logoUrl={m.logo} size={64} esfera={lerEsfera(m.avatar)?.tom} escala={escalaDoAvatar(m.avatar)} />
              <p className="mt-3 text-[10.5px] uppercase tracking-[0.14em] text-text-tertiary">{m.nome}</p>
              <p className="mt-1 max-w-[220px] text-[11px] leading-snug text-text-secondary">{m.frase}</p>
            </div>

            <div ref={linha} className="-mx-4 mt-5 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {m.bolinhas.map((b) => <Bolinha key={b.rotulo} {...b} />)}
            </div>

            <p className="mt-5 text-center font-[family-name:var(--font-manrope)] text-[16px] font-medium leading-tight tracking-[-0.01em]">{m.pergunta}</p>
            <div className="mt-3 flex items-center justify-between rounded-full px-5 py-3 text-white" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${m.cor} 85%, white), ${m.cor})` }}>
              <span className="text-[13.5px]">{m.principal}</span>
              <span aria-hidden>→</span>
            </div>

            <p className="mb-2 mt-5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-text-tertiary">{m.secao}</p>
            <div className="grid grid-cols-2 gap-3">
              {m.cards.map((c) => (
                <div key={c.titulo} style={{ boxShadow: `0 12px 26px -12px ${m.cor}, 0 0 0 1.5px color-mix(in srgb, ${m.cor} 30%, transparent)` }} className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-surface-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt={c.titulo} loading="eager" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-2 pt-6 text-[10.5px] leading-tight text-white">{c.titulo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lp-float absolute -right-4 bottom-24 hidden items-center gap-2 rounded-full bg-surface-white px-3.5 py-2 text-[12.5px] shadow-[0_14px_34px_-12px_rgba(17,19,24,0.4)] sm:flex">
          <span className="orbi-gradient flex h-6 w-6 items-center justify-center rounded-full text-[11px]" aria-hidden>✦</span>
          Pergunte à Orbi
        </div>
      </div>

      <div role="tablist" aria-label="Marcas de exemplo" className="mt-8 flex max-w-[360px] flex-wrap justify-center gap-2">
        {MARCAS_LANDING.map((t, n) => (
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
