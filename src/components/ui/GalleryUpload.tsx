"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropModal, type Ratio } from "./ImageCropModal";

/**
 * Fileira compacta de miniaturas — cada uma abre o seletor de arquivo e,
 * depois, o recorte (onde dá pra escolher quadrado, retrato ou paisagem).
 * Dá pra reordenar com as setinhas, sem precisar de arrastar.
 *
 * `lockedRatio` trava o formato do recorte no que já foi definido pela
 * primeira foto do item (capa ou galeria) — evita misturar proporção.
 * `onFormatChosen` avisa qual formato foi escolhido na primeira vez.
 */
export function GalleryUpload({
  value,
  onChange,
  businessId,
  max = 6,
  lockedRatio,
  lockedReason,
  onFormatChosen,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  businessId: string;
  max?: number;
  lockedRatio?: Ratio | null;
  lockedReason?: string;
  onFormatChosen?: (ratio: Ratio) => void;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const targetIndexRef = useRef<number>(0);

  function openPicker(index: number) {
    targetIndexRef.current = index;
    inputRef.current?.click();
  }

  function handlePick(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) { setError("Escolha um arquivo de imagem."); return; }
    if (file.size > 20 * 1024 * 1024) { setError("Imagem muito grande — o limite é 20 MB."); return; }
    setPendingFile(file);
  }

  async function uploadBlob(blob: Blob, ratio: Ratio) {
    const index = targetIndexRef.current;
    setPendingFile(null);
    setUploadingIndex(index);
    const path = `${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("box-images")
      .upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: "image/jpeg" });
    setUploadingIndex(null);
    if (upErr) { setError("Não consegui enviar a foto. Tente de novo."); return; }
    const { data } = supabase.storage.from("box-images").getPublicUrl(path);
    const next = [...value];
    next[index] = data.publicUrl;
    onChange(next.filter(Boolean));
    if (!lockedRatio) onFormatChosen?.(ratio);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function moveTo(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  const slots = Array.from({ length: max }, (_, i) => value[i] ?? null);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {slots.map((url, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-dashed border-divider bg-surface-soft">
            <button type="button" onClick={() => openPicker(i)} className="absolute inset-0">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : uploadingIndex === i ? (
                <span className="flex h-full w-full items-center justify-center text-[10px] text-text-tertiary">…</span>
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[18px] text-text-tertiary">+</span>
              )}
            </button>
            {url && (
              <>
                <span
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[11px] text-white"
                >
                  ×
                </span>
                <span className="absolute inset-x-1 bottom-1 flex justify-between">
                  <span
                    onClick={() => moveTo(i, -1)}
                    className={`flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white ${i === 0 ? "invisible" : ""}`}
                  >
                    ‹
                  </span>
                  <span
                    onClick={() => moveTo(i, 1)}
                    className={`flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white ${i === value.length - 1 ? "invisible" : ""}`}
                  >
                    ›
                  </span>
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePick(f);
          e.target.value = "";
        }}
      />

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      {pendingFile && (
        <ImageCropModal file={pendingFile} lockedRatio={lockedRatio} lockedReason={lockedReason} onCancel={() => setPendingFile(null)} onConfirm={uploadBlob} />
      )}
    </div>
  );
}
