"use client";

import { useState } from "react";
import { youtubeId } from "@/lib/showcase";

/** Campo pra adicionar vídeos do YouTube a um carrossel (produto ou história
 * da marca) — reaproveitado em mais de um lugar do painel. */
export function YoutubeAdder({
  videos,
  onAdd,
  onRemove,
  max = 3,
  label = "Vídeos do YouTube",
  hint = "Cole o link de um vídeo do YouTube — ele entra no mesmo carrossel, junto das fotos.",
}: {
  videos: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
  max?: number;
  label?: string;
  hint?: string;
}) {
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState(false);
  const cheio = videos.length >= max;

  function add() {
    if (cheio) return;
    const limpo = url.trim();
    if (!limpo) return;
    if (!youtubeId(limpo)) {
      setErro(true);
      return;
    }
    onAdd(limpo);
    setUrl("");
    setErro(false);
  }

  return (
    <div className="mt-3">
      <p className="text-[12px] uppercase tracking-wide text-text-tertiary">{label} (opcional, até {max})</p>
      <p className="mt-1 text-[12px] leading-relaxed text-text-tertiary">
        {hint} Pode adicionar até {max}.
      </p>
      {cheio ? (
        <p className="mt-2 text-[12px] text-text-tertiary">Você já adicionou o máximo de {max} vídeos. Remova um pra trocar.</p>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); setErro(false); }}
            placeholder="https://youtube.com/watch?v=…"
            className="min-w-0 flex-1 rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
          />
          <button onClick={add} className="shrink-0 rounded-full bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white">
            Adicionar
          </button>
        </div>
      )}
      {erro && <p className="mt-1.5 text-[12px] text-red-600">Esse link não parece ser do YouTube. Confere e tenta de novo.</p>}
      {videos.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {videos.map((v) => {
            const id = youtubeId(v);
            return (
              <div key={v} className="flex items-center gap-3 rounded-2xl border border-divider bg-surface-white p-2">
                {id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" />
                )}
                <span className="min-w-0 flex-1 truncate text-[12px] text-text-secondary">▶ {v}</span>
                <button onClick={() => onRemove(v)} className="shrink-0 text-[13px] font-medium text-red-600">Remover</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
