"use client";

import { useEffect, useRef } from "react";

/**
 * Emblema animado estilo Google — um "G" branco sobre um quadrado arredondado
 * com gradiente colorido (vermelho/amarelo/verde/azul) que gira, com um leve
 * balanço "dançando" e um reflexo de luz atravessando. Canvas puro (leve).
 * Inspirado no visual do Google sem reproduzir o logotipo oficial.
 */
export function OrbiGoogleIcon({
  size = 44,
  bg = "transparent",
  className = "",
}: {
  size?: number;
  bg?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.4;

    function roundedSquarePath() {
      if (!ctx) return;
      const x = cx - R, y = cy - R, w = R * 2, h = R * 2, rad = R * 0.44;
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + w, y, x + w, y + h, rad);
      ctx.arcTo(x + w, y + h, x, y + h, rad);
      ctx.arcTo(x, y + h, x, y, rad);
      ctx.arcTo(x, y, x + w, y, rad);
      ctx.closePath();
    }

    let raf = 0;
    const start = performance.now();
    let running = true;

    function frame(now: number) {
      if (!running || !ctx) return;
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, size, size);
      if (bg !== "transparent") {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
      }

      const tilt = Math.sin(t * 1.6) * 0.12;
      const scale = 1 + Math.sin(t * 2.2) * 0.03;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      // gradiente colorido girando
      roundedSquarePath();
      const ang = t * 0.7;
      const gx = Math.cos(ang), gy = Math.sin(ang);
      const g = ctx.createLinearGradient(cx - gx * R, cy - gy * R, cx + gx * R, cy + gy * R);
      g.addColorStop(0.0, "#EA4335");
      g.addColorStop(0.33, "#FBBC05");
      g.addColorStop(0.66, "#34A853");
      g.addColorStop(1.0, "#4285F4");
      ctx.fillStyle = g;
      ctx.fill();

      // "G" branco
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${R * 1.5}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("G", cx, cy + R * 0.06);

      // reflexo de luz + brilho superior (recortados no quadrado)
      ctx.save();
      roundedSquarePath();
      ctx.clip();
      const hlx = -1 + ((t * 0.4) % 1) * 2;
      const hl = ctx.createLinearGradient(cx + hlx * R - R * 0.4, cy - R, cx + hlx * R + R * 0.4, cy + R);
      hl.addColorStop(0, "rgba(255,255,255,0)");
      hl.addColorStop(0.5, "rgba(255,255,255,0.45)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.fillRect(0, 0, size, size);
      const top = ctx.createLinearGradient(cx, cy - R, cx, cy);
      top.addColorStop(0, "rgba(255,255,255,0.4)");
      top.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = top;
      ctx.fillRect(cx - R, cy - R, R * 2, R);
      ctx.restore();

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      running = false;
      frame(start);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [size, bg]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size, display: "block" }}
      aria-hidden
    />
  );
}
