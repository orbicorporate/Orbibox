import type { CSSProperties } from "react";

/** Posição e tamanho da logo dentro da bolinha: zoom (0,5 a 2,5) e deslocamento em % do tamanho da logo. */
export type LogoAjuste = { z: number; x: number; y: number };
export const LOGO_ZOOM_MIN = 0.5;
export const LOGO_ZOOM_MAX = 2.5;
export const LOGO_DESLOC_MAX = 45;

export function limitarLogo(a: LogoAjuste): LogoAjuste {
  const n = (v: number, d: number) => (Number.isFinite(v) ? v : d);
  const c = (v: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, v));
  return { z: c(n(a.z, 1), LOGO_ZOOM_MIN, LOGO_ZOOM_MAX), x: c(n(a.x, 0), -LOGO_DESLOC_MAX, LOGO_DESLOC_MAX), y: c(n(a.y, 0), -LOGO_DESLOC_MAX, LOGO_DESLOC_MAX) };
}

export function lerLogoAjuste(v: unknown): LogoAjuste | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.z !== "number" || typeof o.x !== "number" || typeof o.y !== "number") return null;
  const a = limitarLogo({ z: o.z, x: o.x, y: o.y });
  return a.z === 1 && a.x === 0 && a.y === 0 ? null : a;
}

/**
 * A logo da marca dentro de uma bolinha: inteira (sem cortar), com o efeito esfera
 * e, se o dono ajustou, no tamanho e na posição que ele escolheu. É o mesmo desenho
 * na Home e na prévia do editor.
 */
export function LogoBolinha({ src, ajuste, linha = false }: { src: string; ajuste?: LogoAjuste | null; linha?: boolean }) {
  const a = ajuste ? limitarLogo(ajuste) : null;
  const img: CSSProperties = {
    WebkitTouchCallout: "none",
    WebkitUserSelect: "none",
    userSelect: "none",
    ...(linha ? { filter: "grayscale(1) contrast(1.15)" } : {}),
    ...(a ? { transform: `translate(${a.x}%, ${a.y}%) scale(${a.z})` } : {}),
  };
  return (
    <span
      className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden rounded-full"
      style={linha ? undefined : { background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 52%), #ECEAE4", boxShadow: "inset 0 -7px 12px -5px rgba(0,0,0,0.20), inset 0 1.5px 2px rgba(255,255,255,0.9), 0 6px 16px -6px rgba(17,19,24,0.38)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} style={img} className="h-[70%] w-[70%] object-contain" />
    </span>
  );
}
