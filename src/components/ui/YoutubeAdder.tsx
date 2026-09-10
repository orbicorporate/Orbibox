"use client";

import { useState } from "react";
import { youtubeId, instagramReelId, isVideoUrl } from "@/lib/showcase";
import { HelperText } from "@/components/ui/HelperText";

/** Campo pra adicionar vídeos (YouTube ou Reels do Instagram) a um carrossel
 * (produto ou história da marca) — reaproveitado em mais de um lugar do
 * painel. YouTube entra sempre em paisagem; Reels sempre em vertical — cada
 * um no formato que o vídeo realmente tem.
 *
 * `showList` (padrão true) mostra a lista dos já adicionados com botão de
 * remover — desligue quando o vídeo já aparece em outro lugar (ex: dentro da
 * grade de fotos, que também reordena), pra não duplicar o controle. */
export function YoutubeAdder({
  videos,
  onAdd,
  onRemove,
  max = 3,
  label = "Vídeos (YouTube ou Reels)",
  hint = "Cole o link de um vídeo do YouTube ou de um Reels do Instagram — ele entra no mesmo carrossel, junto das fotos, sempre no formato certo (paisagem ou vertical).",
  showList = true,
}: {
  videos: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
  max?: number;
  label?: string;
  hint?: string;
  showList?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState(false);
  const cheio = videos.length >= max;

  function add() {
    if (cheio) return;
    const limpo = url.trim();
    if (!limpo) return;
    if (!isVideoUrl(limpo)) {
      setErro(true);
      return;
    }
    onAdd(limpo);
    setUrl("");
    setErro(false);
  }

  return (
    <div className="mt-4">
      <p className="text-[13px] uppercase tracking-wide text-text-tertiary">{label} (opcional, até {max})</p>
      <HelperText>{`${hint} Pode adicionar até ${max}.`}</HelperText>
      {cheio ? (
        <p className="mt-2 text-[13px] text-text-tertiary">Você já adicionou o máximo de {max} vídeos. Remova um pra trocar.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setErro(false); }}
            placeholder="https://youtube.com/watch?v=… ou instagram.com/reel/…"
            className="min-w-0 flex-1 rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
          />
          <button onClick={add} className="shrink-0 rounded-full bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white">
            Adicionar
          </button>
        </div>
      )}
      {erro && <p className="mt-1.5 text-[13px] text-red-600">Esse link não parece ser do YouTube nem do Instagram. Confere e tenta de novo.</p>}
      {showList && videos.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {videos.map((v) => {
            const ytId = youtubeId(v);
            const igId = instagramReelId(v);
            return (
              <div key={v} className="flex items-center gap-3 rounded-2xl border border-divider bg-surface-white p-2">
                {ytId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" />
                )}
                {igId && (
                  <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-[16px]">▶</span>
                )}
                <span className="min-w-0 flex-1 truncate text-[13px] text-text-secondary">
                  {ytId ? "▶ YouTube · " : igId ? "▶ Reels · " : "▶ "}{v}
                </span>
                <button onClick={() => onRemove(v)} className="shrink-0 text-[13px] font-medium text-red-600">Remover</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
