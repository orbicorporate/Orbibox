"use client";

import { useMemo, useRef, useState } from "react";

export type Ratio = "quadrado" | "retrato" | "paisagem";
export const RATIOS: Record<Ratio, { value: number; label: string }> = {
  quadrado: { value: 1, label: "Quadrado" },
  retrato: { value: 4 / 5, label: "Retrato" },
  paisagem: { value: 16 / 9, label: "Paisagem" },
};

/** Medida em pixels recomendada pra cada formato — o que a pessoa cola no
 * gerador de imagem (GPT, Midjourney etc.) pra já sair no tamanho certo. */
export const RATIO_PIXELS: Record<Ratio, string> = {
  quadrado: "1080 x 1080 px",
  retrato: "1080 x 1350 px",
  paisagem: "1920 x 1080 px",
};

const FRAME_W = 300;

/**
 * O que você vê dentro da moldura é exatamente o que vira a foto — arrasta
 * pra posicionar, usa o controle pra aproximar. Sem matemática pro dono ver.
 * Se `lockedRatio` vier preenchido, o formato já foi decidido pela primeira
 * foto desse item — as outras opções ficam travadas, com o motivo explicado,
 * pra capa e galeria nunca ficarem misturando proporção.
 */
export function ImageCropModal({
  file,
  lockedRatio,
  lockedReason,
  onConfirm,
  onCancel,
}: {
  file: File;
  lockedRatio?: Ratio | null;
  lockedReason?: string;
  onConfirm: (blob: Blob, ratio: Ratio) => void;
  onCancel: () => void;
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [ratio, setRatio] = useState<Ratio>(lockedRatio ?? "quadrado");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);

  // Uma URL de objeto por arquivo — sem efeito, sem setState fora de handler.
  const imgUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  if (lastUrl !== imgUrl) {
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    setLastUrl(imgUrl);
  }

  const frameH = FRAME_W / RATIOS[ratio].value;

  const baseScale = useMemo(() => {
    if (!natural) return 1;
    return Math.max(FRAME_W / natural.w, frameH / natural.h);
  }, [natural, frameH]);

  const scale = baseScale * zoom;
  const dispW = natural ? natural.w * scale : 0;
  const dispH = natural ? natural.h * scale : 0;

  // Sempre que troca de formato ou imagem, recentraliza — ajustado durante o
  // render (comparando com a última combinação vista), sem efeito.
  const resetKey = `${ratio}:${imgUrl}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    if (offset.x !== 0 || offset.y !== 0) setOffset({ x: 0, y: 0 });
    if (zoom !== 1) setZoom(1);
  }

  function clamp(off: { x: number; y: number }, w: number, h: number) {
    const maxX = Math.max(0, (w - FRAME_W) / 2);
    const maxY = Math.max(0, (h - frameH) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, off.x)), y: Math.min(maxY, Math.max(-maxY, off.y)) };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clamp({ x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy }, dispW, dispH));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  async function confirm() {
    if (!natural || !imgUrl) return;
    const img = new Image();
    img.src = imgUrl;
    await img.decode();

    const cropX = (dispW / 2 - FRAME_W / 2 - offset.x) / scale;
    const cropY = (dispH / 2 - frameH / 2 - offset.y) / scale;
    const cropW = FRAME_W / scale;
    const cropH = frameH / scale;

    const outW = 1000;
    const outH = Math.round(outW / RATIOS[ratio].value);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
    canvas.toBlob((blob) => { if (blob) onConfirm(blob, ratio); }, "image/jpeg", 0.9);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-[380px] rounded-[24px] bg-surface-white p-5">
        <p className="text-center text-[14px] font-medium">Ajustar foto</p>

        <div className="mt-4 flex justify-center gap-2">
          {lockedRatio ? (
            <span className="rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-medium text-on-background">
              {RATIOS[lockedRatio].label}
            </span>
          ) : (
            (Object.keys(RATIOS) as Ratio[]).map((r) => (
              <button
                key={r}
                onClick={() => setRatio(r)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${ratio === r ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
              >
                {RATIOS[r].label}
              </button>
            ))
          )}
        </div>
        {lockedRatio && (
          <p className="mt-2 text-center text-[11px] text-text-tertiary">
            {lockedReason ?? `A primeira foto deste item já definiu ${RATIOS[lockedRatio].label.toLowerCase()} — as próximas seguem o mesmo formato, pra capa e galeria combinarem.`}
          </p>
        )}

        <div
          className="relative mx-auto mt-4 touch-none overflow-hidden rounded-2xl bg-surface-soft"
          style={{ width: FRAME_W, height: frameH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl}
              alt=""
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="pointer-events-none absolute select-none"
              style={{
                width: dispW || undefined,
                height: dispH || undefined,
                left: `calc(50% + ${offset.x}px)`,
                top: `calc(50% + ${offset.y}px)`,
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="text-[12px] text-text-tertiary">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => {
              const z = Number(e.target.value);
              setZoom(z);
              setOffset((o) => clamp(o, natural ? natural.w * baseScale * z : 0, natural ? natural.h * baseScale * z : 0));
            }}
            className="flex-1"
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-full bg-surface-soft py-3 text-[13px] font-medium">
            Cancelar
          </button>
          <button onClick={confirm} className="flex-1 rounded-full bg-button-primary py-3 text-[13px] font-medium text-white">
            Usar foto
          </button>
        </div>
      </div>
    </div>
  );
}
