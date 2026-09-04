"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropModal, RATIOS, type Ratio } from "./ImageCropModal";

/**
 * Envia a foto para o armazenamento do Supabase e devolve a URL pública.
 * Antes de subir, abre um passo de recorte (arrastar, dar zoom, escolher
 * formato) — a foto que sobe já sai enquadrada do jeito certo.
 * Aceita também colar um link, para quem já tem a imagem hospedada.
 *
 * `lockedRatio`, quando vem preenchido, trava o formato do recorte no que a
 * primeira foto do item já definiu — capa e galeria nunca ficam misturando
 * proporção. `onFormatChosen` avisa o formato escolhido na primeira vez.
 */
export function ImageUpload({
  value,
  onChange,
  businessId,
  lockedRatio,
  lockedReason,
  onFormatChosen,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  businessId: string;
  lockedRatio?: Ratio | null;
  lockedReason?: string;
  onFormatChosen?: (ratio: Ratio) => void;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [urlDraft, setUrlDraft] = useState(value ?? "");
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setUrlDraft(value ?? "");
  }

  async function resolveUrl(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    setError(null);
    setResolving(true);
    try {
      const res = await fetch("/api/resolve-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        onChange(data.imageUrl);
        setUrlDraft(data.imageUrl);
      } else {
        setError(data.error ?? "Não consegui usar esse link — cole o link direto de uma imagem.");
      }
    } catch {
      setError("Não consegui buscar esse link. Tente de novo.");
    } finally {
      setResolving(false);
    }
  }

  function handlePick(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Imagem muito grande — o limite é 20 MB.");
      return;
    }
    // Abre o passo de recorte em vez de subir direto.
    setPendingFile(file);
  }

  async function uploadBlob(blob: Blob, ratio: Ratio) {
    setPendingFile(null);
    setUploading(true);
    const path = `${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("box-images")
      .upload(path, blob, { cacheControl: "31536000", upsert: false, contentType: "image/jpeg" });
    setUploading(false);
    if (upErr) {
      setError("Não consegui enviar a foto. Tente de novo.");
      return;
    }
    const { data } = supabase.storage.from("box-images").getPublicUrl(path);
    onChange(data.publicUrl);
    if (!lockedRatio) onFormatChosen?.(ratio);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* Miniatura do que já está escolhido — na mesma proporção do formato do box,
            pra já mostrar como a foto vai ficar recortada. */}
        <div
          className="w-24 shrink-0 overflow-hidden rounded-2xl border border-divider bg-surface-soft"
          style={{ aspectRatio: lockedRatio ? RATIOS[lockedRatio].value : 1 }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[18px] text-text-tertiary">▣</div>
          )}
        </div>

        <div className="flex flex-1 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-full bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {uploading ? "Enviando…" : value ? "Trocar foto" : "Enviar foto"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-full bg-surface-soft px-4 py-2.5 text-[13px] text-text-secondary"
            >
              Remover
            </button>
          )}
        </div>
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

      <div className="flex gap-2">
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); resolveUrl(urlDraft); } }}
          placeholder="ou cole o link de uma imagem (ou da página do produto)"
          className="min-w-0 flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
        />
        <button
          type="button"
          onClick={() => resolveUrl(urlDraft)}
          disabled={resolving || !urlDraft.trim() || urlDraft.trim() === (value ?? "").trim()}
          className="shrink-0 rounded-2xl bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
        >
          Carregar
        </button>
      </div>
      {resolving && (
        <p className="flex items-center gap-2 text-[12px] text-text-tertiary">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-divider border-t-on-background" />
          Buscando a imagem…
        </p>
      )}

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      {pendingFile && (
        <ImageCropModal file={pendingFile} lockedRatio={lockedRatio} lockedReason={lockedReason} onCancel={() => setPendingFile(null)} onConfirm={uploadBlob} />
      )}
    </div>
  );
}
