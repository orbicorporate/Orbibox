"use client";

import { useEffect, useRef } from "react";

/**
 * Esfera de partículas animada — 100% em canvas, nossa, sem depender de
 * vídeo/arquivo externo. Pontos distribuídos numa esfera 3D que gira devagar,
 * com uma onda passando por eles (parecido com uma superfície de água) e um
 * degradê azul→verde→roxo. Serve como ícone especial de box (valor "__orb__").
 *
 * `bg` define o fundo do quadradinho — branco por padrão (combina com o resto
 * do painel). Passe "#000" para o visual escuro original.
 */
export function OrbiParticleSphere({
  size = 44,
  bg = "#ffffff",
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
    const dark = isDark(bg);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Gera uma malha de pontos sobre a superfície de uma esfera (Fibonacci
    // sphere — distribuição uniforme, sem aglomerar nos polos). Menos pontos
    // em ícones pequenos, pra cada partícula ficar visível e brilhante.
    const N = size < 80 ? 240 : 460;
    const pts: { x: number; y: number; z: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }

    const R = size * 0.36;
    const cx = size / 2;
    const cy = size / 2;
    const dotScale = size / 130; // partículas proporcionais ao tamanho

    // Cores do degradê da marca — do verde-limão ao azul e roxo.
    function colorFor(t: number, depth: number) {
      // t: 0..1 ao longo do eixo; depth: 0 (fundo) .. 1 (frente) p/ brilho.
      const stops = [
        [120, 220, 90], // verde-limão
        [40, 190, 180], // turquesa
        [70, 120, 245], // azul
        [150, 90, 240], // roxo
      ];
      const seg = t * (stops.length - 1);
      const i = Math.max(0, Math.min(stops.length - 2, Math.floor(seg)));
      const f = seg - i;
      const c = [
        stops[i][0] + (stops[i + 1][0] - stops[i][0]) * f,
        stops[i][1] + (stops[i + 1][1] - stops[i][1]) * f,
        stops[i][2] + (stops[i + 1][2] - stops[i][2]) * f,
      ];
      const b = 0.7 + depth * 0.3; // frente mais brilhante, base mais viva
      return `rgba(${Math.round(c[0] * b)},${Math.round(c[1] * b)},${Math.round(c[2] * b)},${0.5 + depth * 0.5})`;
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

      const ay = time * 0.5; // giro lento em torno do eixo Y
      const cosA = Math.cos(ay);
      const sinA = Math.sin(ay);

      const drawn = pts
        .map((p) => {
          // rotação em Y
          const x = p.x * cosA - p.z * sinA;
          const z = p.x * sinA + p.z * cosA;
          const y = p.y;
          // onda: desloca o raio conforme uma senóide que viaja pelos pontos
          const wave = 1 + 0.12 * Math.sin(y * 6 + time * 2.2) + 0.06 * Math.cos(x * 5 - time * 1.6);
          return { x: x * wave, y: y * wave, z: z * wave };
        })
        .sort((a, b) => a.z - b.z); // pinta de trás pra frente

      for (const p of drawn) {
        const depth = (p.z + 1) / 2; // 0..1
        const px = cx + p.x * R;
        const py = cy + p.y * R;
        const rad = (0.7 + depth * 1.5) * dotScale;
        const t = (p.y + 1) / 2;
        ctx.beginPath();
        ctx.fillStyle = colorFor(t, depth);
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // brilho central suave (glow)
      const glow = ctx.createRadialGradient(cx, cy - R * 0.2, 1, cx, cy, R * 1.3);
      glow.addColorStop(0, dark ? "rgba(120,150,255,0.20)" : "rgba(120,150,255,0.12)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);

      raf = requestAnimationFrame(frame);
    }

    // Respeita quem prefere menos animação: desenha um quadro estático.
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      running = false;
      frame(start + 300);
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

function isDark(hex: string) {
  const m = hex.replace("#", "");
  if (m.length < 6) return hex === "#000";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128;
}
