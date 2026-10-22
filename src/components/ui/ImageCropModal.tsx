"use client";

import { useMemo, useRef, useState } from "react";
import { ZERO, exportarAjustada, temAjustes, type Ajustes } from "@/lib/foto-edicao";
import { PainelAjustes } from "./PainelAjustes";

export type Ratio = "quadrado" | "retrato" | "paisagem" | "banner";
export const RATIOS: Record<Ratio, { value: number; label: string }> = {
  quadrado: { value: 1, label: "Quadrado" },
  retrato: { value: 4 / 5, label: "Retrato" },
  paisagem: { value: 16 / 9, label: "Paisagem" },
  banner: { value: 1920 / 830, label: "Banner (bem largo)" },
};

/** Medida em pixels recomendada pra cada formato, o que a pessoa cola no
 * gerador de imagem (GPT, Midjourney etc.) pra já sair no tamanho certo. */
export const RATIO_PIXELS: Record<Ratio, string> = {
  quadrado: "1080 x 1080 px",
  retrato: "1080 x 1350 px",
  paisagem: "1920 x 1080 px",
  banner: "1920 x 830 px",
};

const FRAME_W = 300;

/**
 * O que você vê dentro da moldura é exatamente o que vira a foto, arrasta
 * pra posicionar, usa o controle pra aproximar. Sem matemática pro dono ver.
 * Se `lockedRatio` vier preenchido, o formato já foi decidido pela primeira
 * foto desse item, as outras opções ficam travadas, com o motivo explicado,
 * pra capa e galeria nunca ficarem misturando proporção.
 */
export function ImageCropModal({
  file,
  lockedRatio,
  lockedReason,
  onConfirm,
  onCancel,
  camada = "z-50",
  redonda = false,
}: {
  file: File;
  lockedRatio?: Ratio | null;
  lockedReason?: string;
  /** Classe de z-index, para abrir por cima de telas que já ficam acima do padrão. */
  camada?: string;
  /** Mostra a moldura redonda (foto de perfil). */
  redonda?: boolean;
  onConfirm: (blob: Blob, ratio: Ratio) => void;
  onCancel: () => void;
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [ratio, setRatio] = useState<Ratio>(lockedRatio ?? "quadrado");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);
  // Segunda etapa (opcional): ajustar luz, cor etc. na foto já recortada.
  const [cortada, setCortada] = useState<{ blob: Blob; url: string } | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes>(ZERO);
  const [salvando, setSalvando] = useState(false);
  const [erroAjuste, setErroAjuste] = useState<string | null>(null);

  // Uma URL de objeto por arquivo, sem efeito, sem setState fora de handler.
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

  // Sempre que troca de formato ou imagem, recentraliza, ajustado durante o
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

  /** Recorta o que está dentro da moldura e devolve a foto pronta. */
  async function recortar(): Promise<Blob | null> {
    if (!natural || !imgUrl) return null;
    const img = new Image();
    img.src = imgUrl;
    await img.decode();

    const cropX = (dispW / 2 - FRAME_W / 2 - offset.x) / scale;
    const cropY = (dispH / 2 - frameH / 2 - offset.y) / scale;
    const cropW = FRAME_W / scale;
    const cropH = frameH / scale;

    // Resolução de saída: banner (capa da vitrine) aparece em largura total,
    // então merece mais pixels pra ficar nítido em telas grandes. Os outros
    // formatos (cards) aparecem menores, 1000px basta.
    const outW = ratio === "banner" ? 1600 : 1000;
    const outH = Math.round(outW / RATIOS[ratio].value);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Suaviza o redimensionamento (melhor qualidade ao reduzir).
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

    // WebP é ~30% mais leve que JPEG na mesma qualidade. Se o navegador não
    // suportar exportar WebP (raro), cai pra JPEG automaticamente.
    const webp = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
    if (webp && webp.type === "image/webp") return webp;
    return new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.9));
  }

  async function confirm() {
    const blob = await recortar();
    if (blob) onConfirm(blob, ratio);
  }

  async function irParaAjuste() {
    const blob = await recortar();
    if (!blob) return;
    setAjustes(ZERO);
    setErroAjuste(null);
    setCortada({ blob, url: URL.createObjectURL(blob) });
  }

  function voltarParaRecorte() {
    if (cortada) URL.revokeObjectURL(cortada.url);
    setCortada(null);
  }

  async function concluirAjuste() {
    if (!cortada) return;
    if (!temAjustes(ajustes)) return onConfirm(cortada.blob, ratio);
    setSalvando(true);
    setErroAjuste(null);
    try {
      const final = await exportarAjustada(cortada.url, ajustes, { max: 2000, tipo: cortada.blob.type });
      onConfirm(final, ratio);
    } catch {
      setErroAjuste("Não consegui salvar a foto. Tente de novo.");
    }
    setSalvando(false);
  }

  return (
    <div className={`fixed inset-0 ${camada} flex flex-col items-center justify-center bg-black/70 px-6`}>
      {cortada ? (
        <div className="max-h-[94dvh] w-full max-w-[420px] overflow-y-auto rounded-[24px] bg-white p-5">
          <p className="text-center text-[14px] font-medium">Luz e cor</p>
          <div className="mt-3">
            <PainelAjustes url={cortada.url} ajustes={ajustes} onAjustes={setAjustes} redonda={redonda && ratio === "quadrado"} />
          </div>
          {erroAjuste && <p role="alert" className="mt-3 text-center text-[12.5px] text-red-600">{erroAjuste}</p>}
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={voltarParaRecorte} disabled={salvando} className="flex-1 rounded-full bg-surface-soft py-3 text-[13px] font-medium">
              Voltar
            </button>
            <button type="button" onClick={concluirAjuste} disabled={salvando} className="flex-1 rounded-full bg-button-primary py-3 text-[13px] font-medium text-white disabled:opacity-60">
              {salvando ? "Salvando…" : "Usar foto"}
            </button>
          </div>
        </div>
      ) : (
      <div className="max-h-[94dvh] w-full max-w-[380px] overflow-y-auto rounded-[24px] bg-surface-white p-5">
        <p className="text-center text-[14px] font-medium">Enquadrar foto</p>

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
            {lockedReason ?? `A primeira foto deste item já definiu ${RATIOS[lockedRatio].label.toLowerCase()}, as próximas seguem o mesmo formato, pra capa e galeria combinarem.`}
          </p>
        )}

        <div
          className={`relative mx-auto mt-4 touch-none overflow-hidden bg-surface-soft ${redonda && ratio === "quadrado" ? "rounded-full" : "rounded-2xl"}`}
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
              className="pointer-events-none absolute max-w-none select-none"
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
        <button type="button" onClick={irParaAjuste} className="mt-2 min-h-[44px] w-full rounded-full text-[13px] font-medium text-text-secondary underline underline-offset-4">
          Ajustar luz e cor
        </button>
      </div>
      )}
    </div>
  );
}
