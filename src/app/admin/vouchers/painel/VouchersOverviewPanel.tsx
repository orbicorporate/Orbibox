"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { whatsappLink } from "@/lib/track";
import type { Database } from "@/lib/supabase/types";

type Voucher = Database["public"]["Tables"]["vouchers"]["Row"];
type Redemption = Database["public"]["Tables"]["voucher_redemptions"]["Row"];

function discountLabel(v: Pick<Voucher, "discount_type" | "discount_value">) {
  return v.discount_type === "percent" ? `${v.discount_value}% off` : `R$ ${v.discount_value} off`;
}

function statusLabel(status: string) {
  if (status === "redeemed") return "Confirmado";
  if (status === "expired") return "Expirado";
  return "Aguardando";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function VouchersOverviewPanel({ businessId, initialVouchers, initialRedemptions }: { businessId: string; initialVouchers: Voucher[]; initialRedemptions: Redemption[] }) {
  const supabase = createClient();
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [redemptions, setRedemptions] = useState(initialRedemptions);
  const [voucherFilter, setVoucherFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | "claimed" | "redeemed">("todos");
  const [query, setQuery] = useState("");

  // Resgate no balcão — vale pra qualquer cupom do negócio
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ ok: boolean; message: string } | null>(null);

  const voucherById = useMemo(() => new Map(vouchers.map((v) => [v.id, v])), [vouchers]);

  const filtered = useMemo(() => {
    return redemptions.filter((r) => {
      if (voucherFilter !== "todos" && r.voucher_id !== voucherFilter) return false;
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (r.visitor_name ?? "").toLowerCase().includes(q) || (r.visitor_whatsapp ?? "").toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
    });
  }, [redemptions, voucherFilter, statusFilter, query]);

  const totalResgatados = redemptions.length;
  const totalConfirmados = redemptions.filter((r) => r.status === "redeemed").length;
  const totalAguardando = redemptions.filter((r) => r.status === "claimed").length;
  const ativos = vouchers.filter((v) => v.is_active).length;

  async function refresh() {
    const [{ data: fv }, { data: fr }] = await Promise.all([
      supabase.from("vouchers").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("voucher_redemptions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    ]);
    if (fv) setVouchers(fv as Voucher[]);
    if (fr) setRedemptions(fr as Redemption[]);
  }

  async function handleRedeem(e: FormEvent) {
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
        await refresh();
      }
    } finally {
      setRedeeming(false);
    }
  }

  async function toggleActive(v: Voucher) {
    const { data } = await supabase.from("vouchers").update({ is_active: !v.is_active }).eq("id", v.id).select().single();
    if (data) setVouchers((p) => p.map((x) => (x.id === v.id ? (data as Voucher) : x)));
  }

  return (
    <div className="flex flex-col pb-4">
      <Link href="/admin/vouchers" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Cupons</Link>

      <div className="relative mt-4">
        <div aria-hidden className="absolute inset-0 -z-10 rounded-[28px] bg-[#FF3B6E] opacity-25 blur-2xl" />
        <div className="rounded-[28px] bg-gradient-to-br from-[#FF6A4D] to-[#FF2E7E] p-6 text-white shadow-[0_14px_38px_rgba(255,46,126,0.35)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-85">📊 Painel de controle</p>
          <p className="mt-1.5 font-[family-name:var(--font-manrope)] text-[24px] font-bold leading-tight">Todos os seus cupons</p>
          <p className="mt-1 text-[13.5px] opacity-90">{ativos} {ativos === 1 ? "cupom ativo" : "cupons ativos"} · {totalResgatados} {totalResgatados === 1 ? "resgate" : "resgates"} no total</p>
        </div>
      </div>

      {/* Totais coloridos */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-[20px] p-3.5" style={{ backgroundColor: "#E7EAFC" }}>
          <p className="text-[24px] font-bold" style={{ color: "#4453D6" }}>{totalResgatados}</p>
          <p className="mt-0.5 text-[12px] font-medium" style={{ color: "#4453D6" }}>resgatados</p>
        </div>
        <div className="rounded-[20px] p-3.5" style={{ backgroundColor: "#FDEEDF" }}>
          <p className="text-[24px] font-bold" style={{ color: "#C2650A" }}>{totalAguardando}</p>
          <p className="mt-0.5 text-[12px] font-medium" style={{ color: "#C2650A" }}>aguardando</p>
        </div>
        <div className="rounded-[20px] p-3.5" style={{ backgroundColor: "#DEF3E3" }}>
          <p className="text-[24px] font-bold" style={{ color: "#1F9E4C" }}>{totalConfirmados}</p>
          <p className="mt-0.5 text-[12px] font-medium" style={{ color: "#1F9E4C" }}>confirmados</p>
        </div>
      </div>

      {/* Resgatar no balcão */}
      <div className="mt-5 rounded-[24px] border border-divider bg-surface-white p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[16px]">🔎</span>
          <p className="text-[15px] font-semibold">Resgatar código</p>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-text-secondary">
          Cliente chegou com o cupom? Digite o código e confirme — vale pra qualquer cupom seu.
        </p>
        <form onSubmit={handleRedeem} className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setRedeemResult(null); }}
            placeholder="EX: A1B2C3"
            className="flex-1 rounded-2xl border-2 border-divider bg-surface-white px-4 py-3.5 text-center text-[19px] font-semibold uppercase tracking-[3px] outline-none focus:border-on-background"
          />
          <button type="submit" disabled={redeeming || !code.trim()} className="shrink-0 rounded-2xl bg-button-primary px-5 py-3.5 text-[14px] font-semibold text-white disabled:opacity-40">
            {redeeming ? "…" : "Confirmar"}
          </button>
        </form>
        {redeemResult && (
          <div className={`mt-3 rounded-2xl px-4 py-3 text-[13.5px] font-medium leading-relaxed ${redeemResult.ok ? "bg-[#DEF3E3] text-[#1F9E4C]" : "bg-red-50 text-red-600"}`}>
            {redeemResult.message}
          </div>
        )}
      </div>

      {/* Cupons — ativar/pausar direto daqui, e filtrar a lista por eles */}
      <p className="mt-6 text-[15px] font-semibold">Seus cupons</p>
      <div className="mt-2.5 flex flex-col gap-2">
        {vouchers.map((v) => {
          const qtd = redemptions.filter((r) => r.voucher_id === v.id).length;
          const selecionado = voucherFilter === v.id;
          return (
            <div key={v.id} className={`flex items-center gap-3 rounded-[20px] border p-3 ${selecionado ? "border-on-background bg-surface-white" : "border-divider bg-surface-white"}`}>
              <button onClick={() => setVoucherFilter(selecionado ? "todos" : v.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {v.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image_url} alt={v.title} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFE1E7] text-[18px]">🎟️</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{v.title}</span>
                  <span className="block text-[12px] text-text-tertiary">{discountLabel(v)} · {qtd} {qtd === 1 ? "resgate" : "resgates"}</span>
                </span>
              </button>
              <button
                onClick={() => toggleActive(v)}
                className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${v.is_active ? "bg-[#DEF3E3] text-[#1F9E4C]" : "bg-surface-soft text-text-tertiary"}`}
              >
                {v.is_active ? "Ativo" : "Pausado"}
              </button>
              <Link href={`/admin/vouchers/${v.id}`} className="shrink-0 text-[16px] text-text-tertiary" aria-label="Abrir painel do cupom">›</Link>
            </div>
          );
        })}
        {vouchers.length === 0 && (
          <p className="text-[13px] text-text-tertiary">Nenhum cupom criado ainda.</p>
        )}
      </div>
      {voucherFilter !== "todos" && (
        <button onClick={() => setVoucherFilter("todos")} className="mt-2 self-start text-[12.5px] font-medium text-text-secondary underline">
          Mostrar resgates de todos os cupons
        </button>
      )}

      {/* Lista de resgates — com filtro por cupom, status e busca */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[15px] font-semibold">
          {voucherFilter === "todos" ? "Todos os resgates" : `Resgates: ${voucherById.get(voucherFilter)?.title ?? "cupom"}`}
        </p>
        <span className="text-[13px] text-text-tertiary">{filtered.length}</span>
      </div>

      {redemptions.length > 0 && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, WhatsApp ou código"
            className="mt-3 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
          />
          <div className="mt-2.5 flex gap-2">
            {([
              { v: "todos", t: "Todos" },
              { v: "claimed", t: "Aguardando" },
              { v: "redeemed", t: "Confirmados" },
            ] as const).map((f) => (
              <button
                key={f.v}
                onClick={() => setStatusFilter(f.v)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${statusFilter === f.v ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
              >
                {f.t}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 flex flex-col gap-2.5">
        {redemptions.length === 0 && (
          <div className="rounded-[22px] border border-dashed border-divider p-6 text-center">
            <p className="text-[14px] font-medium">Ninguém resgatou ainda</p>
            <p className="mt-1 text-[13px] text-text-tertiary">Assim que alguém pegar um cupom na sua página, aparece aqui com nome e WhatsApp.</p>
          </div>
        )}
        {filtered.map((r) => {
          const v = voucherById.get(r.voucher_id);
          return (
            <div key={r.id} className="rounded-[20px] border border-divider bg-surface-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-semibold">{r.visitor_name || "Sem nome"}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-text-secondary">{v?.title ?? "Cupom"} · código {r.code}</p>
                  <p className="mt-0.5 text-[12px] text-text-tertiary">{formatDate(r.created_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.status === "redeemed" ? "bg-[#DEF3E3] text-[#1F9E4C]" : r.status === "expired" ? "bg-surface-soft text-text-tertiary" : "bg-[#FDEEDF] text-[#C2650A]"}`}>
                  {statusLabel(r.status)}
                </span>
              </div>
              {r.visitor_whatsapp && (
                <a
                  href={whatsappLink(r.visitor_whatsapp, `Olá ${r.visitor_name || ""}! Sobre o cupom ${r.code}...`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#DEF3E3] px-3 py-1.5 text-[12.5px] font-medium text-[#1F9E4C]"
                >
                  💬 {r.visitor_whatsapp}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
