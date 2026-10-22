"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HomeIcon, isCustomBoxColor } from "@/components/orbi/HomeOptionCard";
import { isAnimatedIcon } from "@/lib/showcase";

/**
 * Abertura da Home em grade: a órbita aparece por um instante (logo no meio,
 * os boxes girando em volta) e se acomoda na grade. Cada planeta voa até o
 * box de verdade e se dissolve nele; o logo encolhe até o lugar dele.
 *
 * Roda uma vez por sessão, só na primeira carga da página, e nunca com
 * "reduzir movimento". Para não piscar a grade antes, a abertura vem no HTML
 * do servidor e um script curto decide, antes da primeira pintura, se ela
 * aparece (window.__abertura = "on") ou some na hora.
 */
export type PlanetaAbertura = { key: string; icon: string; boxLogo?: string | null; color?: string; cupom?: boolean; imagem?: string | null };

const DUR_GIRO = 900;
const DUR_ASSENTA = 560;
const EASE_IOS = "cubic-bezier(.32,.72,0,1)";
const RX = 138, RY = 56;

declare global {
  interface Window { __abertura?: "on" | "off" | "done" }
}

function posicao(i: number, n: number, giro: number) {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + giro;
  const z = Math.sin(a); // -1 atrás, 1 na frente
  return { x: Math.cos(a) * RX, y: Math.sin(a) * RY, s: 0.78 + (z + 1) * 0.14, z };
}

