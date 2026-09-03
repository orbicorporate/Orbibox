"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";

type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  status: string;
  type: string;
  ai_optimized: boolean;
  image_url: string | null;
  image_is_placeholder: boolean;
  brand_label: string | null;
  position: number;
};

export function ContentManager({ businessId, initialItems }: { businessId: string; initialItems: ContentItem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<ContentItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [improving, setImproving] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // O que a Orbi entendeu do site — vira a tela de proposta.
  const [proposta, setProposta] = useState<{ siteType: string; motivo: string | null; imported: number; semFoto: number } | null>(null);
  const [creating, setCreating] = useState(false);

  const [prevInitial, setPrevInitial] = useState(initialItems);
  if (prevInitial !== initialItems) { setPrevInitial(initialItems); setItems(initialItems); }

  const ordered = [...items].sort((a, b) => a.position - b.position);
  const ativos = ordered.filter((i) => i.status === "published").length;

  async function novoItem() {
    setCreating(true);
    const { data, error } = await supabase
      .from("content_items")
      .insert({ business_id: businessId, type: "product", title: "Novo item", status: "draft", position: items.length })
      .select()
      .single();
    setCreating(false);
    if (!error && data) {
      setItems((p) => [...p, data as ContentItem]);
      setEditingId(data.id);
    }
  }

  async function importFromSite(e: React.FormEvent) {
    e.preventDefault();
    if (!importUrl.trim() || importing) return;
    setImporting(true); setImportMsg(null);
    try {
      const res = await fetch("/api/import-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.imported === 0) setImportMsg({ kind: "err", text: data.error ?? "Não foi possível importar." });
      else {
        setProposta({ siteType: data.siteType ?? "institucional", motivo: data.motivo ?? null, imported: data.imported ?? 0, semFoto: data.semFoto ?? 0 });
        setImportUrl("");
        setShowImport(false);
        router.refresh();
      }
    } catch { setImportMsg({ kind: "err", text: "Erro de conexão ao importar." }); }
    finally { setImporting(false); }
  }

  async function togglePublish(item: ContentItem) {
    const s = item.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("content_items").update({ status: s }).eq("id", item.id);
    if (!error) setItems((p) => p.map((i) => (i.id === item.id ? { ...i, status: s } : i)));
  }

  async function improveWithOrbi(item: ContentItem) {
    setImproving(item.id);
    try {
      const res = await fetch("/api/improve-content", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId: item.id }),
      });
      if (res.ok) {
        const { description } = await res.json();
        setItems((p) => p.map((i) => (i.id === item.id ? { ...i, description, ai_optimized: true } : i)));
      }
    } finally { setImproving(null); }
  }

  function patch(id: string, fields: Partial<ContentItem>) {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...fields } : i)));
  }

  async function save(item: ContentItem) {
    await supabase.from("content_items").update({
      title: item.title, description: item.description, price: item.price,
      brand_label: item.brand_label, image_url: item.image_url, image_is_placeholder: false,
    }).eq("id", item.id);
    patch(item.id, { image_is_placeholder: false });
    setEditingId(null);
  }

  async function remove(item: ContentItem) {
    const { error } = await supabase.from("content_items").delete().eq("id", item.id);
    if (!error) setItems((p) => p.filter((i) => i.id !== item.id));
  }

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[38px] font-medium leading-[1.1] tracking-[-0.02em]">
        Feed de<br />Conteúdo
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
        Gerencie os produtos e serviços do seu catálogo. A curadoria da coleção atual reflete a
        essência da marca.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={novoItem}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-full bg-button-primary px-5 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
        >
          + Novo Item
        </button>
        <button
          onClick={() => setShowImport((v) => !v)}
          className="rounded-full border border-divider bg-surface-white px-5 py-2.5 text-[14px] text-text-secondary"
        >
          ✦ Importar do site
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
          <button type="submit" disabled={importing} className="rounded-full orbi-gradient px-5 py-2.5 text-[13px] font-medium text-on-background disabled:opacity-50">
            {importing ? "Lendo seu site…" : "✦ Importar com Orbi"}
          </button>
        </form>
      )}
      {importMsg && (
        <p className={`mt-2 text-[13px] ${importMsg.kind === "ok" ? "text-text-secondary" : "text-red-600"}`}>{importMsg.text}</p>
      )}

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
                ? `Montei ${proposta.imported} boxes de categoria que levam direto para as páginas do seu site — cada clique é contado como visita que você recebeu.`
                : proposta.siteType === "links"
                ? `Montei ${proposta.imported} boxes de navegação apontando para o seu site e contatos.`
                : `Montei ${proposta.imported} boxes com os serviços que encontrei, usando as fotos do próprio site.`}
              {proposta.semFoto > 0 && ` ${proposta.semFoto} ${proposta.semFoto === 1 ? "box ficou" : "boxes ficaram"} sem foto, em cor neutra — coloque a sua quando quiser.`}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setProposta(null)} className="rounded-full bg-button-primary px-5 py-2.5 text-[13px] font-medium text-white">
                Usar essa proposta
              </button>
              <Link href="/admin/vitrine" className="rounded-full border border-divider px-5 py-2.5 text-[13px] font-medium">
                Ajustar na Vitrine
              </Link>
            </div>
            <p className="mt-3 text-[12px] text-text-tertiary">
              Nada é definitivo — dá para editar, trocar formato, cor e foto de cada box.
            </p>
          </div>
        </div>
      )}

      {/* Cards do feed */}
      <div className="mt-6 flex flex-col gap-5">
        {ordered.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-[24px] bg-surface-white shadow-[0_2px_14px_rgba(17,19,24,0.06)]">
            <div className="relative">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt={item.title} className="h-[260px] w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
              ) : (
                <div className="flex h-[180px] w-full items-center justify-center bg-surface-soft text-[13px] text-text-tertiary">
                  sem foto — toque em Editar
                </div>
              )}
              {/* Selo de status, como na referência */}
              <button
                onClick={() => togglePublish(item)}
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface-white/95 px-3 py-1.5 text-[11px] font-medium shadow backdrop-blur"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${item.status === "published" ? "bg-orbi-gradient-start" : "bg-text-tertiary"}`} />
                {item.status === "published" ? "Ativo" : "Rascunho"}
              </button>
              {item.image_is_placeholder && (
                <span className="absolute left-3 top-3 rounded-full bg-on-background/80 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                  ✦ imagem sugerida
                </span>
              )}
            </div>

            <div className="p-5">
              {editingId === item.id ? (
                <div className="flex flex-col gap-3">
                  <ImageUpload value={item.image_url} onChange={(url) => patch(item.id, { image_url: url })} businessId={businessId} />
                  <input value={item.title} onChange={(e) => patch(item.id, { title: e.target.value })} placeholder="Nome do item" className="rounded-2xl border border-divider px-4 py-2.5 text-[15px] outline-none focus:border-on-background" />
                  <input value={item.brand_label ?? ""} onChange={(e) => patch(item.id, { brand_label: e.target.value })} placeholder="Categoria (ex: Coleção Resort)" className="rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
                  <textarea value={item.description ?? ""} onChange={(e) => patch(item.id, { description: e.target.value })} placeholder="Descrição" rows={3} className="resize-none rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
                  <input value={item.price ?? ""} onChange={(e) => patch(item.id, { price: e.target.value ? Number(e.target.value) : null })} placeholder="Preço" inputMode="decimal" className="rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => save(item)} className="rounded-full bg-button-primary px-5 py-2.5 text-[13px] font-medium text-white">Salvar</button>
                    <button onClick={() => improveWithOrbi(item)} disabled={improving === item.id} className="rounded-full orbi-gradient px-5 py-2.5 text-[13px] font-medium text-on-background disabled:opacity-50">
                      {improving === item.id ? "Pensando…" : "✦ Melhorar texto"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="rounded-full bg-surface-soft px-5 py-2.5 text-[13px]">Cancelar</button>
                    <button onClick={() => remove(item)} className="ml-auto rounded-full px-4 py-2.5 text-[13px] text-text-tertiary">Excluir</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingId(item.id)} className="flex w-full items-center justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="truncate font-[family-name:var(--font-manrope)] text-[19px] font-medium">{item.title}</p>
                    {item.brand_label && <p className="mt-0.5 text-[13px] text-text-tertiary">{item.brand_label}</p>}
                  </div>
                  {item.price != null && (
                    <p className="shrink-0 font-[family-name:var(--font-manrope)] text-[19px] font-medium">R$ {Number(item.price).toFixed(0)}</p>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {ordered.length === 0 && (
          <div className="rounded-[24px] border border-divider bg-surface-white p-6 text-[14px] text-text-secondary">
            Nenhum item ainda. Toque em “+ Novo Item” ou importe do seu site.
          </div>
        )}
      </div>

      {/* Orbi Insight, como na referência */}
      {ordered.length > 0 && (
        <div className="mt-6 rounded-[24px] bg-surface-soft p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-full orbi-gradient text-[18px]">✦</div>
          <p className="mt-4 font-[family-name:var(--font-manrope)] text-[19px] font-medium">Orbi Insight</p>
          <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
            {ativos === 0
              ? "Nenhum item está ativo — os visitantes ainda não veem nada na sua vitrine. Ative pelo menos um."
              : `Você tem ${ativos} ${ativos === 1 ? "item ativo" : "itens ativos"}. Itens com foto e descrição própria convertem mais do que os que ficaram com imagem sugerida.`}
          </p>
        </div>
      )}
    </div>
  );
}
