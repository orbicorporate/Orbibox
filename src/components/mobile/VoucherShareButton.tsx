"use client";

import { useState } from "react";
import QRCode from "qrcode";

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, align: "center" | "left" = "center") {
  const words = text.split(" ");
  let line = "";
  const cursorY = y;
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => {
    ctx.textAlign = align;
    ctx.fillText(l, x, cursorY + i * lineHeight);
  });
  return cursorY + lines.length * lineHeight;
}

async function buildVoucherImage(title: string, code: string, message: string): Promise<Blob | null> {
  const W = 640, H = 1040;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fundo — mesmo degradê vivo do card na tela.
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#A80F2B");
  grad.addColorStop(1, "#E4264C");
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, W, H, 36);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "64px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🎉", W / 2, 150);

  ctx.font = "500 26px system-ui, -apple-system, sans-serif";
  ctx.fillText(title, W / 2, 210);

  ctx.font = "800 92px system-ui, -apple-system, sans-serif";
  ctx.fillText(code, W / 2, 360);

  // QR do código — a loja escaneia direto da foto salva, sem digitar.
  try {
    const qr = document.createElement("canvas");
    await QRCode.toCanvas(qr, code, { width: 260, margin: 1, color: { dark: "#111318", light: "#FFFFFF" } });
    const box = 300;
    const bx = (W - box) / 2, by = 400;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, bx, by, box, box, 28);
    ctx.fill();
    ctx.drawImage(qr, bx + 20, by + 20, 260, 260);
    ctx.fillStyle = "#ffffff";
  } catch {
    // sem QR, segue só com o código em texto
  }

  ctx.font = "400 24px system-ui, -apple-system, sans-serif";
  ctx.globalAlpha = 0.92;
  wrapText(ctx, message, W / 2, 760, W - 140, 34);
  ctx.globalAlpha = 1;

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function VoucherShareButton({ title, code, message, className }: { title: string; code: string; message: string; className?: string }) {
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    setBusy(true);
    try {
      const blob = await buildVoucherImage(title, code, message);
      if (!blob) return;
      const file = new File([blob], `cupom-${code}.png`, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Cupom ${code}` });
          return;
        } catch {
          // Pessoa cancelou a folha — não faz nada.
          return;
        }
      }

      // Sem share nativo (ex: desktop) — baixa a imagem direto.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cupom-${code}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={busy}
      className={className ?? "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/20 py-3 text-[14px] font-semibold text-white backdrop-blur-sm disabled:opacity-60"}
    >
      {busy ? "Preparando…" : "↗ Compartilhar"}
    </button>
  );
}
