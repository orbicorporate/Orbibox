"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/** QR do cupom resgatado — a loja escaneia isso na hora do atendimento em
 * vez de digitar o código. O conteúdo é só o código, simples de validar. */
export function VoucherQRCode({ code, size = 168 }: { code: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, code, { width: size, margin: 1, color: { dark: "#111318", light: "#FFFFFF" } }).catch(() => {
      // Se falhar, fica sem QR — o código em texto continua ali.
    });
  }, [code, size]);

  return (
    <div className="inline-flex flex-col items-center rounded-[20px] bg-white p-3 shadow-[0_6px_20px_rgba(17,19,24,0.12)]">
      <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />
      <p className="mt-1.5 text-[11px] font-medium text-text-tertiary">Mostre pra escanear</p>
    </div>
  );
}
