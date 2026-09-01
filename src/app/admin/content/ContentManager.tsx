"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OrbBadge } from "@/components/ui/OrbBadge";

type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  status: string;
  type: string;
  ai_optimized: boolean;
};

export function ContentManager({
  businessId,
  initialItems,
}: {
  businessId: string;
  initialItems: ContentItem[];
}) {
  const supabase = createClient();
  const [items, setItems] = useState<ContentItem[]>(initialItems);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("content_items")
      .insert({
        business_id: businessId,
        type: "product",
        title,
        price: price ? Number(price) : null,
        status: "draft",
        position: items.length,
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setItems((prev) => [...prev, data as ContentItem]);
      setTitle("");
      setPrice("");
    }
  }

  async function togglePublish(item: ContentItem) {
    const newStatus = item.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("content_items")
      .update({ status: newStatus })
      .eq("id", item.id);
    if (!error) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
      );
    }
  }

  async function improveWithOrbi(item: ContentItem) {
    // Placeholder para integração real de otimização por IA.
    const improved = item.description
      ? item.description
      : `${item.title} — peça pensada para quem busca praticidade sem abrir mão de estilo.`;
    const { error } = await supabase
      .from("content_items")
      .update({ description: improved, ai_optimized: true })
      .eq("id", item.id);
    if (!error) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, description: improved, ai_optimized: true } : i
        )
      );
    }
  }

  async function remove(item: ContentItem) {
    const { error } = await supabase.from("content_items").delete().eq("id", item.id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form onSubmit={addItem} className="flex flex-col gap-3 sm:flex-row">
          <input
            placeholder="Nome do produto ou serviço"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-2xl border border-divider px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
          />
          <input
            placeholder="Preço (opcional)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-2xl border border-divider px-4 py-2.5 text-[15px] outline-none focus:border-on-background sm:w-40"
          />
          <Button type="submit" disabled={saving}>
            Adicionar
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[15px] font-medium">{item.title}</p>
                {item.price != null && (
                  <p className="text-[13px] text-text-tertiary">
                    R$ {Number(item.price).toFixed(2)}
                  </p>
                )}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[12px] ${
                  item.status === "published"
                    ? "bg-surface-soft text-on-background"
                    : "bg-surface-soft text-text-tertiary"
                }`}
              >
                {item.status === "published" ? "publicado" : "rascunho"}
              </span>
            </div>
            {item.description && (
              <p className="text-[14px] text-text-secondary">{item.description}</p>
            )}
            {item.ai_optimized && <OrbBadge state="done" label="Otimizado pela Orbi" />}
            <div className="mt-1 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => togglePublish(item)}>
                {item.status === "published" ? "Despublicar" : "Publicar"}
              </Button>
              {!item.ai_optimized && (
                <Button variant="orbi" onClick={() => improveWithOrbi(item)}>
                  ✦ Melhorar com Orbi
                </Button>
              )}
              <Button variant="ghost" onClick={() => remove(item)}>
                Excluir
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <Card className="sm:col-span-2 text-[15px] text-text-secondary">
            Nenhum conteúdo ainda. Adicione seu primeiro produto ou serviço acima.
          </Card>
        )}
      </div>
    </div>
  );
}
