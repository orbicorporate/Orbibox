"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export function QRCodeModal({ url, businessName, onClose }: { url: string; businessName: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, { width: 280, margin: 2, color: { dark: "#111318", light: "#FFFFFF" } })
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, [url]);

  function baixar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qrcode-${businessName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={onClose}>
      <div
        className="w-full max-w-[340px] rounded-[28px] bg-surface-white p-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">QR Code do seu Orbibox</p>
        <p className="mt-1 text-[13px] text-text-secondary">Cola no balcão, no cardápio impresso, na embalagem — qualquer lugar físico.</p>
        <div className="mt-4 flex justify-center">
          <canvas ref={canvasRef} className="rounded-2xl" />
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full bg-surface-soft px-4 py-2.5 text-[13px] font-medium">
            Fechar
          </button>
          <button
            onClick={baixar}
            disabled={!ready}
            className="flex-1 rounded-full bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
          >
            Baixar PNG
          </button>
        </div>
      </div>
    </div>
  );
}
