"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Uploaded = { file: string; url: string; title: string; price: string };

const TEMAS = [
  ["moda", "Moda"], ["restaurante", "Restaurante"], ["loja", "Loja"],
  ["servicos", "Serviços"], ["pizzaria", "Pizzaria"], ["imobiliaria", "Imobiliária"],
  ["fotografo", "Fotógrafo"], ["salao", "Salão / Barbearia"], ["doceria", "Doceria"],
  ["academia", "Academia"],
];

export function InspireUploader() {
  const supabase = createClient();
  const [theme, setTheme] = useState("moda");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Uploaded[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setSaveMsg(null);
    const novos: Uploaded[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const nome = `${theme}-${String(i + 1).padStart(2, "0")}.jpg`;
      const path = `inspire/${nome}`;
      try {
        const { error } = await supabase.storage.from("box-images").upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
        if (error) continue;
        const { data } = supabase.storage.from("box-images").getPublicUrl(path);
        novos.push({ file: nome, url: data.publicUrl, title: "", price: "" });
      } catch {
        // ignora falha individual
      }
    }

    setResults(novos);
    setBusy(false);
  }

  function updateField(idx: number, field: "title" | "price", value: string) {
    setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function salvarTema() {
    if (results.length === 0 || saving) return;
    setSaving(true);
    setSaveMsg(null);
    // Salva cada foto com seu nome e preço — assim a imagem e o texto sempre
    // combinam, independente da posição na grade.
    const photos = results.map((r) => ({ url: r.url, title: r.title.trim(), price: r.price.trim() }));
    const { error } = await supabase
      .from("inspire_theme_photos")
      .upsert({ theme_id: theme, photos, updated_at: new Date().toISOString() }, { onConflict: "theme_id" });
    setSaving(false);
    setSaveMsg(error ? `Erro ao salvar: ${error.message}` : "✓ Tema salvo! Já aparece no Inspire-se.");
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="rounded-2xl border border-divider bg-surface-white p-4">
        <label className="text-[13px] font-medium">Tema</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-divider bg-surface-white px-3 py-2.5 text-[14px] outline-none"
        >
          {TEMAS.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <p className="mt-2 text-[12px] text-text-tertiary">
          Selecione todas as fotos de uma vez. Depois, dê um nome (e preço, se quiser) pra cada uma — assim a foto e o
          texto sempre combinam na vitrine.
        </p>

        <label className="mt-3 flex cursor-pointer items-center justify-center rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white">
          {busy ? "Enviando…" : "Escolher fotos e enviar"}
          <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={busy} className="hidden" />
        </label>
      </div>

      {results.length > 0 && (
        <div className="rounded-2xl border border-divider bg-surface-white p-4">
          <p className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">
            Nomeie cada foto ({results.length})
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {results.map((r, i) => (
              <div key={r.file} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt={r.file} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <input
                    value={r.title}
                    onChange={(e) => updateField(i, "title", e.target.value)}
                    placeholder="Nome (ex: Prato assinatura)"
                    className="w-full rounded-lg border border-divider px-2.5 py-2 text-[13px] outline-none focus:border-on-background"
                  />
                  <input
                    value={r.price}
                    onChange={(e) => updateField(i, "price", e.target.value)}
                    placeholder="Preço (opcional, ex: R$ 68)"
                    className="w-full rounded-lg border border-divider px-2.5 py-2 text-[13px] outline-none focus:border-on-background"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={salvarTema}
            disabled={saving}
            className="mt-4 w-full rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
          >
            {saving ? "Salvando…" : `Salvar tema "${theme}" no Inspire-se`}
          </button>
          {saveMsg && <p className={`mt-2 text-center text-[12px] font-medium ${saveMsg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{saveMsg}</p>}
        </div>
      )}
    </div>
  );
}
