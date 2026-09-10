"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDialogs } from "@/hooks/useDialogs";
import type { Database } from "@/lib/supabase/types";

type Voucher = Database["public"]["Tables"]["vouchers"]["Row"];

function discountLabel(v: Pick<Voucher, "discount_type" | "discount_value">) {
  return v.discount_type === "percent" ? `${v.discount_value}% off` : `R$ ${v.discount_value} off`;
}

export function VouchersManager({ businessId, initialVouchers, canSave = true }: { businessId: string; initialVouchers: Voucher[]; canSave?: boolean }) {
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

  // Resgate rápido no balcão
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || redeeming) return;
    setRedeeming(true);
    setRedeemResult(null);
    try {
      const res = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemResult({ ok: false, message: data.error ?? "Código inválido." });
      } else {
        setRedeemResult({ ok: true, message: `✓ Confirmado: ${data.voucher?.title ?? "cupom"} (${discountLabel(data.voucher)})` });
        setCode("");
        // Atualiza o contador de resgatados na lista.
        const { data: fresh } = await supabase.from("vouchers").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
        if (fresh) setVouchers(fresh);
      }
    } finally {
      setRedeeming(false);
    }
  }

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
    <div className="mt-5 flex flex-col gap-6">
      <DialogRenderer />
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setShowUpgrade(false)}>
          <div className="w-full max-w-[340px] rounded-[24px] bg-surface-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-[16px] font-semibold">Cupons são do plano Nióbio 💎</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
              Você montou seu cupom — pra ele valer de verdade na sua página, com código único e controle de estoque,
              é só ativar o Nióbio. Seu cupom fica salvo assim que assinar.
            </p>
            <Link href="/admin/planos" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-button-primary py-3 text-[14px] font-medium text-white">
              Assinar Nióbio
            </Link>
            <button onClick={() => setShowUpgrade(false)} className="mt-2 w-full rounded-full py-2 text-[13px] text-text-secondary">
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Resgate rápido — pensado pra ser usado na frente do cliente, no balcão */}
      <div className="rounded-[24px] border border-divider bg-surface-white p-5">
        <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Resgatar código</p>
        <form onSubmit={handleRedeem} className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setRedeemResult(null); }}
            placeholder="Ex: A1B2C3"
            className="flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[18px] font-medium uppercase tracking-wider outline-none focus:border-on-background"
          />
          <button
            type="submit"
            disabled={redeeming || !code.trim()}
            className="rounded-2xl bg-button-primary px-5 py-3 text-[14px] font-medium text-white disabled:opacity-40"
          >
            {redeeming ? "..." : "Confirmar"}
          </button>
        </form>
        {redeemResult && (
          <p className={`mt-2.5 text-[13px] font-medium ${redeemResult.ok ? "text-green-700" : "text-red-600"}`}>
            {redeemResult.message}
          </p>
        )}
      </div>

      {/* Lista de cupons */}
      <div className="flex flex-col gap-3">
        {vouchers.map((v) => (
          <div key={v.id} className="rounded-[22px] border border-divider bg-surface-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{v.title}</p>
                <p className="mt-0.5 text-[13px] text-text-secondary">{discountLabel(v)}</p>
              </div>
              <button
                onClick={() => toggleActive(v)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${v.is_active ? "bg-surface-soft text-text-secondary" : "bg-surface-soft text-text-tertiary"}`}
              >
                <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${v.is_active ? "bg-orbi-gradient-start" : "bg-text-tertiary"}`} />
                {v.is_active ? "Ativo" : "Pausado"}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-text-tertiary">
              {v.quantity_claimed} de {v.quantity_total} resgatados
              {v.expires_hours ? ` · código expira em ${v.expires_hours}h se não for usado` : " · sem validade"}
            </p>
            {v.description?.trim() && <p className="mt-1 text-[12px] text-text-tertiary">{v.description}</p>}
            <button onClick={() => deleteVoucher(v)} className="mt-2 text-[12px] text-red-600">
              Excluir
            </button>
          </div>
        ))}

        {vouchers.length === 0 && !creating && (
          <div className="rounded-[24px] border border-divider bg-surface-white p-6 text-center text-[13px] text-text-secondary">
            Nenhum cupom ainda.
          </div>
        )}
      </div>

      {creating ? (
        <form onSubmit={createVoucher} className="flex flex-col gap-3 rounded-[24px] border border-divider bg-surface-white p-5">
          <p className="text-[13px] font-medium">Novo cupom</p>
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
            <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Quantos cupons disponíveis</p>
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
            <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Validade do código após resgate (em horas)</p>
            <input
              value={expiresHours}
              onChange={(e) => setExpiresHours(e.target.value)}
              placeholder="Deixe em branco pra sem validade"
              type="number"
              min="1"
              className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
            />
            <p className="mt-1 text-[11px] text-text-tertiary">
              Se a pessoa resgatar e não aparecer dentro desse prazo, a vaga volta pro estoque.
            </p>
          </div>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => setCreating(false)} className="flex-1 rounded-full bg-surface-soft px-4 py-2.5 text-[13px] font-medium">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !discountValue || !quantityTotal}
              className="flex-1 rounded-full bg-button-primary px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
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
