"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { GalleryUpload } from "@/components/ui/GalleryUpload";
import { PALETTE_GROUPS, SIZE_LABEL, colorOf, sizeOf, titleFontSize, COVER_RATIO_BY_SIZE, formatPrice, PRICE_TYPE_LABEL, type BoxSize, type PriceType } from "@/lib/showcase";
import { OrbiWorking } from "@/components/orbi/OrbiWorking";
import { RATIOS } from "@/components/ui/ImageCropModal";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { whatsappLink } from "@/lib/track";

type BrandColor = { hex: string; role?: string };

type Item = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string;
  price_max: number | null;
  image_url: string | null;
  image_is_placeholder: boolean;
  gallery_urls: string[];
  photo_format: string | null;
  brand_label: string | null;
  position: number;
  status: string;
  layout_size: string;
  box_color: string;
  box_style: string;
  ai_optimized: boolean;
  link_kind: string | null;
  target_url: string | null;
};

/** Formatos desenhados como miniatura, para escolher pelo olho e não pela palavra. */
const FORMA: Record<BoxSize, string> = {
  destaque: "h-5 w-10",
  largo: "h-3 w-10",
  medio: "h-6 w-5",
  alto: "h-9 w-5",
};

// A foto de capa preenche o box na grade — então ela segue o formato do box,
// não uma escolha própria. Largo e Destaque são baixinhos (paisagem), Alto é
// bem vertical (retrato), Médio fica perto de quadrado.


