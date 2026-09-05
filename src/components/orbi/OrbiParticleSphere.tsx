"use client";

import { useEffect, useRef } from "react";

/**
 * Esfera de partículas animada — 100% em canvas, nossa, sem depender de
 * vídeo/arquivo externo. Pontos numa esfera 3D que gira devagar, com uma onda
 * viajando por eles e o degradê verde→azul→roxo da marca.
 *
 * `variant`:
 *   - "sphere" (padrão): a esfera girando pra sempre.
 *   - "check": a esfera gira, as partículas se reorganizam formando um ✓ verde,
 *     seguram um instante, e voltam pra esfera — em loop. Mais verde.
 *
 * `bg` é o fundo do quadradinho (preto por padrão, que deixa as partículas
 * vibrantes).
 */
export function OrbiParticleSphere({
  size = 44,
  bg = "#000000",
  variant = "sphere",
  className = "",
}: {
  size?: number;
  bg?: string;
  variant?: "sphere" | "check";
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

    // Malha de pontos sobre a esfera (Fibonacci sphere — distribuição uniforme).
    const N = size < 80 ? 700 : 1400;
    const pts: { x: number; y: number; z: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }

    // Alvos formando um "check" no plano frontal: perna curta (esquerda-baixo)
    // e perna longa (direita-cima). y positivo = pra baixo na tela.
    const A = [-0.45, -0.05], B = [-0.15, 0.30], C = [0.5, -0.4];
    const l1 = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const l2 = Math.hypot(C[0] - B[0], C[1] - B[1]);
    const n1 = Math.round(N * (l1 / (l1 + l2)));
    const checkTarget: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < N; i++) {
      let tx: number, ty: number;
      if (i < n1) {
        const t = n1 > 1 ? i / (n1 - 1) : 0;
        tx = A[0] + (B[0] - A[0]) * t;
        ty = A[1] + (B[1] - A[1]) * t;
      } else {
        const t = N - n1 > 1 ? (i - n1) / (N - n1 - 1) : 0;
        tx = B[0] + (C[0] - B[0]) * t;
        ty = B[1] + (C[1] - B[1]) * t;
      }
      const jitter = ((i % 5) - 2) * 0.012;
      checkTarget.push({ x: tx * 1.7, y: ty * 1.7 + jitter, z: 0.15 });
    }

    const R = size * 0.36;
    const cx = size / 2;
    const cy = size / 2;
    const dotScale = size / 130;

    const GREEN = [90, 230, 120];
    function colorFor(t: number, depth: number, morph: number) {
      const stops = [
        [120, 220, 90],
        [40, 190, 180],
        [70, 120, 245],
        [150, 90, 240],
      ];
      const seg = t * (stops.length - 1);
      const i = Math.max(0, Math.min(stops.length - 2, Math.floor(seg)));
      const f = seg - i;
      let c = [
        stops[i][0] + (stops[i + 1][0] - stops[i][0]) * f,
        stops[i][1] + (stops[i + 1][1] - stops[i][1]) * f,
        stops[i][2] + (stops[i + 1][2] - stops[i][2]) * f,
      ];
      if (morph > 0) {
        const k = morph * 0.85;
        c = [c[0] + (GREEN[0] - c[0]) * k, c[1] + (GREEN[1] - c[1]) * k, c[2] + (GREEN[2] - c[2]) * k];
      }
      const b = 0.7 + depth * 0.3;
      return `rgba(${Math.round(c[0] * b)},${Math.round(c[1] * b)},${Math.round(c[2] * b)},${0.5 + depth * 0.5})`;
    }

    const SPIN = 2.2, MORPH = 0.9, HOLD = 1.1;
    const CYCLE = SPIN + MORPH + HOLD + MORPH;
    function ease(x: number) {
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }
    function morphAt(time: number) {
      if (variant !== "check") return 0;
      const t = time % CYCLE;
      if (t < SPIN) return 0;
      if (t < SPIN + MORPH) return ease((t - SPIN) / MORPH);
      if (t < SPIN + MORPH + HOLD) return 1;
      return ease(1 - (t - SPIN - MORPH - HOLD) / MORPH);
    }

    let raf = 0;
    const start = performance.now();
    let running = true;

    function frame(now: number) {
      if (!running || !ctx) return;
      const time = (now - start) / 1000;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);

      const morph = morphAt(time);
      const ay = time * 0.5 * (1 - morph);
      const cosA = Math.cos(ay);
      const sinA = Math.sin(ay);

      const drawn = pts
        .map((p, idx) => {
          const x = p.x * cosA - p.z * sinA;
          const z = p.x * sinA + p.z * cosA;
          const y = p.y;
          const wave = 1 + 0.12 * Math.sin(y * 6 + time * 2.2) + 0.06 * Math.cos(x * 5 - time * 1.6);
          const sx = x * wave, sy = y * wave, sz = z * wave;
          if (morph > 0) {
            const tg = checkTarget[idx];
            return {
              x: sx + (tg.x - sx) * morph,
              y: sy + (tg.y - sy) * morph,
              z: sz + (tg.z - sz) * morph,
              t: (p.y + 1) / 2,
            };
          }
          return { x: sx, y: sy, z: sz, t: (p.y + 1) / 2 };
        })
        .sort((a, b) => a.z - b.z);

      for (const p of drawn) {
        const depth = (p.z + 1) / 2;
        const px = cx + p.x * R;
        const py = cy + p.y * R;
        const rad = (0.6 + depth * 1.2) * dotScale;
        ctx.beginPath();
        ctx.fillStyle = colorFor(p.t, depth, morph);
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      const glow = ctx.createRadialGradient(cx, cy - R * 0.2, 1, cx, cy, R * 1.3);
      const gc = morph > 0.5 ? "rgba(90,230,120,0.22)" : "rgba(120,150,255,0.20)";
      glow.addColorStop(0, gc);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      raf = requestAnimationFrame(frame);
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      running = false;
      frame(start + (variant === "check" ? (SPIN + MORPH + 0.4) * 1000 : 300));
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [size, bg, variant]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size, display: "block" }}
      aria-hidden
    />
  );
}
