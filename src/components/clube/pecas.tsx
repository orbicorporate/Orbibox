"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* ---------- Movimento reduzido ---------- */
function assinar(cb: () => void) {
  const m = window.matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
export function useReduzido(): boolean {
  return useSyncExternalStore(assinar, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
}

/* ---------- Rosto: foto do Google ou iniciais com cor ---------- */
const CORES = [
  "linear-gradient(135deg,#FF9A3C,#F2556B)", "linear-gradient(135deg,#E5489B,#9B59D9)", "linear-gradient(135deg,#1DB8A4,#62D36F)",
  "linear-gradient(135deg,#3E8BEA,#35C3D9)", "linear-gradient(135deg,#D6A13C,#F2C94C)", "linear-gradient(135deg,#7D5BA6,#4C8DF0)",
];
export function corDe(txt: string): string {
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
  return CORES[h % CORES.length];
}
export function Rosto({ url, nome, size, blob = false, className = "", aro }: { url?: string | null; nome?: string | null; size: number; blob?: boolean; className?: string; aro?: string }) {
  const ini = (nome ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`cl-av ${blob ? "cl-blob" : ""} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), backgroundImage: url ? `url("${url}")` : corDe(nome ?? "?"), ...(aro ? { borderColor: aro, boxShadow: `0 6px 16px rgba(0,0,0,.18), 0 0 0 4px ${aro}2E` } : null) }}
      aria-hidden
    >
      {url ? null : ini}
    </span>
  );
}

/* ---------- Ícones ---------- */
export const IcX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IcChev = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="ml-auto opacity-85" aria-hidden>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
export function Estrela({ cheia, tam = 16, cor = "#FF9A3C" }: { cheia: boolean; tam?: number; cor?: string }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" aria-hidden>
      <path fill={cheia ? cor : "rgba(20,22,26,.14)"} d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}
export const IcBalao = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden>
    <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H10l-4.5 3.5V17H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
  </svg>
);
export const IcCoracao = ({ cheio, tamanho = 20 }: { cheio: boolean; tamanho?: number }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill={cheio ? "#F2556B" : "none"} stroke={cheio ? "#F2556B" : "currentColor"} strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
    <path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.7 3.7 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.3 0 5.4 3.2 4.2 6.7-1.7 4.7-9.2 9.3-9.2 9.3z" />
  </svg>
);

/* ---------- Folha em tela cheia que abre a partir do ponto tocado ---------- */
export function Folha({ origem, aoFechar, rotulo, children }: { origem: DOMRect | null; aoFechar: () => void; rotulo: string; children: (fechar: () => void) => ReactNode }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [fechando, setFechando] = useState(false);
  const reduzido = useReduzido();

  const desde = () => {
    const r = origem;
    const w = window.innerWidth, h = window.innerHeight;
    return r ? `inset(${r.top}px ${w - r.right}px ${h - r.bottom}px ${r.left}px round 999px)` : "inset(45% 30% 45% 30% round 999px)";
  };

  useLayoutEffect(() => {
    if (!el) return;
    const a = el.animate([{ clipPath: desde() }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], { duration: reduzido ? 1 : 540, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" });
    const id = requestAnimationFrame(() => el.classList.add("on"));
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      a.cancel();
      document.body.style.overflow = antes;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el]);

  const fechar = () => {
    if (!el || fechando) return;
    setFechando(true);
    el.classList.remove("on");
    const a = el.animate([{ clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: desde() }], { duration: reduzido ? 1 : 380, easing: "cubic-bezier(.5,0,.2,1)", fill: "both" });
    a.onfinish = () => aoFechar();
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el, fechando]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div ref={setEl} className="cl-folha" role="dialog" aria-modal="true" aria-label={rotulo} style={{ clipPath: desde() }}>
      <div className="cl-col">{children(fechar)}</div>
    </div>,
    document.body,
  );
}

export function Cabecalho({ titulo, sub, fechar, rotuloFechar = "Fechar" }: { titulo: string; sub?: string; fechar: () => void; rotuloFechar?: string }) {
  return (
    <div className="cl-entra flex items-center justify-between gap-3 px-5 pb-2 pt-[max(18px,env(safe-area-inset-top))]" style={{ ["--i" as string]: 0 }}>
      <div className="min-w-0">
        <h2 className="truncate font-[family-name:var(--font-manrope)] text-[20px] font-extrabold tracking-[-0.02em] text-on-background">{titulo}</h2>
        {sub ? <p className="truncate text-[13px] text-text-tertiary">{sub}</p> : null}
      </div>
      <button type="button" onClick={fechar} aria-label={rotuloFechar} className="cl-x text-on-background active:scale-95">
        <IcX />
      </button>
    </div>
  );
}

/* ---------- Órbita ---------- */
export type ItemOrbita = { legenda?: string | null; key: string; size: number; anel: number; node: ReactNode; rotulo: string; aoTocar: () => void };

export function Orbita({ itens, aneis, centro }: { itens: ItemOrbita[]; aneis: { r: number; velocidade: number; cor?: string }[]; centro: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const reduzido = useReduzido();

  const meta = useMemo(() => {
    const contagem: number[] = aneis.map(() => 0);
    itens.forEach((i) => { contagem[i.anel]++; });
    const visto: number[] = aneis.map(() => 0);
    return itens.map((i) => {
      const k = visto[i.anel]++;
      return { anel: i.anel, a0: (k / Math.max(1, contagem[i.anel])) * Math.PI * 2 + i.anel * 0.9 };
    });
  }, [itens, aneis]);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const quadro = (now: number) => {
      const h = host.current;
      if (!h) return;
      const S = h.clientWidth / 2;
      const t = reduzido ? 0 : (now - t0) / 1000;
      meta.forEach((m, i) => {
        const el = els.current[i];
        if (!el) return;
        const a = m.a0 + t * aneis[m.anel].velocidade;
        el.style.transform = `translate(${Math.cos(a) * aneis[m.anel].r * S}px,${Math.sin(a) * aneis[m.anel].r * S}px)`;
      });
      if (!reduzido) raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [meta, aneis, reduzido]);

  return (
    <div ref={host} className="cl-orbita">
      {aneis.map((a, k) => (
        <span key={k} className="cl-disco" style={{ width: `${a.r * 200 + 11}%`, height: `${a.r * 200 + 11}%`, opacity: 1 - k * 0.12, ...(a.cor ? { background: `${a.cor}09`, boxShadow: `inset 0 0 0 1px ${a.cor}15` } : null) }} />
      ))}
      <div className="cl-centro">{centro}</div>
      {itens.map((it, i) => (
        <div key={it.key} className="cl-item" ref={(e) => { els.current[i] = e; }}>
          <button type="button" aria-label={it.rotulo} onClick={it.aoTocar} style={{ width: it.size, height: it.size, animationDelay: `${220 + i * 28}ms` }}>
            {it.node}
          </button>
          {it.legenda ? <span className="cl-legenda" style={{ top: it.size / 2 + 2 }}>{it.legenda}</span> : null}
        </div>
      ))}
    </div>
  );
}
