"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { GalleryUpload } from "@/components/ui/GalleryUpload";
import type { Ratio } from "@/components/ui/ImageCropModal";
import { PALETTE_GROUPS, SIZE_CLASS, SIZE_LABEL, colorOf, sizeOf, type BoxSize } from "@/lib/showcase";

type BrandColor = { hex: string; role?: string };

type Item = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  gallery_urls: string[];
  photo_format: string | null;
  brand_label: string | null;
  position: number;
  status: string;
  layout_size: string;
  box_color: string;
  box_style: string;
};

/** Formatos desenhados como miniatura, para escolher pelo olho e não pela palavra. */
const FORMA: Record<BoxSize, string> = {
  destaque: "h-5 w-10",
  largo: "h-3 w-10",
  medio: "h-6 w-5",
  alto: "h-9 w-5",
};

export function ShowcaseBuilder({
  items: initial,
  slug,
  businessId,
  brandColors = [],
  initialCategories = [],
}: {
  items: Item[];
  slug: string;
  businessId: string;
  brandColors?: BrandColor[];
  initialCategories?: string[];
}) {
  const supabase = createClient();
  const [items, setItems] = useState<Item[]>(initial);
  const [selId, setSelId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  // Aba de paleta ativa no editor de cor. "Marca" só existe se a Orbi já
  // extraiu cores no DNA da marca (onboarding) — senão começa no Padrão.
  const [paletteTab, setPaletteTab] = useState<string>(brandColors.length > 0 ? "Marca" : "Padrão");
  const [saving, setSaving] = useState(false);
  const [arranging, setArranging] = useState(false);

  const published = items.filter((i) => i.status === "published");
  const ordered = [...published].sort((a, b) => a.position - b.position);
  // Categorias que já existem em algum item, mesmo que ainda não estejam na
  // lista persistida (compatibilidade com categorias criadas do jeito antigo).
  const itemCategoryNames = Array.from(new Set(published.map((i) => i.brand_label?.trim()).filter((v): v is string => !!v)));
  const allCategoryNames = Array.from(new Set([...categories, ...itemCategoryNames]));
  const uncategorized = ordered.filter((i) => !i.brand_label?.trim());
  const sections = [
    ...allCategoryNames.map((name) => ({ name, items: ordered.filter((i) => (i.brand_label?.trim() ?? "") === name) })),
    ...(uncategorized.length > 0 ? [{ name: "Destaques", items: uncategorized }] : []),
  ];
  const sel = items.find((i) => i.id === selId) ?? null;

  function patch(id: string, fields: Partial<Item>) {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...fields } : i)));
  }

  async function save(id: string, fields: Partial<Item>) {
    patch(id, fields);
    setSaving(true);
    await supabase.from("content_items").update(fields).eq("id", id);
    setSaving(false);
  }

  async function saveCategories(next: string[]) {
    setCategories(next);
    await supabase.from("businesses").update({ vitrine_categories: next }).eq("id", businessId);
  }

  async function move(item: Item, dir: -1 | 1) {
    const idx = ordered.findIndex((i) => i.id === item.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    patch(item.id, { position: swap.position });
    patch(swap.id, { position: item.position });
    setSaving(true);
    await Promise.all([
      supabase.from("content_items").update({ position: swap.position }).eq("id", item.id),
      supabase.from("content_items").update({ position: item.position }).eq("id", swap.id),
    ]);
    setSaving(false);
  }

  async function autoArrange() {
    setArranging(true);
    const porValor = [...published].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    const ritmo: BoxSize[] = ["destaque", "medio", "medio", "largo", "medio", "medio"];
    const updates = porValor.map((it, i) => ({ id: it.id, layout_size: ritmo[i % ritmo.length], position: i }));
    setItems((p) =>
      p.map((i) => {
        const u = updates.find((x) => x.id === i.id);
        return u ? { ...i, layout_size: u.layout_size, position: u.position } : i;
      })
    );
    await Promise.all(
      updates.map((u) => supabase.from("content_items").update({ layout_size: u.layout_size, position: u.position }).eq("id", u.id))
    );
    setArranging(false);
  }

  async function createItem(brandLabel: string | null = null) {
    const { data, error } = await supabase
      .from("content_items")
      .insert({ business_id: businessId, type: "product", title: "Novo item", status: "published", position: published.length, brand_label: brandLabel })
      .select()
      .single();
    if (!error && data) {
      setItems((p) => [...p, data as Item]);
      setSelId(data.id);
    }
  }

  async function createCategory() {
    const nome = window.prompt("Nome da nova categoria:");
    if (!nome || !nome.trim()) return;
    const trimmed = nome.trim();
    if (allCategoryNamesRef().includes(trimmed)) {
      window.alert(`Já existe uma categoria "${trimmed}".`);
      return;
    }
    await saveCategories([...categories, trimmed]);
  }

  // Nome de todas as categorias já conhecidas — usado pra evitar duplicata
  // com erro de digitação, tanto ao criar quanto ao escolher no seletor.
  function allCategoryNamesRef() {
    return Array.from(new Set([...categories, ...items.map((i) => i.brand_label?.trim()).filter((v): v is string => !!v)]));
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Excluir "${item.title}"? Essa ação não pode ser desfeita.`)) return;
    setSelId(null);
    setItems((p) => p.filter((i) => i.id !== item.id));
    await supabase.from("content_items").delete().eq("id", item.id);
  }

  async function renameCategory(oldName: string) {
    const novo = window.prompt("Novo nome da categoria:", oldName === "Destaques" ? "" : oldName);
    if (novo === null) return;
    const value = novo.trim() || null;
    const ids = published.filter((i) => (i.brand_label?.trim() || "Destaques") === oldName).map((i) => i.id);
    setItems((p) => p.map((i) => (ids.includes(i.id) ? { ...i, brand_label: value } : i)));
    await Promise.all(ids.map((id) => supabase.from("content_items").update({ brand_label: value }).eq("id", id)));
    if (value) {
      const next = categories.includes(oldName) ? categories.map((c) => (c === oldName ? value : c)) : [...categories.filter((c) => c !== oldName), value];
      await saveCategories(Array.from(new Set(next)));
    } else if (categories.includes(oldName)) {
      await saveCategories(categories.filter((c) => c !== oldName));
    }
  }

  async function deleteCategory(name: string) {
    const ids = published.filter((i) => (i.brand_label?.trim() || "Destaques") === name).map((i) => i.id);
    const msg = ids.length === 0
      ? `Excluir a categoria "${name}"? Ela está vazia.`
      : `Excluir a categoria "${name}" e ${ids.length === 1 ? "seu 1 item" : `seus ${ids.length} itens`}? Essa ação não pode ser desfeita.`;
    if (!window.confirm(msg)) return;
    setItems((p) => p.filter((i) => !ids.includes(i.id)));
    if (ids.length > 0) await Promise.all(ids.map((id) => supabase.from("content_items").delete().eq("id", id)));
    if (categories.includes(name)) await saveCategories(categories.filter((c) => c !== name));
  }

  const idx = sel ? ordered.findIndex((i) => i.id === sel.id) : -1;

  return (
    <div className="mt-5 flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={autoArrange}
          disabled={arranging || published.length === 0}
          className="rounded-full orbi-gradient px-4 py-2 text-[13px] font-medium text-on-background disabled:opacity-50"
        >
          {arranging ? "Organizando…" : "✦ Organizar com Orbi"}
        </button>
        <button onClick={() => createItem()} className="rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white">
          + Novo item
        </button>
        <button onClick={createCategory} className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] font-medium text-text-secondary">
          + Categoria
        </button>
        <Link href={`/${slug}`} target="_blank" className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] text-text-secondary">
          Ver publicado ↗
        </Link>
        {saving && <span className="text-[12px] text-text-tertiary">salvando…</span>}
      </div>

      <p className="mt-3 text-[13px] text-text-secondary">
        Toque num box para editar. Ele abre aqui mesmo, sem sair da vitrine.
      </p>

      {published.length === 0 && (
        <div className="mt-5 rounded-[28px] border border-divider bg-surface-white p-6 text-[14px] text-text-secondary">
          Nenhum item ativo ainda. Toque em “+ Novo item” para criar o primeiro.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-8">
        {sections.map((sec) => (
          <div key={sec.name}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-manrope)] text-[20px] font-medium">{sec.name}</h2>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => renameCategory(sec.name)}
                  aria-label="Renomear categoria"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-[12px] text-text-secondary"
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteCategory(sec.name)}
                  aria-label="Excluir categoria"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-[12px] text-red-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="grid auto-rows-[minmax(0,auto)] grid-cols-2 gap-2.5">
              {sec.items.map((item) => (
                <BoxCard
                  key={item.id}
                  item={item}
                  selected={selId === item.id}
                  onSelect={() => setSelId(selId === item.id ? null : item.id)}
                />
              ))}
              {sec.items.length === 0 && (
                <button
                  onClick={() => createItem(sec.name === "Destaques" ? null : sec.name)}
                  className="col-span-2 flex min-h-[90px] items-center justify-center rounded-[20px] border border-dashed border-divider text-[13px] text-text-tertiary"
                >
                  + Adicionar item nesta categoria
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Editor: gaveta fixa no rodapé. Fundo escurecido fecha ao tocar fora — mais fácil de sair. */}
      {sel && (
        <>
          <div className="h-[420px]" aria-hidden />
          <div
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setSelId(null)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[75vh] max-w-[440px] overflow-y-auto rounded-t-[28px] border-t border-divider bg-surface-white p-5 shadow-[0_-10px_40px_rgba(17,19,24,0.15)]">
            <button
              onClick={() => setSelId(null)}
              className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-divider"
              aria-label="Fechar edição"
            />

            <div className="flex items-start justify-between gap-3">
              <input
                value={sel.title}
                onChange={(e) => patch(sel.id, { title: e.target.value })}
                onBlur={(e) => save(sel.id, { title: e.target.value })}
                placeholder="Nome do item"
                className="min-w-0 flex-1 border-b border-divider bg-transparent pb-1 font-[family-name:var(--font-manrope)] text-[19px] font-medium outline-none focus:border-on-background"
              />
              <button onClick={() => setSelId(null)} className="shrink-0 rounded-full bg-surface-soft px-3 py-1.5 text-[12px] text-text-secondary">
                Fechar
              </button>
            </div>

            {/* Descrição — sempre visível agora, é o que mais gente pedia pra achar. */}
            <p className="mt-4 text-[12px] uppercase tracking-wide text-text-tertiary">Descrição</p>
            <textarea
              value={sel.description ?? ""}
              onChange={(e) => patch(sel.id, { description: e.target.value })}
              onBlur={(e) => save(sel.id, { description: e.target.value || null })}
              rows={3}
              placeholder="Conte o que é, pra quem serve, o que inclui"
              className="mt-2 w-full resize-none rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
            />

            {/* Posição — o que mais se mexe, então vem primeiro */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[12px] uppercase tracking-wide text-text-tertiary">Posição</span>
              <button
                onClick={() => move(sel, -1)}
                disabled={idx <= 0}
                className="ml-auto h-9 w-9 rounded-full bg-surface-soft text-[15px] disabled:opacity-30"
                aria-label="Mover para trás"
              >
                ←
              </button>
              <span className="text-[13px] text-text-secondary">{idx + 1} de {ordered.length}</span>
              <button
                onClick={() => move(sel, 1)}
                disabled={idx === ordered.length - 1}
                className="h-9 w-9 rounded-full bg-surface-soft text-[15px] disabled:opacity-30"
                aria-label="Mover para frente"
              >
                →
              </button>
            </div>

            {/* Formato: miniaturas em vez de nomes */}
            <p className="mt-4 text-[12px] uppercase tracking-wide text-text-tertiary">Formato</p>
            <div className="mt-2 flex gap-2">
              {(Object.keys(SIZE_LABEL) as BoxSize[]).map((s) => {
                const ativo = sizeOf(sel.layout_size) === s;
                return (
                  <button
                    key={s}
                    onClick={() => save(sel.id, { layout_size: s })}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border p-2.5 ${ativo ? "border-on-background bg-surface-soft" : "border-divider"}`}
                  >
                    <span className={`rounded-[4px] ${FORMA[s]} ${ativo ? "bg-on-background" : "bg-divider"}`} />
                    <span className="text-[11px] text-text-secondary">{SIZE_LABEL[s]}</span>
                  </button>
                );
              })}
            </div>

            {/* Foto de capa */}
            <p className="mt-4 text-[12px] uppercase tracking-wide text-text-tertiary">Foto de capa</p>
            <div className="mt-2">
              <ImageUpload
                value={sel.image_url}
                businessId={businessId}
                lockedRatio={sel.photo_format as Ratio | null}
                onFormatChosen={(r) => save(sel.id, { photo_format: r })}
                onChange={(url) => save(sel.id, { image_url: url, box_style: url ? "foto" : "cor" })}
              />
            </div>

            {/* Galeria — as fotos extras aparecem no carrossel da página do item. */}
            <p className="mt-4 text-[12px] uppercase tracking-wide text-text-tertiary">
              Mais fotos (até 6) · viram um carrossel na página do item
            </p>
            <div className="mt-2">
              <GalleryUpload
                value={sel.gallery_urls}
                businessId={businessId}
                lockedRatio={sel.photo_format as Ratio | null}
                onFormatChosen={(r) => save(sel.id, { photo_format: r })}
                onChange={(urls) => save(sel.id, { gallery_urls: urls })}
              />
            </div>

            {/* Cor — só faz sentido sem foto, então explicamos em vez de esconder */}
            <p className="mt-4 text-[12px] uppercase tracking-wide text-text-tertiary">
              Cor do box{sel.image_url ? " · aparece se remover a foto" : ""}
            </p>

            {/* Abas de paleta — "Marca" primeiro quando existe, é a recomendada pela Orbi. */}
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {brandColors.length > 0 && (
                <button
                  onClick={() => setPaletteTab("Marca")}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${
                    paletteTab === "Marca" ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"
                  }`}
                >
                  ✦ Marca
                </button>
              )}
              {PALETTE_GROUPS.map((g) => (
                <button
                  key={g.name}
                  onClick={() => setPaletteTab(g.name)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${
                    paletteTab === g.name ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2.5">
              {paletteTab === "Marca"
                ? brandColors.map((bc, i) => (
                    <button
                      key={`${bc.hex}-${i}`}
                      onClick={() => save(sel.id, { box_color: bc.hex })}
                      aria-label={bc.role ?? bc.hex}
                      title={bc.role ?? bc.hex}
                      className={`h-10 w-10 rounded-full border ${sel.box_color.toLowerCase() === bc.hex.toLowerCase() ? "border-2 border-on-background" : "border-divider"}`}
                      style={{ backgroundColor: bc.hex }}
                    />
                  ))
                : Object.entries(PALETTE_GROUPS.find((g) => g.name === paletteTab)?.colors ?? {}).map(([key, c]) => (
                    <button
                      key={key}
                      onClick={() => save(sel.id, { box_color: key })}
                      aria-label={c.label}
                      title={c.label}
                      className={`h-10 w-10 rounded-full border ${sel.box_color === key ? "border-2 border-on-background" : "border-divider"}`}
                      style={{ backgroundColor: c.bg }}
                    />
                  ))}
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-[13px] text-text-secondary">Mais detalhes</summary>
              <p className="mt-3 text-[12px] uppercase tracking-wide text-text-tertiary">Preço</p>
              <input
                value={sel.price ?? ""}
                onChange={(e) => patch(sel.id, { price: e.target.value ? Number(e.target.value) : null })}
                onBlur={(e) => save(sel.id, { price: e.target.value ? Number(e.target.value) : null })}
                inputMode="decimal"
                placeholder="Sem preço"
                className="mt-2 w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
              />
              <p className="mt-3 text-[12px] uppercase tracking-wide text-text-tertiary">Categoria (vira seção)</p>
              <select
                value={sel.brand_label ?? ""}
                onChange={(e) => {
                  if (e.target.value === "__nova__") {
                    const nome = window.prompt("Nome da nova categoria:");
                    if (nome && nome.trim()) {
                      const trimmed = nome.trim();
                      save(sel.id, { brand_label: trimmed });
                      if (!allCategoryNamesRef().includes(trimmed)) saveCategories([...categories, trimmed]);
                    }
                    return;
                  }
                  save(sel.id, { brand_label: e.target.value || null });
                }}
                className="mt-2 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
              >
                <option value="">Sem categoria (Destaques)</option>
                {allCategoryNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="__nova__">+ Nova categoria…</option>
              </select>
            </details>

            <Link
              href={`/${slug}/p/${sel.id}`}
              target="_blank"
              className="mt-5 block rounded-full border border-divider py-3 text-center text-[13px] font-medium"
            >
              Ver página do item ↗
            </Link>

            <button
              onClick={() => deleteItem(sel)}
              className="mt-2 block w-full rounded-full py-3 text-center text-[13px] font-medium text-red-600"
            >
              Excluir item
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function BoxCard({ item, selected, onSelect }: { item: Item; selected: boolean; onSelect: () => void }) {
  const c = colorOf(item.box_color);
  const size = sizeOf(item.layout_size);
  const [imgFailed, setImgFailed] = useState(false);
  const [lastUrl, setLastUrl] = useState(item.image_url);
  if (item.image_url !== lastUrl) {
    setLastUrl(item.image_url);
    setImgFailed(false);
  }
  // "Tem foto" depende só de existir uma URL — nunca de uma segunda flag que pode
  // ficar dessincronizada (era exatamente esse o bug: foto salva pelo Feed não
  // aparecia aqui porque box_style não era atualizado lá).
  const photo = !!item.image_url && !imgFailed;

  return (
    <button
      onClick={onSelect}
      className={`relative flex flex-col justify-end overflow-hidden rounded-[20px] p-3 text-left transition-transform active:scale-[0.98] ${SIZE_CLASS[size]} ${
        selected ? "ring-2 ring-on-background" : "border border-divider"
      }`}
      style={photo ? undefined : { backgroundColor: c.bg }}
    >
      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image_url!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        </>
      )}
      <div className="relative">
        <p className={`font-medium leading-tight ${size === "destaque" ? "text-[17px]" : "text-[14px]"}`} style={{ color: photo ? "#fff" : c.fg }}>
          {item.title}
        </p>
        {item.price != null && (
          <p className="mt-0.5 text-[12px] opacity-80" style={{ color: photo ? "#fff" : c.fg }}>
            R$ {Number(item.price).toFixed(2)}
          </p>
        )}
      </div>
      {/* Sinal de "editável" sempre presente, sem precisar entrar em modo */}
      <span
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface-white/90 text-[12px] shadow"
        style={{ color: "#111318" }}
      >
        ✎
      </span>
      {imgFailed && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-red-600/90 px-2.5 py-1 text-[10px] font-medium text-white">
          link da foto não carregou
        </span>
      )}
    </button>
  );
}
