"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Uploaded = { file: string; url: string };

export function InspireUploader() {
  const supabase = createClient();
  const [theme, setTheme] = useState("moda");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Uploaded[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setLog([]);
    const novos: Uploaded[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Nome previsível: tema-01.jpg, tema-02.jpg…
      const nome = `${theme}-${String(i + 1).padStart(2, "0")}.jpg`;
      const path = `inspire/${nome}`;
      try {
        const { error } = await supabase.storage.from("box-images").upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
        if (error) {
          setLog((l) => [...l, `❌ ${nome}: ${error.message}`]);
          continue;
        }
        const { data } = supabase.storage.from("box-images").getPublicUrl(path);
        novos.push({ file: nome, url: data.publicUrl });
        setLog((l) => [...l, `✓ ${nome}`]);
      } catch (err) {
        setLog((l) => [...l, `❌ ${nome}: ${err instanceof Error ? err.message : "erro"}`]);
      }
    }

    setResults(novos);
    setBusy(false);
  }

  async function salvarTema() {
    if (results.length === 0 || saving) return;
    setSaving(true);
    setSaveMsg(null);
    const urls = results.map((r) => r.url);
    const { error } = await supabase
      .from("inspire_theme_photos")
      .upsert({ theme_id: theme, photos: urls, updated_at: new Date().toISOString() }, { onConflict: "theme_id" });
    setSaving(false);
    setSaveMsg(error ? `Erro ao salvar: ${error.message}` : "✓ Tema salvo! Já aparece no Inspire-se.");
  }

  const urlsText = results.map((r) => `${r.file}\t${r.url}`).join("\n");

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="rounded-2xl border border-divider bg-surface-white p-4">
        <label className="text-[13px] font-medium">Tema</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-divider bg-surface-white px-3 py-2.5 text-[14px] outline-none"
        >
          <option value="moda">Moda</option>
          <option value="restaurante">Restaurante</option>
          <option value="loja">Loja</option>
          <option value="servicos">Serviços</option>
          <option value="pizzaria">Pizzaria</option>
          <option value="imobiliaria">Imobiliária</option>
          <option value="fotografo">Fotógrafo</option>
          <option value="salao">Salão / Barbearia</option>
          <option value="doceria">Doceria</option>
          <option value="academia">Academia</option>
        </select>
        <p className="mt-2 text-[12px] text-text-tertiary">
          As fotos viram {theme}-01.jpg, {theme}-02.jpg… na ordem que você selecionar. Selecione todas de uma vez.
        </p>

        <label className="mt-3 flex cursor-pointer items-center justify-center rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white">
          {busy ? "Enviando…" : "Escolher fotos e enviar"}
          <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={busy} className="hidden" />
        </label>
      </div>

      {log.length > 0 && (
        <div className="rounded-2xl border border-divider bg-surface-white p-4">
          <p className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Status</p>
          <div className="mt-2 flex flex-col gap-0.5 font-mono text-[12px]">
            {log.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-2xl border border-divider bg-surface-white p-4">
          <p className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">
            URLs (copie e me mande aqui)
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {results.map((r) => (
              <div key={r.file} className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt={r.file} className="h-14 w-14 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 break-all font-mono text-[11px]">{r.url}</span>
              </div>
            ))}
          </div>
          <textarea
            readOnly
            value={urlsText}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            className="mt-3 h-24 w-full rounded-xl border border-divider bg-surface-soft p-2 font-mono text-[11px]"
          />
          <button
            onClick={salvarTema}
            disabled={saving}
            className="mt-3 w-full rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
          >
            {saving ? "Salvando…" : `Salvar tema "${theme}" no Inspire-se`}
          </button>
          {saveMsg && <p className={`mt-2 text-center text-[12px] font-medium ${saveMsg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{saveMsg}</p>}
        </div>
      )}
    </div>
  );
}