export function AberturaOrbita({ slug, planetas, logo, cores, logoUrl }: { slug: string; planetas: PlanetaAbertura[]; logo: ReactNode; cores: string[] | null; logoUrl: string | null }) {
  const [vivo, setVivo] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const anelRef = useRef<SVGSVGElement>(null);
  const plRef = useRef<(HTMLSpanElement | null)[]>([]);
  const itens = planetas.slice(0, 8);
  const n = Math.max(itens.length, 1);

  useEffect(() => {
    if (window.__abertura !== "on") { queueMicrotask(() => setVivo(false)); return; }
    window.__abertura = "done";
    const fundo = raiz.current, lg = logoRef.current;
    if (!fundo || !lg) return;
    document.documentElement.style.overflow = "hidden";

    let giro = 0, raf = 0, assentou = false;
    const t0 = performance.now();
    const pos = itens.map((_, i) => posicao(i, n, 0));
    const aplicar = () => itens.forEach((_, i) => {
      const el = plRef.current[i];
      const p = (pos[i] = posicao(i, n, giro));
      if (el) { el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.s})`; el.style.zIndex = String(p.z > 0 ? 3 : 1); }
    });

    // A entrada (logo, anel e planetas surgindo) é CSS e já começou na carga.
    // Aqui o JS assume: tira a trava de segurança e gira a órbita freando.
    fundo.style.animation = "none";
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / DUR_GIRO);
      giro = 0.95 * (1 - Math.pow(1 - k, 3));
      aplicar();
      if (k < 1) raf = requestAnimationFrame(passo);
      else assentar();
    };
    aplicar();
    // Página que demorou para ficar pronta: não segura mais ninguém, assenta já.
    if (performance.now() > 1400) assentar();
    else raf = requestAnimationFrame(passo);

    function assentar() {
      if (assentou) return;
      assentou = true;
      cancelAnimationFrame(raf);
      fundo!.style.pointerEvents = "none";
      const centro = lg!.getBoundingClientRect();
      const cx = centro.left + centro.width / 2, cy = centro.top + centro.height / 2;
      const grade = document.querySelector("[data-abertura-grade]");
      const alvoLogo = document.querySelector("[data-abertura-logo]")?.getBoundingClientRect();
      const alvos = grade
        ? Array.from(grade.querySelectorAll<HTMLElement>("a, button"))
            .map((e) => e.getBoundingClientRect())
            .filter((r) => r.width >= 40 && r.height >= 40 && r.top < window.innerHeight && r.bottom > 0 && (!alvoLogo || r.top >= alvoLogo.bottom - 4))
        : [];
      // Cada planeta volta para o próprio box: a órbita e a grade têm a mesma ordem.
      itens.forEach((_, i) => {
        const k = i;
        const el = plRef.current[i];
        if (!el) return;
        const p = pos[i];
        const de = `translate(${p.x}px, ${p.y}px) scale(${p.s})`;
        const r = alvos[k];
        const para = r
          ? `translate(${r.left + r.width / 2 - cx}px, ${r.top + r.height / 2 - cy}px) scale(${Math.min(1.35, Math.max(0.7, Math.min(r.width, r.height) / 56))})`
          : `translate(${p.x * 1.6}px, ${p.y * 1.6}px) scale(${p.s * 0.9})`;
        el.animate(
          [{ transform: de, opacity: 1 }, { opacity: 1, offset: 0.55 }, { transform: para, opacity: 0 }],
          { duration: r ? DUR_ASSENTA : 320, delay: k * 28, easing: EASE_IOS, fill: "forwards" },
        );
      });
      if (alvoLogo) {
        lg!.animate(
          [{ transform: "translate(0,0) scale(1.25)", opacity: 1 }, { opacity: 1, offset: 0.7 }, { transform: `translate(${alvoLogo.left + alvoLogo.width / 2 - cx}px, ${alvoLogo.top + alvoLogo.height / 2 - cy}px) scale(1)`, opacity: 0 }],
          { duration: DUR_ASSENTA, easing: EASE_IOS, fill: "forwards" },
        );
      } else {
        lg!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" });
      }
      anelRef.current?.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.15)" }], { duration: 360, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
      const sai = fundo!.animate([{ backgroundColor: getComputedStyle(fundo!).backgroundColor }, { backgroundColor: "transparent" }], { duration: 440, delay: 90, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" });
      const fim = () => { document.documentElement.style.overflow = ""; setVivo(false); };
      Promise.all([sai.finished, new Promise((r) => setTimeout(r, DUR_ASSENTA + itens.length * 28 + 40))]).then(fim, fim);
    }

    // Tocar pula direto para o assentamento.
    const pular = () => assentar();
    fundo.addEventListener("pointerdown", pular);
    return () => { cancelAnimationFrame(raf); fundo.removeEventListener("pointerdown", pular); document.documentElement.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!vivo) return null;
  const decidir = `try{var k='orbibox-abertura:${slug.replace(/[^\w-]/g, "")}',q=location.search,m=localStorage.getItem('orbibox-modo-home:${slug.replace(/[^\w-]/g, "")}');if(window.__abertura||sessionStorage.getItem(k)||m==='orbita'||matchMedia('(prefers-reduced-motion: reduce)').matches||/[?&](v|cardapio|tab|chat|msg|delivery|materiais|preview|estilo|clube)=/.test(q)){window.__abertura=window.__abertura||'off';document.documentElement.setAttribute('data-sem-abertura','')}else{sessionStorage.setItem(k,'1');window.__abertura='on'}}catch(e){window.__abertura='off';document.documentElement.setAttribute('data-sem-abertura','')}`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: decidir }} suppressHydrationWarning />
      <div ref={raiz} className="abertura" aria-hidden>
        <div className="abertura-palco">
          <svg ref={anelRef} className="abertura-anel" width={RX * 2 + 40} height={RY * 2 + 40} viewBox={`${-RX - 20} ${-RY - 20} ${RX * 2 + 40} ${RY * 2 + 40}`}>
            <ellipse cx="0" cy="0" rx={RX} ry={RY} fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 6" strokeLinecap="round" />
          </svg>
          {itens.map((o, i) => {
            const p = posicao(i, n, 0);
            const solto = isAnimatedIcon(o.icon) && !o.imagem;
            const custom = isCustomBoxColor(o.color);
            return (
              <span
                key={o.key}
                ref={(el) => { plRef.current[i] = el; }}
                className={solto ? "orbita-planeta orbita-planeta-orbi abertura-planeta" : "orbita-planeta abertura-planeta shadow-[0_10px_22px_-10px_rgba(17,19,24,0.45)]"}
                style={{
                  transform: `translate(${p.x}px, ${p.y}px) scale(${p.s})`,
                  zIndex: p.z > 0 ? 3 : 1,
                  background: solto ? "transparent" : custom ? `linear-gradient(135deg, color-mix(in srgb, ${o.color} 78%, white), ${o.color} 55%, color-mix(in srgb, ${o.color} 85%, black))` : o.cupom ? "linear-gradient(135deg,#E0335A,#B3123A)" : "#fff",
                }}
              >
                {o.imagem ? (
                  <span className="absolute inset-0 overflow-hidden rounded-full bg-surface-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.imagem} alt="" className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span className={`absolute inset-0 flex items-center justify-center rounded-full ${solto ? "" : "overflow-hidden"}`}>
                    <span className={`flex items-center justify-center ${o.icon === "__logo__" ? "scale-[1.4]" : solto ? "scale-[1.2]" : ""}`}>
                      <HomeIcon icon={o.icon} boxLogo={o.boxLogo} color={o.color} orbiColors={cores} businessLogo={logoUrl} cupom={o.cupom} />
                    </span>
                  </span>
                )}
              </span>
            );
          })}
          <div ref={logoRef} className="abertura-logo">{logo}</div>
        </div>
      </div>
    </>
  );
}
