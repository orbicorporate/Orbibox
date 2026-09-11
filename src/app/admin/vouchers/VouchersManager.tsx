"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDialogs } from "@/hooks/useDialogs";
import { ImageUpload } from "@/components/ui/ImageUpload";
import type { Database } from "@/lib/supabase/types";

type Voucher = Database["public"]["Tables"]["vouchers"]["Row"];
type Redemption = Database["public"]["Tables"]["voucher_redemptions"]["Row"];

function discountLabel(v: Pick<Voucher, "discount_type" | "discount_value">) {
  return v.discount_type === "percent" ? `${v.discount_value}% off` : `R$ ${v.discount_value} off`;
}

export function VouchersManager({ businessId, initialVouchers, canSave = true, redemptionsByVoucher = {} }: { businessId: string; initialVouchers: Voucher[]; canSave?: boolean; redemptionsByVoucher?: Record<string, Redemption[]> }) {
  const supabase = createClient();
  const { confirm, DialogRenderer } = useDialogs();
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Form de criação
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [quantityTotal, setQuantityTotal] = useState("");
  const [expiresHours, setExpiresHours] = useState("48");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [badge, setBadge] = useState("");

  async function createVoucher(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !discountValue || !quantityTotal || saving) return;
    // Titânio montou o cupom pra ver como é — na hora de salvar, pede o upgrade.
    if (!canSave) {
      setShowUpgrade(true);
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("vouchers")
        .insert({
          business_id: businessId,
          title: title.trim(),
          description: description.trim() || null,
          discount_type: discountType,
          discount_value: Number(discountValue),
          quantity_total: Number(quantityTotal),
          expires_hours: expiresHours.trim() ? Number(expiresHours) : null,
          image_url: imageUrl,
          badge: badge.trim() || null,
        })
        .select()
        .single();
      if (!error && data) {
        setVouchers((p) => [data as Voucher, ...p]);
        setCreating(false);
        setTitle("");
        setDescription("");
        setDiscountValue("");
        setQuantityTotal("");
        setExpiresHours("48");
        setImageUrl(null);
        setBadge("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(v: Voucher) {
    const { data } = await supabase.from("vouchers").update({ is_active: !v.is_active }).eq("id", v.id).select().single();
    if (data) setVouchers((p) => p.map((x) => (x.id === v.id ? (data as Voucher) : x)));
  }

  async function deleteVoucher(v: Voucher) {
    if (!(await confirm({ title: "Excluir cupom", message: `Excluir "${v.title}"? Códigos já resgatados continuam válidos até você excluir também os resgates — mas ninguém mais vai conseguir gerar um novo.`, confirmLabel: "Excluir", danger: true }))) return;
    await supabase.from("vouchers").delete().eq("id", v.id);
    setVouchers((p) => p.filter((x) => x.id !== v.id));
  }

  return (
    <div className="mt-6 flex flex-col gap-7">
      <DialogRenderer />
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setShowUpgrade(false)}>
          <div className="w-full max-w-[340px] rounded-[24px] bg-surface-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-[16px] font-semibold">Cupons são do plano Nióbio 💎</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
              Você montou seu cupom — pra ele valer de verdade na sua página, com código único e controle de estoque,
              é só ativar o Nióbio. Seu cupom fica salvo assim que assinar.
            </p>
            <Link href="/admin/planos" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-button-primary py-3 text-[14px] font-medium text-white">
              Assinar Nióbio
            </Link>
            <button onClick={() => setShowUpgrade(false)} className="mt-2 w-full rounded-full py-2 text-[14px] text-text-secondary">
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Lista de cupons */}
      <div className="flex flex-col gap-3">
        {vouchers.length > 0 && (
          <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Seus cupons</p>
        )}
        {vouchers.map((v) => {
          const restam = v.quantity_total - v.quantity_claimed;
          const pct = v.quantity_total > 0 ? Math.min(100, Math.round((v.quantity_claimed / v.quantity_total) * 100)) : 0;
          const meusResgates = redemptionsByVoucher[v.id] ?? [];
          return (
            <div key={v.id} className="rounded-[24px] border border-divider bg-surface-white p-5">
              <div className="flex items-start gap-3">
                {v.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image_url} alt={v.title} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFE1E7] text-[22px]">🎟️</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{v.title}</p>
                  <p className="mt-0.5 text-[14px] text-text-secondary">{discountLabel(v)}</p>
                  {v.badge?.trim() && (
                    <span className="mt-1.5 inline-block rounded-full bg-[#FFE1E7] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#E0395F]">{v.badge}</span>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(v)}
                  className="shrink-0 rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-medium text-text-secondary"
                >
                  <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${v.is_active ? "bg-orbi-gradient-start" : "bg-text-tertiary"}`} />
                  {v.is_active ? "Ativo" : "Pausado"}
                </button>
              </div>

              {v.description?.trim() && (
                <div className="mt-3 rounded-2xl bg-surface-soft px-3.5 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Observação</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">{v.description}</p>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between text-[12px] text-text-tertiary">
                  <span>{v.quantity_claimed} de {v.quantity_total} resgatados</span>
                  <span>{restam > 0 ? `${restam} restantes` : "Esgotado"}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                  <div className="h-full rounded-full orbi-gradient" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <p className="mt-3 text-[12px] text-text-tertiary">
                {v.expires_hours ? `Código expira em ${v.expires_hours}h se não for usado` : "Código sem validade"}
              </p>

              {/* Quem resgatou — botão bem visível pro painel completo, com nome, WhatsApp e filtros */}
              <Link
                href={`/admin/vouchers/${v.id}`}
                className="relative mt-4 flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-[#FF6A4D] to-[#FF2E7E] py-3 text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(255,46,126,0.35)]"
              >
                📊 Ver painel completo{meusResgates.length > 0 ? ` (${meusResgates.length})` : ""}
              </Link>

              <button onClick={() => deleteVoucher(v)} className="mt-3 text-[13px] text-red-600">
                Excluir
              </button>
            </div>
          );
        })}

        {vouchers.length === 0 && !creating && (
          <div className="flex flex-col items-center rounded-[24px] border border-dashed border-divider p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-[22px]">🎟️</span>
            <p className="mt-3 text-[15px] font-medium">Nenhum cupom ainda</p>
            <p className="mt-1 max-w-[240px] text-[13px] leading-relaxed text-text-tertiary">
              Crie o primeiro cupom aí embaixo — leva menos de um minuto.
            </p>
          </div>
        )}
      </div>

      {creating ? (
        <form onSubmit={createVoucher} className="flex flex-col gap-3 rounded-[24px] border border-divider bg-surface-white p-5">
          <p className="text-[15px] font-semibold">Novo cupom</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (ex: 10% na primeira compra)"
            className="rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional"
            rows={2}
            className="resize-none rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
          />

          <div>
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Etiqueta de destaque (opcional)</p>
            <input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="Ex: Mais usado, Cliente VIP, Aniversário"
              maxLength={24}
              className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
            />
            <p className="mt-1 text-[12px] text-text-tertiary">Aparece como um selinho no cupom, na página do visitante.</p>
          </div>

          <div>
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Foto do cupom (opcional)</p>
            <p className="mb-2 mt-1 text-[12px] text-text-tertiary">Fica do lado do desconto, na galeria de cupons. Uma foto do produto ou do ambiente funciona bem.</p>
            <ImageUpload value={imageUrl} businessId={businessId} lockedRatio="quadrado" promptKind="capa" promptSubject={title || undefined} onChange={setImageUrl} />
          </div>
          <div className="flex gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
              className="rounded-2xl border border-divider bg-surface-white px-3 py-2.5 text-[14px] outline-none"
            >
              <option value="percent">% desconto</option>
              <option value="fixed">R$ desconto</option>
            </select>
            <input
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent" ? "Ex: 10" : "Ex: 15"}
              type="number"
              min="0"
              className="flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
            />
          </div>
          <div>
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Quantos cupons disponíveis</p>
            <input
              value={quantityTotal}
              onChange={(e) => setQuantityTotal(e.target.value)}
              placeholder="Ex: 50"
              type="number"
              min="1"
              className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
            />
          </div>
          <div>
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Validade do código após resgate (em horas)</p>
            <input
              value={expiresHours}
              onChange={(e) => setExpiresHours(e.target.value)}
              placeholder="Deixe em branco pra sem validade"
              type="number"
              min="1"
              className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
            />
            <p className="mt-1 text-[12px] text-text-tertiary">
              Se a pessoa resgatar e não aparecer dentro desse prazo, a vaga volta pro estoque.
            </p>
          </div>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => setCreating(false)} className="flex-1 rounded-full bg-surface-soft px-4 py-2.5 text-[14px] font-medium">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !discountValue || !quantityTotal}
              className="flex-1 rounded-full bg-button-primary px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-40"
            >
              {saving ? "Criando…" : "Criar cupom"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="orbi-gradient rounded-full px-5 py-3 text-[14px] font-medium text-on-background"
        >
          + Novo cupom
        </button>
      )}
    </div>
  );
}
