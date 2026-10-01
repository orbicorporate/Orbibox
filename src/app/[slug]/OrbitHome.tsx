"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HomeIcon, isCustomBoxColor } from "@/components/orbi/HomeOptionCard";
import { COR_DA_REDE, FUNDO_DA_REDE, IconeRede, nomeDaRede, type Rede } from "@/lib/redesSociais";
import { abrirEmOrbita, reduzMovimento } from "@/lib/orbitPortal";

export type OrbitaItem = {
  key: string;
  t: string;
  d: string;
  icon: string;
  boxLogo?: string | null;
  color?: string;
  ai?: boolean;
  stars?: boolean;
  cupom?: boolean;
  address?: string;
  /** Abre uma tela dentro do Orbibox (vitrine, sobre, chat...). Link externo
   * não ganha a transição em órbita, a pessoa vai sair da página mesmo. */
  interno: boolean;
  onClick: () => void;
};
export type OrbitaRede = { key: string; t: string; rede: Rede; onClick: () => void };

const PASSO_AUTOMATICO = 3200;
const agora = () => performance.now();

/**
 * Modo Órbita da tela inicial: os mesmos boxes do Modo Box viram planetas
 * numa órbita inclinada em volta de uma esfera fluida com o logo do negócio.
 * O planeta da frente ganha legenda e "Abrir"; a órbita gira sozinha, dá pra
 * arrastar, e tocar num planeta de trás traz ele pra frente. As redes
 * sociais viram luas pequenas numa órbita interna.
 */
