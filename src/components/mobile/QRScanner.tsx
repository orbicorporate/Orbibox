"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";

/** Leitor de QR pela câmera — abre a câmera traseira, procura um QR em cada
 * quadro e devolve o texto lido. Usa jsQR (JavaScript puro) porque a API
 * nativa de leitura do navegador não existe no Safari do iPhone. */
export function QRScanner({ onDetect, onClose }: { onDetect: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        tick();
      } catch {
        setError("Não consegui abrir a câmera. Confira se você permitiu o acesso e tente de novo, ou digite o código.");
      }
    }

    function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w > 0 && h > 0) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            const result = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
            if (result?.data) {
              cancelled = true;
              stream?.getTracks().forEach((t) => t.stop());
              onDetect(result.data.trim());
              return;
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {/* Moldura de mira — só visual, ajuda a pessoa a apontar */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-60 w-60 rounded-[28px] border-[3px] border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        <p className="pointer-events-none absolute inset-x-0 top-12 text-center text-[15px] font-medium text-white">
          Aponte pro QR do cliente
        </p>
        {error && (
          <div className="absolute inset-x-6 bottom-28 rounded-2xl bg-white p-4 text-center text-[13.5px] leading-relaxed text-on-background">
            {error}
          </div>
        )}
      </div>
      <button onClick={onClose} className="m-6 rounded-full bg-white py-3.5 text-[15px] font-semibold text-on-background">
        Cancelar
      </button>
    </div>,
    document.body
  );
}