export function ShowcaseBuilder({
  items: initial,
  slug,
  businessId,
  brandColors = [],
  initialCategories = [],
  initialCoverUrl = null,
  whatsapp = null,
}: {
  items: Item[];
  slug: string;
  businessId: string;
  brandColors?: BrandColor[];
  initialCategories?: string[];
  initialCoverUrl?: string[] | null;
  whatsapp?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<Item[]>(initial);
  const [coverUrls, setCoverUrls] = useState<string[]>(initialCoverUrl ?? []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  // Aba de paleta ativa no editor de cor. "Marca" só existe se a Orbi já
  // extraiu cores no DNA da marca (onboarding) — senão começa no Padrão.
  const [paletteTab, setPaletteTab] = useState<string>(brandColors.length > 0 ? "Marca" : "Padrão");
  const [arranging, setArranging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [improving, setImproving] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [proposta, setProposta] = useState<{ siteType: string; motivo: string | null; imported: number; semFoto: number } | null>(null);
  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightIdx, setInsightIdx] = useState(0);
  const [generatingInsight, setGeneratingInsight] = useState(false);

  // Histórico de estados anteriores da vitrine — permite desfazer a última
  // ação (edição, exclusão, criação, reorganização, importação, etc.) e
  // também dá segurança pra "Renovar vitrine", que apaga tudo de uma vez.
  type Snapshot = { items: Item[]; categories: string[]; coverUrls: string[] };
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [undoing, setUndoing] = useState(false);

  function snapshot() {
    setHistory((h) => [
      ...h.slice(-19),
      { items: items.map((i) => ({ ...i })), categories: [...categories], coverUrls: [...coverUrls] },
    ]);
  }

  async function undo() {
    if (history.length === 0 || undoing) return;
    setUndoing(true);
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setEditingId(null);

    const prevIds = new Set(prev.items.map((i) => i.id));
    const currIds = new Set(items.map((i) => i.id));
    const toInsert = prev.items.filter((i) => !currIds.has(i.id));
    const toDelete = items.filter((i) => !prevIds.has(i.id));
    const toUpdate = prev.items.filter((i) => {
      if (!currIds.has(i.id)) return false;
      const atual = items.find((c) => c.id === i.id);
      return atual && JSON.stringify(atual) !== JSON.stringify(i);
    });

    try {
      await Promise.all([
        ...toInsert.map((i) =>
          supabase.from("content_items").insert({
            id: i.id,
            business_id: businessId,
            type: (i as unknown as { type?: string }).type ?? "product",
            title: i.title,
            description: i.description,
            price: i.price,
            price_type: i.price_type,
            price_max: i.price_max,
            image_url: i.image_url,
            image_is_placeholder: i.image_is_placeholder,
            gallery_urls: i.gallery_urls,
            photo_format: i.photo_format,
            brand_label: i.brand_label,
            position: i.position,
            status: i.status,
            layout_size: i.layout_size,
            box_color: i.box_color,
            box_style: i.box_style,
            ai_optimized: i.ai_optimized,
            link_kind: i.link_kind,
            target_url: i.target_url,
          })
        ),
        ...toDelete.map((i) => supabase.from("content_items").delete().eq("id", i.id)),
        ...toUpdate.map((i) =>
          supabase
            .from("content_items")
            .update({
              title: i.title,
              description: i.description,
              price: i.price,
              price_type: i.price_type,
              price_max: i.price_max,
              image_url: i.image_url,
              image_is_placeholder: i.image_is_placeholder,
              gallery_urls: i.gallery_urls,
              photo_format: i.photo_format,
              brand_label: i.brand_label,
              position: i.position,
              status: i.status,
              layout_size: i.layout_size,
              box_color: i.box_color,
              box_style: i.box_style,
              ai_optimized: i.ai_optimized,
              link_kind: i.link_kind,
              target_url: i.target_url,
            })
            .eq("id", i.id)
        ),
        JSON.stringify(prev.categories) !== JSON.stringify(categories)
          ? supabase.from("businesses").update({ vitrine_categories: prev.categories }).eq("id", businessId)
          : Promise.resolve(),
        JSON.stringify(prev.coverUrls) !== JSON.stringify(coverUrls)
          ? supabase.from("businesses").update({ vitrine_cover_urls: prev.coverUrls }).eq("id", businessId)
          : Promise.resolve(),
      ]);
    } finally {
      setItems(prev.items);
      setCategories(prev.categories);
      setCoverUrls(prev.coverUrls);
      setUndoing(false);
    }
  }

  async function renovarVitrine() {
    if (items.length === 0 && categories.length === 0 && coverUrls.length === 0) return;
    if (
      !window.confirm(
        "Isso apaga todos os itens, categorias e a capa da sua vitrine, pra você recomeçar do zero. Dá pra desfazer logo em seguida se mudar de ideia. Confirma?"
      )
    )
      return;
    snapshot();
    const ids = items.map((i) => i.id);
    setEditingId(null);
    setItems([]);
    setCategories([]);
    setCoverUrls([]);
    setProposta(null);
    setInsights(null);
    await Promise.all([
      ids.length > 0 ? supabase.from("content_items").delete().in("id", ids) : Promise.resolve(),
      supabase.from("businesses").update({ vitrine_categories: [], vitrine_cover_urls: [] }).eq("id", businessId),
    ]);
  }

  async function generateInsights() {
    setGeneratingInsight(true);
    try {
      const res = await fetch("/api/vitrine-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (Array.isArray(data.insights) && data.insights.length > 0) {
        setInsights(data.insights);
        setInsightIdx(0);
      }
    } finally {
      setGeneratingInsight(false);
    }
  }

  function nextInsight() {
    if (!insights) return;
    setInsightIdx((i) => (i + 1) % insights.length);
  }

  const ordered = [...items].sort((a, b) => a.position - b.position);
  const publishedCount = items.filter((i) => i.status === "published").length;

  // Categorias que já existem em algum item, mesmo que ainda não estejam na
  // lista persistida (compatibilidade com categorias criadas do jeito antigo).
  const itemCategoryNames = Array.from(new Set(ordered.map((i) => i.brand_label?.trim()).filter((v): v is string => !!v)));
  const allCategoryNames = Array.from(new Set([...categories, ...itemCategoryNames]));
  const uncategorized = ordered.filter((i) => !i.brand_label?.trim());
  const sections = [
    ...allCategoryNames.map((name) => ({ name, items: ordered.filter((i) => (i.brand_label?.trim() ?? "") === name) })),
    ...(uncategorized.length > 0 ? [{ name: "Destaques", items: uncategorized }] : []),
  ];

  function patch(id: string, fields: Partial<Item>) {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...fields } : i)));
  }

  async function save(id: string, fields: Partial<Item>) {
    snapshot();
    patch(id, fields);
    await supabase.from("content_items").update(fields).eq("id", id);
  }

  async function saveCategories(next: string[]) {
    setCategories(next);
    await supabase.from("businesses").update({ vitrine_categories: next }).eq("id", businessId);
  }

  async function move(item: Item, dir: -1 | 1) {
    const idx = ordered.findIndex((i) => i.id === item.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    snapshot();
    patch(item.id, { position: swap.position });
    patch(swap.id, { position: item.position });
    await Promise.all([
      supabase.from("content_items").update({ position: swap.position }).eq("id", item.id),
      supabase.from("content_items").update({ position: item.position }).eq("id", swap.id),
    ]);
  }

  async function autoArrange() {
    setArranging(true);
    snapshot();
    const porValor = [...ordered].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
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
    setCreating(true);
    snapshot();
    // Nasce no topo — position mais baixo que tudo que já existe, não no fim da lista.
    const minPos = items.length > 0 ? Math.min(...items.map((i) => i.position)) : 0;
    const { data, error } = await supabase
      .from("content_items")
      .insert({ business_id: businessId, type: "product", title: "Novo item", status: "draft", position: minPos - 1, brand_label: brandLabel })
      .select()
      .single();
    setCreating(false);
    if (!error && data) {
      setItems((p) => [...p, data as Item]);
      setEditingId(data.id);
      setTimeout(() => {
        document.getElementById(`item-${data.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
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
    snapshot();
    await saveCategories([...categories, trimmed]);
  }

  // Nome de todas as categorias já conhecidas — usado pra evitar duplicata
  // com erro de digitação, tanto ao criar quanto ao escolher no seletor.
  function allCategoryNamesRef() {
    return Array.from(new Set([...categories, ...items.map((i) => i.brand_label?.trim()).filter((v): v is string => !!v)]));
  }

  async function togglePublish(item: Item) {
    const s = item.status === "published" ? "draft" : "published";
    // Só deixa publicar se o dono escolheu uma foto ou uma cor de propósito —
    // "neutro" é o padrão de quem nunca mexeu, não uma escolha de verdade.
    if (s === "published" && !item.image_url && item.box_color === "neutro") {
      window.alert("Escolha uma foto ou uma cor pra esse item antes de publicar — assim ele fica com cara de coisa pensada, não em branco.");
      setEditingId(item.id);
      return;
    }
    await save(item.id, { status: s });
  }

  async function improveWithOrbi(item: Item) {
    setImproving(item.id);
    try {
      const res = await fetch("/api/improve-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId: item.id }),
      });
      if (res.ok) {
        const { description } = await res.json();
        await save(item.id, { description, ai_optimized: true });
      }
    } finally {
      setImproving(null);
    }
  }

  async function importFromSite(e: React.FormEvent) {
    e.preventDefault();
    if (!importUrl.trim() || importing) return;
    snapshot();
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await fetch("/api/import-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.imported === 0) {
        setImportMsg({ kind: "err", text: data.error ?? "Não foi possível importar." });
      } else {
        if (Array.isArray(data.ids) && data.ids.length > 0) {
          const { data: novos } = await supabase.from("content_items").select("*").in("id", data.ids);
          if (novos && novos.length > 0) setItems((p) => [...p, ...(novos as Item[])]);
        }
        setProposta({ siteType: data.siteType ?? "institucional", motivo: data.motivo ?? null, imported: data.imported ?? 0, semFoto: data.semFoto ?? 0 });
        setImportUrl("");
        setShowImport(false);
        router.refresh();
      }
    } catch {
      setImportMsg({ kind: "err", text: "Erro de conexão ao importar." });
    } finally {
      setImporting(false);
    }
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Excluir "${item.title}"? Essa ação não pode ser desfeita.`)) return;
    snapshot();
    setEditingId(null);
    setItems((p) => p.filter((i) => i.id !== item.id));
    await supabase.from("content_items").delete().eq("id", item.id);
  }

  async function renameCategory(oldName: string) {
    const novo = window.prompt("Novo nome da categoria:", oldName === "Destaques" ? "" : oldName);
    if (novo === null) return;
    snapshot();
    const value = novo.trim() || null;
    const ids = ordered.filter((i) => (i.brand_label?.trim() || "Destaques") === oldName).map((i) => i.id);
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
    const ids = ordered.filter((i) => (i.brand_label?.trim() || "Destaques") === name).map((i) => i.id);
    const msg = ids.length === 0
      ? `Excluir a categoria "${name}"? Ela está vazia.`
      : `Excluir a categoria "${name}" e ${ids.length === 1 ? "seu 1 item" : `seus ${ids.length} itens`}? Essa ação não pode ser desfeita.`;
    if (!window.confirm(msg)) return;
    snapshot();
    setItems((p) => p.filter((i) => !ids.includes(i.id)));
    if (ids.length > 0) await Promise.all(ids.map((id) => supabase.from("content_items").delete().eq("id", id)));
    if (categories.includes(name)) await saveCategories(categories.filter((c) => c !== name));
  }

  return (
    <div className="mt-5 flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={autoArrange}
          disabled={arranging || items.length === 0}
          className={`rounded-full orbi-gradient px-4 py-2 text-[13px] font-medium text-on-background ${items.length === 0 ? "opacity-50" : ""}`}
        >
          {arranging ? <OrbiWorking label="Organizando…" variant="inline" /> : "✦ Organizar com Orbi"}
        </button>
        <button onClick={() => createItem()} disabled={creating} className="rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50">
          + Novo item
        </button>
        <button onClick={createCategory} className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] font-medium text-text-secondary">
          + Categoria
        </button>
        <button onClick={() => setShowImport((v) => !v)} className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] text-text-secondary">
          ✦ Importar do site
        </button>
        <Link href={`/${slug}`} target="_blank" className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] text-text-secondary">
          Ver publicado ↗
        </Link>
        <span className="mx-1 h-5 w-px bg-divider" />
        <button
          onClick={undo}
          disabled={history.length === 0 || undoing}
          className="flex items-center gap-1.5 rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] text-text-secondary disabled:opacity-40"
        >
          {undoing ? "Desfazendo…" : "↺ Desfazer"}
        </button>
        <button
          onClick={renovarVitrine}
          className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] text-red-600"
        >
          Renovar vitrine
        </button>
      </div>

      {showImport && (
        <form onSubmit={importFromSite} className="mt-3 flex flex-col gap-2 rounded-[22px] bg-surface-soft p-4">
          <input
            placeholder="https://seusite.com.br"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            className="rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
          />
          {importing ? (
            <OrbiWorking label="Lendo seu site…" />
          ) : (
            <button type="submit" className="rounded-full orbi-gradient px-5 py-2.5 text-[13px] font-medium text-on-background">
              ✦ Importar com Orbi
            </button>
          )}
        </form>
      )}
      {importMsg && <p className={`mt-2 text-[13px] ${importMsg.kind === "ok" ? "text-text-secondary" : "text-red-600"}`}>{importMsg.text}</p>}

      {/* Capa da Vitrine — opcional, pode ter várias fotos (vira carrossel). Sem foto, some sem deixar espaço vazio nem aviso. */}
      <div className="mt-5 rounded-[24px] bg-surface-soft p-5">
        <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Capa da Vitrine (opcional)</p>
        <p className="mt-1 text-[13px] text-text-secondary">
          Uma ou mais fotos grandes no topo da sua Vitrine, antes dos itens — com mais de uma, vira um carrossel. Pode usar fotos da empresa, da equipe, do espaço ou dos bastidores, por exemplo.
        </p>
        <div className="mt-3">
          <GalleryUpload
            value={coverUrls}
            businessId={businessId}
            max={6}
            lockedRatio="banner"
            onChange={async (urls) => {
              snapshot();
              setCoverUrls(urls);
              await supabase.from("businesses").update({ vitrine_cover_urls: urls }).eq("id", businessId);
            }}
          />
        </div>
      </div>

      {proposta && (
        <div className="mt-4 rounded-[24px] orbi-gradient p-[1.5px]">
          <div className="rounded-[23px] bg-surface-white p-5">
            <p className="text-[12px] uppercase tracking-wide text-text-tertiary">A Orbi leu seu site</p>
            <p className="mt-2 font-[family-name:var(--font-manrope)] text-[19px] font-medium">
              {proposta.siteType === "ecommerce"
                ? "Entendi que você tem uma loja virtual"
                : proposta.siteType === "links"
                ? "Entendi que seu site é uma página de apresentação"
                : "Entendi que você é um negócio de serviços"}
            </p>
            {proposta.motivo && <p className="mt-1 text-[13px] text-text-secondary">{proposta.motivo}</p>}
            <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
              {proposta.siteType === "ecommerce"
                ? `Montei ${proposta.imported} boxes de categoria que levam direto para as páginas do seu site.`
                : proposta.siteType === "links"
                ? `Montei ${proposta.imported} boxes de navegação apontando para o seu site e contatos.`
                : `Montei ${proposta.imported} boxes com os serviços que encontrei, usando as fotos do próprio site.`}
              {proposta.semFoto > 0 && ` ${proposta.semFoto} ${proposta.semFoto === 1 ? "box ficou" : "boxes ficaram"} sem foto, em cor neutra.`}
            </p>
            <button onClick={() => setProposta(null)} className="mt-4 rounded-full bg-button-primary px-5 py-2.5 text-[13px] font-medium text-white">
              Beleza, revisar os itens
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 text-[13px] text-text-secondary">
        {publishedCount === 0 ? "Nenhum item ativo ainda." : `${publishedCount} ${publishedCount === 1 ? "item ativo" : "itens ativos"} na sua vitrine.`}
        {" "}Toque num item pra editar.
      </p>

      {items.length === 0 && (
        <div className="mt-5 rounded-[28px] border border-divider bg-surface-white p-6 text-[14px] text-text-secondary">
          Nenhum item ainda. Toque em “+ Novo item” ou importe do seu site.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-8">
        {sections.map((sec) => (
          <div key={sec.name}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-manrope)] text-[20px] font-medium">{sec.name}</h2>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => renameCategory(sec.name)} aria-label="Renomear categoria" className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-[12px] text-text-secondary">✎</button>
                <button onClick={() => deleteCategory(sec.name)} aria-label="Excluir categoria" className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-[12px] text-red-600">×</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-5">
              {sec.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  editing={editingId === item.id}
                  onToggleEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                  onTogglePublish={() => togglePublish(item)}
                  patch={patch}
                  save={save}
                  move={move}
                  idx={ordered.findIndex((i) => i.id === item.id)}
                  total={ordered.length}
                  businessId={businessId}
                  brandColors={brandColors}
                  paletteTab={paletteTab}
                  setPaletteTab={setPaletteTab}
                  categories={allCategoryNames}
                  onNewCategory={(name) => { if (!allCategoryNamesRef().includes(name)) saveCategories([...categories, name]); }}
                  onImprove={() => improveWithOrbi(item)}
                  improving={improving === item.id}
                  onDelete={() => deleteItem(item)}
                  slug={slug}
                  whatsapp={whatsapp}
                />
              ))}
              {sec.items.length === 0 && (
                <button
                  onClick={() => createItem(sec.name === "Destaques" ? null : sec.name)}
                  className="flex min-h-[90px] w-full items-center justify-center rounded-[20px] border border-dashed border-divider text-[13px] text-text-tertiary"
                >
                  + Adicionar item nesta categoria
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Orbi Insight — a esfera de verdade, e um lote de 7 ângulos diferentes pra navegar sem repetir. */}
      {items.length > 0 && (
        <div className="mt-6 rounded-[24px] bg-surface-soft p-6">
          <div className="flex items-start justify-between gap-3">
            <OrbiOrb size={48} />
            {insights && insights.length > 1 && (
              <span className="mt-1 shrink-0 rounded-full bg-surface-white px-3 py-1 text-[11px] font-medium text-text-tertiary">
                {insightIdx + 1} de {insights.length}
              </span>
            )}
          </div>
          <p className="mt-4 font-[family-name:var(--font-manrope)] text-[19px] font-medium">Orbi Insight</p>
          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
            {insights?.[insightIdx] ??
              (publishedCount === 0
                ? "Nenhum item está ativo — os visitantes ainda não veem nada na sua vitrine. Publique pelo menos um."
                : `Você tem ${publishedCount} ${publishedCount === 1 ? "item ativo" : "itens ativos"}. Toque abaixo pra Orbi analisar sua vitrine de verdade.`)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!insights ? (
              <button
                onClick={generateInsights}
                disabled={generatingInsight}
                className="rounded-full orbi-gradient px-4 py-2 text-[13px] font-medium text-on-background disabled:opacity-60"
              >
                {generatingInsight ? "Analisando sua vitrine…" : "✦ Gerar insights"}
              </button>
            ) : (
              <>
                <button onClick={nextInsight} className="rounded-full orbi-gradient px-4 py-2 text-[13px] font-medium text-on-background">
                  Próximo insight →
                </button>
                <button
                  onClick={generateInsights}
                  disabled={generatingInsight}
                  className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] text-text-secondary disabled:opacity-60"
                >
                  {generatingInsight ? "Analisando…" : "Gerar lote novo"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  editing,
  onToggleEdit,
  onTogglePublish,
  patch,
  save,
  move,
  idx,
  total,
  businessId,
  brandColors,
  paletteTab,
  setPaletteTab,
  categories,
  onNewCategory,
  onImprove,
  improving,
  onDelete,
  slug,
  whatsapp,
}: {
  item: Item;
  editing: boolean;
  onToggleEdit: () => void;
  onTogglePublish: () => void;
  patch: (id: string, fields: Partial<Item>) => void;
  save: (id: string, fields: Partial<Item>) => Promise<void>;
  move: (item: Item, dir: -1 | 1) => void;
  idx: number;
  total: number;
  businessId: string;
  brandColors: BrandColor[];
  paletteTab: string;
  setPaletteTab: (v: string) => void;
  categories: string[];
  onNewCategory: (name: string) => void;
  onImprove: () => void;
  improving: boolean;
  onDelete: () => void;
  slug: string;
  whatsapp?: string | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [lastUrl, setLastUrl] = useState(item.image_url);
  if (item.image_url !== lastUrl) {
    setLastUrl(item.image_url);
    setImgFailed(false);
  }
  const size = sizeOf(item.layout_size);
  const c = colorOf(item.box_color);
  const hasPhoto = !!item.image_url && !imgFailed;
  // Tinha foto, mas o link quebrou — diferente de "nunca teve foto".
  const broken = !!item.image_url && imgFailed;
  const ratio = COVER_RATIO_BY_SIZE[size];
  const priceLabel = formatPrice(item);
  // "Médio" fica lado a lado (dois por linha) quando fechado — os outros
  // formatos e o modo de edição sempre ocupam a linha inteira.
  const widthClass = !editing && size === "medio" ? "w-[calc(50%-10px)]" : "w-full";

  // Foto quebrada não pode continuar visível pro público — pausa sozinho e
  // avisa o dono, em vez de deixar um box com aparência de erro no ar.
  useEffect(() => {
    if (broken && item.status === "published") {
      save(item.id, { status: "draft" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broken]);

  return (
    <div id={`item-${item.id}`} className={`overflow-hidden rounded-[24px] bg-surface-white shadow-[0_2px_14px_rgba(17,19,24,0.06)] ${widthClass}`}>
      <div
        className="relative"
        style={{ aspectRatio: RATIOS[ratio].value, minHeight: 150 }}
        onClick={!editing ? onToggleEdit : undefined}
        role={!editing ? "button" : undefined}
      >
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url!}
            alt={item.title}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
            onLoad={(e) => {
              // Alguns links "carregam" mas devolvem um arquivo vazio/corrompido —
              // o navegador não dispara onError nesse caso, então checamos o tamanho real.
              const img = e.currentTarget;
              if (img.naturalWidth === 0 || img.naturalHeight === 0) setImgFailed(true);
            }}
          />
        ) : editing ? (
          <div className="h-full w-full" style={{ backgroundColor: broken ? "#FBEAEA" : c.bg }} />
        ) : broken ? (
          // Link da foto quebrou — item já foi pausado sozinho (useEffect acima).
          // Clique é tratado pelo container pai, então isso é só uma div visual.
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-12 text-center"
            style={{ backgroundColor: "#FBEAEA" }}
          >
            <span className="text-[20px]">⚠</span>
            <span className="font-[family-name:var(--font-open-sans)] text-[15px] font-bold leading-snug text-red-700">
              Foto não carregou
            </span>
            <span className="text-[12px] leading-snug text-red-700/80">
              Pausado até você trocar a foto — o público não vê mais este item.
            </span>
          </div>
        ) : (
          // Sem foto: o próprio nome vira o conteúdo do box — centralizado, sem
          // rodapé branco separado. O card inteiro (tratado pelo container pai) continua clicável pra editar.
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center"
            style={{ backgroundColor: c.bg }}
          >
            <span className="font-[family-name:var(--font-open-sans)] font-bold leading-snug" style={{ color: c.fg, fontSize: titleFontSize(item.title, sizeOf(item.layout_size)) }}>
              {item.title}
            </span>
            {priceLabel && (
              <span className="font-[family-name:var(--font-open-sans)] text-[14px]" style={{ color: c.fg }}>
                {priceLabel}
              </span>
            )}
            {/* Só existe página própria pra abrir se o item não for um link de categoria/externo. */}
            {item.link_kind !== "categoria" && item.link_kind !== "externo" && (
              <span
                className="mt-1 rounded-full px-3 py-1.5 text-[11px] font-medium"
                style={{ backgroundColor: `${c.fg}1A`, color: c.fg }}
              >
                Quero saber mais
              </span>
            )}
          </div>
        )}

        {/* X pequeno pra excluir direto, sem precisar abrir a edição. */}
        <button
          onClick={(e) => { e.stopPropagation(); if (window.confirm(`Excluir "${item.title}"?`)) onDelete(); }}
          className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-surface-white/95 text-[13px] text-text-secondary shadow backdrop-blur"
          aria-label="Excluir item"
        >
          ✕
        </button>

        {/* Selos no canto — só o que precisa da foto pra fazer sentido fica aqui.
            O status (Ativo/Rascunho) agora mora no rodapé branco, junto do título,
            exceto quando não tem rodapé (sem foto ou foto quebrada). */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {!hasPhoto && (
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePublish(); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-white/95 px-3 py-1.5 text-[11px] font-medium shadow backdrop-blur"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${item.status === "published" ? "bg-orbi-gradient-start" : "bg-text-tertiary"}`} />
              {item.status === "published" ? "Ativo" : "Rascunho"}
            </button>
          )}
          {item.image_is_placeholder && !broken && (
            <span className="rounded-full bg-on-background/80 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
              ✦ imagem sugerida
            </span>
          )}
        </div>

      </div>

      {(hasPhoto || editing) && (
        <div className="p-5">
          {!editing ? (
            <button onClick={onToggleEdit} className="flex w-full items-center justify-between gap-3 text-left">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-[family-name:var(--font-manrope)] text-[19px] font-medium">{item.title}</p>
                  {hasPhoto && (
                    <span
                      onClick={(e) => { e.stopPropagation(); onTogglePublish(); }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-medium text-text-secondary"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${item.status === "published" ? "bg-orbi-gradient-start" : "bg-text-tertiary"}`} />
                      {item.status === "published" ? "Ativo" : "Rascunho"}
                    </span>
                  )}
                </div>
                {item.brand_label && <p className="mt-0.5 text-[13px] text-text-tertiary">{item.brand_label}</p>}
              </div>
              {priceLabel && (
                <p className="shrink-0 font-[family-name:var(--font-manrope)] text-[15px] font-medium">{priceLabel}</p>
              )}
            </button>
          ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <input
                value={item.title}
                onChange={(e) => patch(item.id, { title: e.target.value })}
                onBlur={(e) => save(item.id, { title: e.target.value })}
                placeholder="Nome do item"
                className="min-w-0 flex-1 border-b border-divider bg-transparent pb-1 font-[family-name:var(--font-manrope)] text-[19px] font-medium outline-none focus:border-on-background"
              />
              <button onClick={onToggleEdit} className="shrink-0 rounded-full bg-surface-soft px-3 py-1.5 text-[12px] text-text-secondary">Fechar</button>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Descrição</p>
              <textarea
                value={item.description ?? ""}
                onChange={(e) => patch(item.id, { description: e.target.value })}
                onBlur={(e) => save(item.id, { description: e.target.value || null })}
                rows={3}
                placeholder="Conte o que é, pra quem serve, o que inclui"
                className="mt-2 w-full resize-none rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
              />
              <button onClick={onImprove} disabled={improving} className="mt-2 rounded-full orbi-gradient px-4 py-2 text-[12px] font-medium text-on-background disabled:opacity-50">
                {improving ? "Pensando…" : "✦ Melhorar texto"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[12px] uppercase tracking-wide text-text-tertiary">Posição</span>
              <button onClick={() => move(item, -1)} disabled={idx <= 0} className="ml-auto h-9 w-9 rounded-full bg-surface-soft text-[15px] disabled:opacity-30" aria-label="Mover para trás">←</button>
              <span className="text-[13px] text-text-secondary">{idx + 1} de {total}</span>
              <button onClick={() => move(item, 1)} disabled={idx === total - 1} className="h-9 w-9 rounded-full bg-surface-soft text-[15px] disabled:opacity-30" aria-label="Mover para frente">→</button>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Formato</p>
              <div className="mt-2 flex gap-2">
                {(Object.keys(SIZE_LABEL) as BoxSize[]).map((s) => {
                  const ativo = size === s;
                  return (
                    <button key={s} onClick={() => save(item.id, { layout_size: s })} className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border p-2.5 ${ativo ? "border-on-background bg-surface-soft" : "border-divider"}`}>
                      <span className={`rounded-[4px] ${FORMA[s]} ${ativo ? "bg-on-background" : "bg-divider"}`} />
                      <span className="text-[11px] text-text-secondary">{SIZE_LABEL[s]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Foto de capa</p>
              <div className="mt-2">
                <ImageUpload
                  value={item.image_url}
                  businessId={businessId}
                  lockedRatio={COVER_RATIO_BY_SIZE[size]}
                  lockedReason="Segue o formato do box escolhido acima — pra mudar, troque o formato."
                  promptSubject={item.title}
                  onChange={(url) => save(item.id, { image_url: url, image_is_placeholder: false, box_style: url ? "foto" : "cor" })}
                />
              </div>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Mais fotos (até 6) · viram um carrossel na página do item</p>
              <div className="mt-2">
                <GalleryUpload
                  value={item.gallery_urls}
                  businessId={businessId}
                  lockedRatio="retrato"
                  lockedReason="As fotos da galeria são sempre verticais (retrato), pra manter o carrossel uniforme."
                  onChange={(urls) => save(item.id, { gallery_urls: urls })}
                />
              </div>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Cor do box{item.image_url ? " · aparece se remover a foto" : ""}</p>
              <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {brandColors.length > 0 && (
                  <button onClick={() => setPaletteTab("Marca")} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${paletteTab === "Marca" ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}>✦ Marca</button>
                )}
                {PALETTE_GROUPS.map((g) => (
                  <button key={g.name} onClick={() => setPaletteTab(g.name)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${paletteTab === g.name ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}>{g.name}</button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {paletteTab === "Marca"
                  ? brandColors.map((bc, i) => (
                      <button key={`${bc.hex}-${i}`} onClick={() => save(item.id, { box_color: bc.hex })} aria-label={bc.role ?? bc.hex} title={bc.role ?? bc.hex} className={`h-10 w-10 rounded-full border ${item.box_color.toLowerCase() === bc.hex.toLowerCase() ? "border-2 border-on-background" : "border-divider"}`} style={{ backgroundColor: bc.hex }} />
                    ))
                  : Object.entries(PALETTE_GROUPS.find((g) => g.name === paletteTab)?.colors ?? {}).map(([key, cc]) => (
                      <button key={key} onClick={() => save(item.id, { box_color: key })} aria-label={cc.label} title={cc.label} className={`h-10 w-10 rounded-full border ${item.box_color === key ? "border-2 border-on-background" : "border-divider"}`} style={{ backgroundColor: cc.bg }} />
                    ))}
              </div>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Preço</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.keys(PRICE_TYPE_LABEL) as PriceType[]).map((t) => {
                  const ativo = (item.price_type ?? "exato") === t;
                  return (
                    <button
                      key={t}
                      onClick={() => save(item.id, { price_type: t })}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${ativo ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
                    >
                      {PRICE_TYPE_LABEL[t]}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={item.price ?? ""}
                  onChange={(e) => patch(item.id, { price: e.target.value ? Number(e.target.value) : null })}
                  onBlur={(e) => save(item.id, { price: e.target.value ? Number(e.target.value) : null })}
                  inputMode="decimal"
                  placeholder={item.price_type === "faixa" ? "De" : "Sem preço"}
                  className="w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                />
                {item.price_type === "faixa" && (
                  <input
                    value={item.price_max ?? ""}
                    onChange={(e) => patch(item.id, { price_max: e.target.value ? Number(e.target.value) : null })}
                    onBlur={(e) => save(item.id, { price_max: e.target.value ? Number(e.target.value) : null })}
                    inputMode="decimal"
                    placeholder="Até"
                    className="w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                  />
                )}
              </div>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Categoria (vira seção)</p>
              <select
                value={item.brand_label ?? ""}
                onChange={(e) => {
                  if (e.target.value === "__nova__") {
                    const nome = window.prompt("Nome da nova categoria:");
                    if (nome && nome.trim()) {
                      const trimmed = nome.trim();
                      save(item.id, { brand_label: trimmed });
                      onNewCategory(trimmed);
                    }
                    return;
                  }
                  save(item.id, { brand_label: e.target.value || null });
                }}
                className="mt-2 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
              >
                <option value="">Sem categoria (Destaques)</option>
                {categories.map((name) => <option key={name} value={name}>{name}</option>)}
                <option value="__nova__">+ Nova categoria…</option>
              </select>
            </div>

            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Destino</p>
              <p className="mt-1 text-[12px] text-text-tertiary">Pra onde vai quando tocam nesse item.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={() => save(item.id, { link_kind: "produto", target_url: null })}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${(item.link_kind ?? "produto") === "produto" ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
                >
                  Página própria (descrição, fotos)
                </button>
                <button
                  onClick={() => save(item.id, { link_kind: "externo", target_url: item.target_url ?? "" })}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${item.link_kind === "externo" ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
                >
                  Link externo (WhatsApp, site…)
                </button>
              </div>
              {item.link_kind === "externo" && (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    value={item.target_url ?? ""}
                    onChange={(e) => patch(item.id, { target_url: e.target.value })}
                    onBlur={(e) => save(item.id, { target_url: e.target.value || null })}
                    placeholder="https://…"
                    className="w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                  />
                  {whatsapp && (
                    <button
                      onClick={() => save(item.id, { target_url: whatsappLink(whatsapp, `Olá! Vim pelo seu link, quero saber mais sobre "${item.title}".`) })}
                      className="self-start rounded-full border border-[#25D366] px-3 py-1.5 text-[12px] font-medium text-on-background"
                    >
                      ☎ Usar o WhatsApp da empresa
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                await save(item.id, { title: item.title, description: item.description, price: item.price, price_max: item.price_max, brand_label: item.brand_label });
                setJustSaved(true);
                setTimeout(() => { setJustSaved(false); onToggleEdit(); }, 700);
              }}
              className={`block w-full rounded-full py-3 text-center text-[14px] font-medium text-white transition-colors ${justSaved ? "bg-orbi-gradient-start" : "bg-button-primary"}`}
            >
              {justSaved ? "✓ Salvo" : "Salvar"}
            </button>

            <Link href={`/${slug}/p/${item.id}`} target="_blank" className="block rounded-full border border-divider py-3 text-center text-[13px] font-medium">
              Ver página do item ↗
            </Link>
            <button onClick={onDelete} className="block w-full rounded-full py-3 text-center text-[13px] font-medium text-red-600">
              Excluir item
            </button>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