export function OrbitHome({
  itens,
  redes,
  nome,
  pergunta,
  logoUrl,
  cores,
  agentName,
  onPerguntar,
}: {
  itens: OrbitaItem[];
  redes: OrbitaRede[];
  nome: string;
  pergunta: string | null;
  logoUrl: string | null;
  cores: string[];
  agentName: string;
  onPerguntar?: () => void;
}) {
  const N = itens.length;
  const PASSO = N > 0 ? (Math.PI * 2) / N : 1;
  const FRENTE = Math.PI / 2;

  const cenaRef = useRef<HTMLDivElement>(null);
  const planetasRef = useRef<(HTMLButtonElement | null)[]>([]);
  const luasRef = useRef<(HTMLButtonElement | null)[]>([]);
  const trilhaRef = useRef<SVGPathElement>(null);
  const trasRef = useRef<SVGPathElement>(null);
  const faiscaRef = useRef<SVGCircleElement>(null);
  const estado = useRef({ ang: FRENTE, alvo: FRENTE, arrastando: false, moveu: false, x: 0, ultimoMov: 0, pausado: false });
  const [frente, setFrente] = useState(0);
  const [endereco, setEndereco] = useState<string | null>(null);

  const frenteDoAlvo = () => {
    const k = Math.round((FRENTE - estado.current.alvo) / PASSO);
    return ((k % N) + N) % N;
  };

  useEffect(() => {
    if (N === 0) return;
    const reduz = reduzMovimento();
    const s = estado.current;
    s.ultimoMov = performance.now();
    let raf = 0;
    let frenteAtual = -1;
    const quadro = (agora: number) => {
      const cena = cenaRef.current;
      if (cena) {
        const W = cena.offsetWidth;
        const CX = W / 2, CY = 190, RX = W * 0.43, RY = 88;
        if (!s.arrastando) s.ang += (s.alvo - s.ang) * (reduz ? 1 : 0.085);
        if (!reduz && !s.arrastando && !s.pausado && agora - s.ultimoMov > PASSO_AUTOMATICO) {
          s.alvo -= PASSO;
          s.ultimoMov = agora;
        }
        const k = Math.round((FRENTE - s.ang) / PASSO);
        const f = ((k % N) + N) % N;
        const assentou = Math.abs(s.alvo - s.ang) < 0.05;
        planetasRef.current.forEach((el, i) => {
          if (!el) return;
          const a = s.ang + i * PASSO;
          const x = CX + Math.cos(a) * RX;
          const y = CY + Math.sin(a) * RY;
          const d = (Math.sin(a) + 1) / 2;
          el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(0.58 + 0.52 * d).toFixed(3)})`;
          el.style.opacity = (0.4 + 0.6 * d).toFixed(2);
          el.style.zIndex = String(Math.sin(a) > -0.05 ? 50 + Math.round(d * 20) : 10 + Math.round(d * 10));
          el.style.filter = d < 0.3 ? `blur(${((0.3 - d) * 3.5).toFixed(1)}px) saturate(.7)` : "none";
          el.classList.toggle("frente", i === f && assentou);
        });
        luasRef.current.forEach((el, i) => {
          if (!el) return;
          const a = -agora * 0.0006 + (i * Math.PI * 2) / luasRef.current.length;
          const x = CX + Math.cos(a) * RX * 0.72;
          const y = CY - 6 + Math.sin(a) * 40;
          const d = (Math.sin(a) + 1) / 2;
          el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(0.75 + 0.35 * d).toFixed(3)})`;
          el.style.zIndex = Math.sin(a) > 0 ? "60" : "5";
          el.style.opacity = (0.55 + 0.45 * d).toFixed(2);
        });
        trilhaRef.current?.setAttribute("d", `M${CX - RX} ${CY} A${RX} ${RY} 0 0 0 ${CX + RX} ${CY}`);
        trasRef.current?.setAttribute("d", `M${CX - RX} ${CY} A${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`);
        const fa = faiscaRef.current;
        if (fa) {
          const t = (agora * 0.00035) % 1, sa = Math.PI * t;
          fa.setAttribute("cx", (CX + Math.cos(Math.PI - sa) * RX).toFixed(1));
          fa.setAttribute("cy", (CY + Math.sin(Math.PI - sa) * RY).toFixed(1));
          fa.setAttribute("opacity", Math.sin(sa).toFixed(2));
        }
        if (f !== frenteAtual) {
          frenteAtual = f;
          setFrente(f);
        }
      }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [N, PASSO, FRENTE]);

  // arrastar pra girar
  useEffect(() => {
    const s = estado.current;
    const mover = (e: PointerEvent) => {
      if (!s.arrastando) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 3) s.moveu = true;
      s.ang += dx * 0.012;
      s.alvo = s.ang;
      s.x = e.clientX;
      s.ultimoMov = performance.now();
    };
    const soltar = () => {
      if (!s.arrastando) return;
      s.arrastando = false;
      s.alvo = FRENTE + Math.round((s.ang - FRENTE) / PASSO) * PASSO;
      s.ultimoMov = performance.now();
      window.setTimeout(() => { s.moveu = false; }, 0);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
  }, [PASSO, FRENTE]);

  function abrir(i: number) {
    const item = itens[i];
    const el = planetasRef.current[i];
    if (!item || !el) return;
    if (item.address) {
      estado.current.pausado = true;
      setEndereco(item.address);
      return;
    }
    if (item.interno) abrirEmOrbita(el, { cores, aoCobrir: item.onClick });
    else item.onClick();
  }

  function tocarPlaneta(i: number) {
    const s = estado.current;
    if (s.moveu) return;
    if (i === frenteDoAlvo()) {
      abrir(i);
      return;
    }
    const base = FRENTE - i * PASSO;
    s.alvo = base + Math.round((s.ang - base) / (Math.PI * 2)) * Math.PI * 2;
    s.ultimoMov = agora();
  }

  const itemFrente = itens[frente];
  const estiloCores = { "--o1": cores[0], "--o2": cores[1] ?? cores[0], "--o3": cores[2] ?? cores[0] } as CSSProperties;

  return (
    <div className="orbita-entra flex w-full flex-col items-center text-center" style={estiloCores}>
      <p className="text-[12px] uppercase tracking-[0.14em] text-text-tertiary">{nome}</p>
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[24px] font-medium leading-[1.15] tracking-[-0.02em]">
        {pergunta?.trim() || "O que trouxe você aqui hoje?"}
      </h1>

      <div
        ref={cenaRef}
        className="relative mt-2 h-[330px] w-full touch-pan-y select-none"
        onPointerDown={(e) => {
          const s = estado.current;
          s.arrastando = true;
          s.moveu = false;
          s.x = e.clientX;
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="orbita-trilha" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={cores[1] ?? cores[0]} stopOpacity="0" />
              <stop offset=".5" stopColor={cores[0]} stopOpacity=".95" />
              <stop offset="1" stopColor={cores[2] ?? cores[0]} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path ref={trasRef} fill="none" stroke="rgba(16,18,22,.14)" strokeWidth="1" strokeDasharray="1 5" />
          <path ref={trilhaRef} fill="none" stroke="url(#orbita-trilha)" strokeWidth="1.6" />
          <circle ref={faiscaRef} r="3" fill="#fff" style={{ filter: `drop-shadow(0 0 5px ${cores[0]})` }} />
        </svg>

        {/* esfera com o logo */}
        <div className="absolute left-1/2 top-[190px] z-30 h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2">
          <span className="orbita-esfera inset-0"><span className="orbita-esfera-halo" /><span className="orbita-esfera-vidro" /></span>
          {logoUrl && (
            <span className="absolute inset-[16px] overflow-hidden rounded-full shadow-[0_2px_8px_rgba(0,0,0,.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            </span>
          )}
        </div>

        {itens.map((o, i) => {
          const custom = isCustomBoxColor(o.color);
          return (
            <button
              key={o.key}
              ref={(el) => { planetasRef.current[i] = el; }}
              type="button"
              onClick={() => tocarPlaneta(i)}
              aria-label={o.t}
              className="orbita-planeta shadow-[0_10px_22px_-10px_rgba(17,19,24,0.45)]"
              style={
                custom
                  ? { background: `linear-gradient(135deg, color-mix(in srgb, ${o.color} 78%, white), ${o.color} 55%, color-mix(in srgb, ${o.color} 85%, black))` }
                  : o.cupom
                    ? { background: "linear-gradient(135deg,#E0335A,#B3123A)" }
                    : { background: "#fff" }
              }
            >
              {/* O ícone é ampliado até o próprio disco dele cobrir o planeta
                  inteiro: a esfera fica cheia, sem aro nem borda em volta. */}
              <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
                <span className={`orbita-icone flex items-center justify-center ${["__logo__", "__orb__", "__orbcheck__", "__orbwa__", "__wadisc__", "__google__"].includes(o.icon) ? "scale-[1.4]" : ""}`}>
                  <HomeIcon icon={o.icon} boxLogo={o.boxLogo} color={o.color} orbiColors={cores} businessLogo={logoUrl} cupom={o.cupom} />
                </span>
              </span>
            </button>
          );
        })}

        {redes.map((r, i) => (
          <button
            key={r.key}
            ref={(el) => { luasRef.current[i] = el; }}
            type="button"
            onClick={r.onClick}
            aria-label={r.t || nomeDaRede(r.rede)}
            className="orbita-lua"
            style={{ background: FUNDO_DA_REDE[r.rede], boxShadow: `0 6px 14px -6px ${COR_DA_REDE[r.rede]}` }}
          >
            <IconeRede rede={r.rede} size={15} />
          </button>
        ))}
      </div>

      {/* legenda do planeta da frente, ou o endereço aberto */}
      <div className="min-h-[150px] w-full px-2" aria-live="polite">
        {endereco ? (
          <div key="endereco" className="orbita-legenda-troca rounded-[22px] bg-surface-white p-5 text-left shadow-[0_6px_24px_rgba(17,19,24,0.10)]">
            <p className="text-[12px] uppercase tracking-[0.14em] text-text-tertiary">Como chegar</p>
            <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{endereco}</p>
            <div className="mt-3 flex gap-2">
              <a href={`https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Abrir no Waze</a>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Abrir no Google</a>
            </div>
            <button type="button" onClick={() => { setEndereco(null); estado.current.pausado = false; estado.current.ultimoMov = agora(); }} className="mt-3 w-full text-center text-[13px] text-text-tertiary">
              ← voltar pra órbita
            </button>
          </div>
        ) : itemFrente ? (
          <div key={itemFrente.key} className="orbita-legenda-troca">
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
              {String(frente + 1).padStart(2, "0")} de {String(N).padStart(2, "0")}
            </p>
            <h2 className="mt-1.5 font-[family-name:var(--font-manrope)] text-[24px] font-medium leading-tight tracking-[-0.02em]">
              {itemFrente.t}
              {itemFrente.ai ? <span className="orbi-gradient-text"> ✦</span> : null}
            </h2>
            {itemFrente.stars && <p className="mt-0.5 text-[13px] tracking-[2px] text-[#FBBC05]">★★★★★</p>}
            <p className="mx-auto mt-1 line-clamp-2 max-w-[30ch] text-[14px] leading-snug text-text-secondary">
              {itemFrente.ai ? `Fale com a ${agentName}, nossa IA.` : itemFrente.d}
            </p>
            <button
              type="button"
              onClick={() => abrir(frente)}
              className="mt-3.5 inline-flex h-10 items-center gap-1.5 rounded-full bg-on-background px-5 text-[14px] font-medium text-white"
            >
              Abrir <span aria-hidden>›</span>
            </button>
            <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
              {itens.map((o, i) => (
                <span key={o.key} className={`h-1.5 rounded-full transition-all duration-300 ${i === frente ? "w-4 bg-on-background" : "w-1.5 bg-on-background/20"}`} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {onPerguntar && (
        <button
          type="button"
          onClick={(e) => abrirEmOrbita(e.currentTarget, { cores, aoCobrir: onPerguntar })}
          className="mt-4 flex h-[54px] w-full items-center gap-3 rounded-full border border-divider bg-surface-white/85 pl-2 pr-2 text-left shadow-[0_14px_30px_-20px_rgba(16,18,22,.5)] backdrop-blur"
          style={estiloCores}
        >
          <span className="relative h-9 w-9 shrink-0"><span className="orbita-esfera inset-0"><span className="orbita-esfera-vidro" /></span></span>
          <span className="flex-1 text-[14px] text-text-tertiary">Pergunte o que quiser…</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-on-background text-white" aria-hidden>↑</span>
        </button>
      )}
    </div>
  );
}
