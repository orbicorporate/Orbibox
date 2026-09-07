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
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Monta 4 pontos de degradê interpolando suavemente entre duas cores —
 * mantém o mesmo efeito visual de "matiz variando conforme a altura", só que
 * com as cores que a pessoa escolheu em vez do verde/roxo padrão. */
function buildGradientStops(colorA: string, colorB: string): number[][] {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const steps = 4;
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  });
}

export function OrbiParticleSphere({
  size = 44,
  bg = "transparent",
  variant = "sphere",
  holdCheck = false,
  colors,
  className = "",
}: {
  size?: number;
  bg?: string;
  variant?: "sphere" | "check" | "whatsapp";
  holdCheck?: boolean;
  /** Cores escolhidas pela pessoa em Configurações da Orbi: [primária,
   * secundária, detalhe?]. A esfera interpola entre a primária e a
   * secundária; a cor de detalhe (opcional) aparece em ~10% das partículas,
   * espalhada como um destaque. Ex: ["#22C35E", "#7C3AED", "#D9EC37"]. */
  colors?: string[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorA = colors?.[0];
  const colorB = colors?.[1];
  const colorC = colors?.[2];

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
    // N são as partículas "principais" (também usadas nas formas de check/
    // balão); MICRO é uma segunda leva, bem numerosa (o dobro do que seria só
    // "um extra"), só decorativa — dá aquele efeito de areia fina bem cheia.
    // Todos os pontos (principais e micro) saem na metade do tamanho de base
    // (aplicado mais abaixo, no cálculo do raio de cada frame).
    const N = size < 80 ? 700 : 1400;
    const M = Math.round(N * 1.4);
    const TOTAL = N + M;

    function fibSphere(n: number) {
      const arr: { x: number; y: number; z: number }[] = [];
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = golden * i;
        arr.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
      }
      return arr;
    }
    const pts = fibSphere(N);
    const microPts = fibSphere(M);
    // Marca quais índices (0..TOTAL) são micro, pra saber o raio na hora de desenhar.
    const isMicro = new Uint8Array(TOTAL);
    for (let i = N; i < TOTAL; i++) isMicro[i] = 1;

    // Alvos formando um "check" no plano frontal: perna curta (esquerda-baixo)
    // e perna longa (direita-cima). y positivo = pra baixo na tela.
    // Só as partículas principais (0..N) participam do morph — as micro
    // continuam de fundo, sempre em esfera, e vão sumindo conforme ele avança.
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

    // Alvos formando um balão de conversa (bolha arredondada com cauda) e três
    // pontinhos dentro — evoca "conversa/WhatsApp" sem copiar o logo da Meta.
    const bubbleTarget: { x: number; y: number; z: number }[] = (() => {
      const seg: number[][] = [];
      const w = 0.6, h = 0.46, r = 0.2;
      const arc = (cxr: number, cyr: number, a0: number, a1: number, k: number) => {
        for (let i = 0; i < k; i++) { const a = a0 + (a1 - a0) * i / (k - 1); seg.push([cxr + Math.cos(a) * r, cyr + Math.sin(a) * r]); }
      };
      for (let i = 0; i < 16; i++) seg.push([-w + r + (2 * (w - r)) * i / 15, -h]);
      arc(w - r, -h + r, -Math.PI / 2, 0, 8);
      for (let i = 0; i < 10; i++) seg.push([w, -h + r + (2 * (h - r)) * i / 9]);
      arc(w - r, h - r, 0, Math.PI / 2, 8);
      for (let i = 0; i < 7; i++) seg.push([w - r - ((w - r) - 0.02) * i / 6, h]);
      seg.push([0.02, h]); seg.push([-0.16, h + 0.30]); seg.push([-0.30, h]);
      arc(-w + r, h - r, Math.PI / 2, Math.PI, 8);
      for (let i = 0; i < 10; i++) seg.push([-w, h - r - (2 * (h - r)) * i / 9]);
      arc(-w + r, -h + r, Math.PI, Math.PI * 1.5, 8);
      const dots: number[][] = [];
      for (const cd of [[-0.24, 0], [0, 0], [0.24, 0]]) {
        for (let i = 0; i < 18; i++) { const a = 2 * Math.PI * i / 18; dots.push([cd[0] + Math.cos(a) * 0.075, cd[1] + Math.sin(a) * 0.075]); }
      }
      const out: { x: number; y: number; z: number }[] = [];
      const nb = Math.round(N * 0.62);
      for (let i = 0; i < N; i++) {
        const src = i < nb ? seg[Math.floor((i / nb) * seg.length) % seg.length] : dots[Math.floor(((i - nb) / (N - nb)) * dots.length) % dots.length];
        out.push({ x: src[0] * 1.5, y: src[1] * 1.5, z: 0.15 });
      }
      return out;
    })();

    const R = size * 0.36;
    const cx = size / 2;
    const cy = size / 2;
    const dotScale = size / 130;

    const GREEN = [90, 230, 120];
    const WHATSAPP = [37, 211, 102];
    const morphColor = variant === "whatsapp" ? WHATSAPP : GREEN;

    const SPIN = 2.2, MORPH = 0.9, HOLD = 1.1;
    // No modo "holdCheck" (concluiu no chat), morfa rápido e segura o check.
    const spinDur = holdCheck ? 0.15 : SPIN;
    const morphDur = holdCheck ? 0.45 : MORPH;
    const CYCLE = holdCheck ? 999 : spinDur + morphDur + HOLD + morphDur;
    function ease(x: number) {
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }
    function morphAt(time: number) {
      if (variant === "sphere") return 0;
      if (holdCheck) {
        // vai até o check e fica lá.
        if (time < spinDur) return 0;
        if (time < spinDur + morphDur) return ease((time - spinDur) / morphDur);
        return 1;
      }
      const t = time % CYCLE;
      if (t < spinDur) return 0;
      if (t < spinDur + morphDur) return ease((t - spinDur) / morphDur);
      if (t < spinDur + morphDur + HOLD) return 1;
      return ease(1 - (t - spinDur - morphDur - HOLD) / morphDur);
    }
    const targets = variant === "whatsapp" ? bubbleTarget : checkTarget;

    // Pré-calcula a cor de cada partícula UMA vez (a matiz depende só de p.y,
    // que não muda). Guardamos os 3 canais-base; no frame só aplicamos brilho.
    // Isso evita montar milhares de strings de cor a cada quadro.
    // Se a pessoa escolheu cores próprias (Configurações da Orbi), o degradê
    // de 4 tons vira uma interpolação suave entre a primária e a secundária;
    // senão usa o padrão verde→turquesa→azul→roxo. A cor de detalhe (se
    // houver) se mistura suavemente na parte de baixo — um degradê de verdade
    // (smoothstep), não uma troca abrupta de cor num grupo de partículas.
    const stops = colorA && colorB ? buildGradientStops(colorA, colorB) : [
      [120, 220, 90], [40, 190, 180], [70, 120, 245], [150, 90, 240],
    ];
    const detailRGB = colorC ? hexToRgb(colorC) : null;
    // Zona de transição ampla (da metade pro fundo) pra ficar bem distribuída
    // e suave, sem parecer um remendo de outra cor colado embaixo.
    const DETAIL_Y0 = -0.15, DETAIL_Y1 = 0.9;
    function smoothstep(x: number) {
      const c = Math.max(0, Math.min(1, x));
      return c * c * (3 - 2 * c);
    }
    const baseRGB = new Float32Array(TOTAL * 3);
    const sizeMul = new Float32Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) {
      const p = i < N ? pts[i] : microPts[i - N];
      const micro = i >= N;
      sizeMul[i] = micro ? 0.5 : 1;
      const t = (p.y + 1) / 2;
      const seg = t * (stops.length - 1);
      const s = Math.max(0, Math.min(stops.length - 2, Math.floor(seg)));
      const f = seg - s;
      let r = stops[s][0] + (stops[s + 1][0] - stops[s][0]) * f;
      let g = stops[s][1] + (stops[s + 1][1] - stops[s][1]) * f;
      let b = stops[s][2] + (stops[s + 1][2] - stops[s][2]) * f;
      if (detailRGB) {
        const w = smoothstep((p.y - DETAIL_Y0) / (DETAIL_Y1 - DETAIL_Y0));
        r += (detailRGB[0] - r) * w;
        g += (detailRGB[1] - g) * w;
        b += (detailRGB[2] - b) * w;
      }
      baseRGB[i * 3] = r;
      baseRGB[i * 3 + 1] = g;
      baseRGB[i * 3 + 2] = b;
    }

    // Buffers reutilizados a cada frame — nada é alocado dentro do loop, então
    // o coletor de lixo não interrompe a animação (principal causa de travadas).
    const sxA = new Float32Array(TOTAL);
    const syA = new Float32Array(TOTAL);
    const szA = new Float32Array(TOTAL);
    const order = new Uint16Array(TOTAL);
    for (let i = 0; i < TOTAL; i++) order[i] = i;

    let raf = 0;
    const start = performance.now();
    let running = true;

    function frame(now: number) {
      if (!running || !ctx) return;
      const time = (now - start) / 1000;
      ctx.clearRect(0, 0, size, size);
      if (bg !== "transparent") {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
      }

      const morph = morphAt(time);
      const ay = time * 0.5 * (1 - morph);
      const cosA = Math.cos(ay);
      const sinA = Math.sin(ay);

      // Posiciona cada partícula nos buffers (sem alocar objetos). As micro
      // (i >= N) não têm alvo de morph — continuam sempre em esfera.
      for (let i = 0; i < TOTAL; i++) {
        const p = i < N ? pts[i] : microPts[i - N];
        const x = p.x * cosA - p.z * sinA;
        const z = p.x * sinA + p.z * cosA;
        const y = p.y;
        const wave = 1 + 0.12 * Math.sin(y * 6 + time * 2.2) + 0.06 * Math.cos(x * 5 - time * 1.6);
        let px = x * wave, py = y * wave, pz = z * wave;
        if (morph > 0 && i < N) {
          const tg = targets[i];
          px += (tg.x - px) * morph;
          py += (tg.y - py) * morph;
          pz += (tg.z - pz) * morph;
        }
        sxA[i] = px; syA[i] = py; szA[i] = pz;
      }

      // Ordena por profundidade reaproveitando o mesmo array de índices.
      order.sort((a, b) => szA[a] - szA[b]);

      const kMorph = morph * (variant === "whatsapp" ? 0.9 : 0.85);
      // As micro somem suavemente conforme o morph avança, pra não disputar
      // atenção com o check/balão se formando.
      const microAlpha = 1 - morph * 0.85;
      for (let oi = 0; oi < TOTAL; oi++) {
        const i = order[oi];
        const depth = (szA[i] + 1) / 2;
        const px = cx + sxA[i] * R;
        const py = cy + syA[i] * R;
        const rad = (0.6 + depth * 1.2) * dotScale * sizeMul[i] * 0.5;
        let r = baseRGB[i * 3], g = baseRGB[i * 3 + 1], b0 = baseRGB[i * 3 + 2];
        if (kMorph > 0 && i < N) {
          r += (morphColor[0] - r) * kMorph;
          g += (morphColor[1] - g) * kMorph;
          b0 += (morphColor[2] - b0) * kMorph;
        }
        const b = 0.75 + depth * 0.25;
        const alpha = (0.85 + depth * 0.15) * (isMicro[i] ? microAlpha : 1);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${(r * b) | 0},${(g * b) | 0},${(b0 * b) | 0},${alpha})`;
        ctx.arc(px, py, rad, 0, 6.283185307179586);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      running = false;
      frame(start + (variant !== "sphere" ? (SPIN + MORPH + 0.4) * 1000 : 300));
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [size, bg, variant, holdCheck, colorA, colorB, colorC]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size, display: "block" }}
      aria-hidden
    />
  );
}
