"use client";

import { useEffect, useRef } from "react";

/**
 * Emblema 3D de contato — um disco verde girando (de frente → perfil → de
 * frente) com um balão de conversa branco no centro, profundidade lateral,
 * sombra, brilho no topo e um reflexo de luz que atravessa a face. Feito em
 * canvas (leve, sem vídeo). Evoca "WhatsApp/contato" sem copiar o logo da Meta.
 *
 * `bg` transparente por padrão — herda o fundo do box.
 */
export function OrbiContactDisc({
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
    const R = size * 0.34;

    function drawSymbol(scaleX: number, alpha: number) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleX, 1);
      ctx.globalAlpha = alpha;
      // bolha
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.05, R * 0.42, R * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      // cauda
      ctx.beginPath();
      ctx.moveTo(-R * 0.1, R * 0.18);
      ctx.lineTo(-R * 0.34, R * 0.44);
      ctx.lineTo(-R * 0.02, R * 0.24);
      ctx.closePath();
      ctx.fill();
      // três pontinhos verdes
      ctx.fillStyle = "#22C35E";
      for (const dx of [-R * 0.17, 0, R * 0.17]) {
        ctx.beginPath();
        ctx.arc(dx, -R * 0.05, R * 0.055, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    let raf = 0;
    const start = performance.now();
    let running = true;

    function frame(now: number) {
      if (!running || !ctx) return;
      const spin = ((now - start) / 1000) * 1.1; // velocidade de giro
      ctx.clearRect(0, 0, size, size);
      if (bg !== "transparent") {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
      }

      const squash = Math.abs(Math.cos(spin)); // 1 de frente, 0 de perfil
      const rx = R * (0.22 + 0.78 * squash);
      const depth = R * 0.18 * (1 - squash);
      const dir = Math.sin(spin) > 0 ? 1 : -1;

      // sombra
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(cx, cy + R * 1.05, rx * 0.8, R * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // lateral (espessura do disco)
      ctx.fillStyle = "#188C3A";
      ctx.beginPath();
      ctx.ellipse(cx + dir * depth, cy, rx, R, 0, 0, Math.PI * 2);
      ctx.fill();

      // face frontal
      const grad = ctx.createLinearGradient(cx - rx, cy - R, cx + rx, cy + R);
      grad.addColorStop(0, "#57E877");
      grad.addColorStop(0.5, "#25D366");
      grad.addColorStop(1, "#1CB050");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2);
      ctx.fill();

      // símbolo (some quando de perfil)
      if (squash > 0.22) {
        drawSymbol(rx / R, Math.min(1, (squash - 0.22) / 0.3));
      }

      // reflexo de luz móvel + brilho superior (recortados na face)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, R, 0, 0, Math.PI * 2);
      ctx.clip();
      const hlx = -1 + ((spin * 0.42) % 1) * 2;
      const hl = ctx.createLinearGradient(cx + hlx * rx - rx * 0.5, cy - R, cx + hlx * rx + rx * 0.5, cy + R);
      hl.addColorStop(0, "rgba(255,255,255,0)");
      hl.addColorStop(0.5, "rgba(255,255,255,0.5)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.fillRect(0, 0, size, size);
      const top = ctx.createLinearGradient(cx, cy - R, cx, cy);
      top.addColorStop(0, "rgba(255,255,255,0.35)");
      top.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = top;
      ctx.fillRect(cx - rx, cy - R, rx * 2, R);
      ctx.restore();

      raf = requestAnimationFrame(frame);
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      running = false;
      frame(start); // quadro estático de frente
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
