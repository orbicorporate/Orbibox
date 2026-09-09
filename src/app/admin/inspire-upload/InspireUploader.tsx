"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InspireThemeData } from "@/lib/inspirePhotos";

type Item = { url: string; title: string; price: string; suggesting?: boolean };

const TEMAS = [
  ["moda", "Moda"], ["restaurante", "Restaurante"], ["loja", "Loja"],
  ["servicos", "Serviços"], ["pizzaria", "Pizzaria"], ["imobiliaria", "Imobiliária"],
  ["fotografo", "Fotógrafo"], ["salao", "Salão / Barbearia"], ["doceria", "Doceria"],
  ["investimentos", "Consultoria de Investimentos"],
];

// Lê um File como base64 puro (sem o prefixo data:...).
function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const data = result.split(",")[1] ?? "";
      resolve({ data, mediaType: file.type || "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function InspireUploader({ existing }: { existing: Record<string, InspireThemeData> }) {
  const supabase = createClient();
  const [theme, setTheme] = useState("moda");
  const [busy, setBusy] = useState(false);
  const [titleStyle, setTitleStyle] = useState<"faixa" | "sobre">(existing["moda"]?.titleStyle ?? "sobre");
  const [items, setItems] = useState<Item[]>(
    (existing["moda"]?.photos ?? []).map((p) => ({ url: p.url, title: p.title ?? "", price: p.price ?? "" }))
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Trocar de tema carrega o que já está salvo naquele tema, pra editar.
  function trocarTema(novo: string) {
    setTheme(novo);
    setSaveMsg(null);
    setTitleStyle(existing[novo]?.titleStyle ?? "sobre");
    setItems((existing[novo]?.photos ?? []).map((p) => ({ url: p.url, title: p.title ?? "", price: p.price ?? "" })));
  }

  async function sugerirNome(url: string, base64: string, mediaType: string) {
    try {
      const res = await fetch("/api/name-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType, theme }),
      });
      const data = await res.json();
      if (res.ok && data.name) {
        setItems((prev) => prev.map((it) => (it.url === url ? { ...it, title: it.title || data.name, suggesting: false } : it)));
        return;
      }
    } catch {
      // ignora — fica sem sugestão, usuário digita
    }
    setItems((prev) => prev.map((it) => (it.url === url ? { ...it, suggesting: false } : it)));
  }

  // Sugere nome pra todas as fotos que estão sem nome, usando a URL (funciona
  // pra fotos já salvas também, não só recém-enviadas).
  async function sugerirTodos() {
    const alvos = items.filter((it) => !it.title.trim());
    if (alvos.length === 0) return;
    setItems((prev) => prev.map((it) => (!it.title.trim() ? { ...it, suggesting: true } : it)));
    await Promise.all(
      alvos.map(async (alvo) => {
        try {
          const res = await fetch("/api/name-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: alvo.url, theme }),
          });
          const data = await res.json();
          setItems((prev) => prev.map((it) => (it.url === alvo.url ? { ...it, title: data.name || it.title, suggesting: false } : it)));
        } catch {
          setItems((prev) => prev.map((it) => (it.url === alvo.url ? { ...it, suggesting: false } : it)));
        }
      })
    );
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setSaveMsg(null);
    const base = items.length;
    const novos: { item: Item; base64: string; mediaType: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const nome = `${theme}-${String(base + i + 1).padStart(2, "0")}.jpg`;
      const path = `inspire/${nome}`;
      try {
        const { error } = await supabase.storage.from("box-images").upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });
        if (error) continue;
        const { data } = supabase.storage.from("box-images").getPublicUrl(path);
        const { data: b64, mediaType } = await fileToBase64(file);
        novos.push({ item: { url: data.publicUrl, title: "", price: "", suggesting: true }, base64: b64, mediaType });
      } catch {
        // ignora falha individual
      }
    }

    setItems((prev) => [...prev, ...novos.map((n) => n.item)]);
    setBusy(false);

    // Dispara as sugestões da IA em paralelo (uma por foto nova).
    novos.forEach((n) => sugerirNome(n.item.url, n.base64, n.mediaType));
  }

  function updateField(idx: number, field: "title" | "price", value: string) {
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function removerFoto(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function salvarTema() {
    if (saving) return;
    setSaving(true);
    setSaveMsg(null);
    const photos = items.map((r) => ({ url: r.url, title: r.title.trim(), price: r.price.trim() }));
    const { error } = await supabase
      .from("inspire_theme_photos")
      .upsert({ theme_id: theme, photos, title_style: titleStyle, updated_at: new Date().toISOString() }, { onConflict: "theme_id" });
    setSaving(false);
    setSaveMsg(error ? `Erro ao salvar: ${error.message}` : "✓ Tema salvo! Já aparece no Inspire-se.");
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="rounded-2xl border border-divider bg-surface-white p-4">
        <label className="text-[13px] font-medium">Tema</label>
        <select
          value={theme}
          onChange={(e) => trocarTema(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-divider bg-surface-white px-3 py-2.5 text-[14px] outline-none"
        >
          {TEMAS.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <p className="mt-2 text-[12px] text-text-tertiary">
          {items.length > 0
            ? `${items.length} foto(s) neste tema. Edite os nomes ou adicione mais.`
            : "Selecione as fotos deste tema. A IA sugere um nome pra cada uma."}
        </p>

        <p className="mt-3 text-[13px] font-medium">Estilo do nome</p>
        <div className="mt-1.5 flex gap-2">
          <button
            onClick={() => setTitleStyle("sobre")}
            className={`flex-1 rounded-xl border-2 px-3 py-2 text-[13px] font-medium ${titleStyle === "sobre" ? "border-on-background" : "border-divider text-text-secondary"}`}
          >
            Sobre a imagem
          </button>
          <button
            onClick={() => setTitleStyle("faixa")}
            className={`flex-1 rounded-xl border-2 px-3 py-2 text-[13px] font-medium ${titleStyle === "faixa" ? "border-on-background" : "border-divider text-text-secondary"}`}
          >
            Faixa branca
          </button>
        </div>

        <label className="mt-3 flex cursor-pointer items-center justify-center rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white">
          {busy ? "Enviando…" : items.length > 0 ? "Adicionar mais fotos" : "Escolher fotos e enviar"}
          <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={busy} className="hidden" />
        </label>
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl border border-divider bg-surface-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">
              Nomes ({items.length})
            </p>
            <button
              onClick={sugerirTodos}
              className="rounded-full border border-divider bg-surface-white px-3 py-1.5 text-[12px] font-medium text-text-secondary"
            >
              ✦ Sugerir nomes com IA
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {items.map((r, i) => (
              <div key={r.url} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <input
                    value={r.title}
                    onChange={(e) => updateField(i, "title", e.target.value)}
                    placeholder={r.suggesting ? "✦ Pensando num nome…" : "Nome"}
                    className="w-full rounded-lg border border-divider px-2.5 py-2 text-[13px] outline-none focus:border-on-background"
                  />
                  <input
                    value={r.price}
                    onChange={(e) => updateField(i, "price", e.target.value)}
                    placeholder="Preço (opcional, ex: R$ 68)"
                    className="w-full rounded-lg border border-divider px-2.5 py-2 text-[13px] outline-none focus:border-on-background"
                  />
                </div>
                <button onClick={() => removerFoto(i)} className="shrink-0 self-start text-[12px] text-red-600">
                  ✕
                </button>
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
