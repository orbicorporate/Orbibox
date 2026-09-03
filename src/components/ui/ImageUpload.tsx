"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Envia a foto para o armazenamento do Supabase e devolve a URL pública.
 * Aceita também colar um link, para quem já tem a imagem hospedada.
 */
export function ImageUpload({
  value,
  onChange,
  businessId,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  businessId: string;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande — o limite é 5 MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("box-images")
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    setUploading(false);
    if (upErr) {
      setError("Não consegui enviar a foto. Tente de novo.");
      return;
    }
    const { data } = supabase.storage.from("box-images").getPublicUrl(path);
    onChange(data.publicUrl);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* Miniatura do que já está escolhido */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-divider bg-surface-soft">
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
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="ou cole o link de uma imagem"
        className="rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
      />

      {error && <p className="text-[12px] text-red-600">{error}</p>}
    </div>
  );
}
