"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDialogs } from "@/hooks/useDialogs";
import { whatsappLink } from "@/lib/track";
import { QRScanner } from "@/components/mobile/QRScanner";
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

export function VoucherDetailPanel({ voucher, initialRedemptions }: { voucher: Voucher; initialRedemptions: Redemption[] }) {
  const supabase = createClient();
  const router = { push: (href: string) => { window.location.href = href; } };
  const { confirm, DialogRenderer } = useDialogs();
  const [v, setV] = useState(voucher);
  const [redemptions, setRedemptions] = useState(initialRedemptions);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | "redeemed" | "claimed">("todos");

  // Resgate rápido no balcão — validado pro negócio inteiro (o código pode
  // ser de qualquer cupom), mas mora aqui pra ficar tudo num lugar só.
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [scanning, setScanning] = useState(false);

  async function handleRedeem(e: FormEvent) {
    e.preventDefault();
    await redeemCode(code);
  }

  // Lido do QR do cliente ou digitado — mesma validação nos dois casos.
  async function redeemCode(raw: string) {
    const value = raw.trim();
    if (!value || redeeming) return;
    setRedeeming(true);
    setRedeemResult(null);
    try {
      const res = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: v.business_id, code: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemResult({ ok: false, message: data.error ?? "Código inválido." });
      } else {
        setRedeemResult({ ok: true, message: `✓ Confirmado: ${data.voucher?.title ?? "cupom"} (${discountLabel(data.voucher)})` });
        setCode("");
        // Atualiza esse cupom e a lista de resgates, caso o código fosse dele.
        const [{ data: freshVoucher }, { data: freshRedemptions }] = await Promise.all([
          supabase.from("vouchers").select("*").eq("id", v.id).single(),
          supabase.from("voucher_redemptions").select("*").eq("voucher_id", v.id).order("created_at", { ascending: false }),
        ]);
        if (freshVoucher) setV(freshVoucher as Voucher);
        if (freshRedemptions) setRedemptions(freshRedemptions as Redemption[]);
      }
    } finally {
      setRedeeming(false);
    }
  }

  const restam = v.quantity_total - v.quantity_claimed;
  const pct = v.quantity_total > 0 ? Math.min(100, Math.round((v.quantity_claimed / v.quantity_total) * 100)) : 0;
  const confirmados = redemptions.filter((r) => r.status === "redeemed").length;
  const aguardando = redemptions.filter((r) => r.status === "claimed").length;

  const filtered = useMemo(() => {
    return redemptions.filter((r) => {
      if (filter !== "todos" && r.status !== filter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (r.visitor_name ?? "").toLowerCase().includes(q) || (r.visitor_whatsapp ?? "").toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
    });
  }, [redemptions, query, filter]);

  async function toggleActive() {
    const { data } = await supabase.from("vouchers").update({ is_active: !v.is_active }).eq("id", v.id).select().single();
    if (data) setV(data as Voucher);
  }

  async function deleteVoucher() {
    if (!(await confirm({ title: "Excluir cupom", message: `Excluir "${v.title}"? Códigos já resgatados continuam válidos até você excluir também os resgates — mas ninguém mais vai conseguir gerar um novo.`, confirmLabel: "Excluir", danger: true }))) return;
    await supabase.from("vouchers").delete().eq("id", v.id);
    router.push("/admin/vouchers");
  }

  return (
    <div className="flex flex-col pb-4">
      <DialogRenderer />
      <Link href="/admin/vouchers" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Todos os cupons</Link>

      {/* Cabeçalho — mesmo vermelho vivo com brilho da oferta real */}
      <div className="relative mt-4">
        <div aria-hidden className="absolute inset-0 -z-10 rounded-[28px] bg-[#FF3B6E] opacity-30 blur-2xl" />
        <div className="rounded-[28px] bg-gradient-to-br from-[#FF6A4D] to-[#FF2E7E] p-6 text-white shadow-[0_14px_38px_rgba(255,46,126,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-85">🎟️ Painel do cupom</p>
              <p className="mt-1.5 font-[family-name:var(--font-manrope)] text-[24px] font-bold leading-tight">{v.title}</p>
              <p className="mt-0.5 text-[15px] opacity-90">{discountLabel(v)}</p>
            </div>
            <button
              onClick={toggleActive}
              className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-semibold backdrop-blur-sm"
            >
              <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${v.is_active ? "bg-white" : "bg-white/50"}`} />
              {v.is_active ? "Ativo" : "Pausado"}
            </button>
          </div>
          {v.description?.trim() && (
            <p className="mt-3 rounded-2xl bg-white/15 px-3.5 py-2.5 text-[13px] leading-relaxed opacity-95">{v.description}</p>
          )}
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] opacity-85">{pct}% do estoque já saiu</p>
          </div>
        </div>
      </div>

      {/* Estatísticas — coloridas, cada uma com seu próprio tom */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[20px] p-4" style={{ backgroundColor: "#E7EAFC" }}>
          <p className="text-[26px] font-bold" style={{ color: "#4453D6" }}>{v.quantity_claimed}</p>
          <p className="mt-0.5 text-[12.5px] font-medium" style={{ color: "#4453D6" }}>de {v.quantity_total} resgatados</p>
        </div>
        <div className="rounded-[20px] p-4" style={{ backgroundColor: "#DEF3E3" }}>
          <p className="text-[26px] font-bold" style={{ color: "#1F9E4C" }}>{restam}</p>
          <p className="mt-0.5 text-[12.5px] font-medium" style={{ color: "#1F9E4C" }}>ainda restantes</p>
        </div>
        <div className="rounded-[20px] p-4" style={{ backgroundColor: "#FDEEDF" }}>
          <p className="text-[26px] font-bold" style={{ color: "#C2650A" }}>{aguardando}</p>
          <p className="mt-0.5 text-[12.5px] font-medium" style={{ color: "#C2650A" }}>aguardando confirmar</p>
        </div>
        <div className="rounded-[20px] p-4" style={{ backgroundColor: "#E7EAFC" }}>
          <p className="text-[26px] font-bold" style={{ color: "#1F9E4C" }}>{confirmados}</p>
          <p className="mt-0.5 text-[12.5px] font-medium" style={{ color: "#1F9E4C" }}>já confirmados</p>
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-text-tertiary">
        {v.expires_hours ? `Cada código expira em ${v.expires_hours}h se não for usado.` : "Códigos não têm validade."}
      </p>

      {/* Resgate rápido no balcão — fica aqui, dentro do painel de controle,
          pra ficar tudo num lugar só na hora do atendimento. */}
      <div className="mt-6 rounded-[24px] border border-divider bg-surface-white p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[16px]">🔎</span>
          <p className="text-[15px] font-semibold">Resgatar código</p>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-text-secondary">
          Cliente chegou com o cupom? Digite o código abaixo e confirme — o sistema valida na hora e marca como usado.
        </p>
        <form onSubmit={handleRedeem} className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setRedeemResult(null); }}
            placeholder="EX: A1B2C3"
            className="flex-1 rounded-2xl border-2 border-divider bg-surface-white px-4 py-3.5 text-center text-[19px] font-semibold uppercase tracking-[3px] outline-none focus:border-on-background"
          />
          <button
            type="submit"
            disabled={redeeming || !code.trim()}
            className="shrink-0 rounded-2xl bg-button-primary px-5 py-3.5 text-[14px] font-semibold text-white disabled:opacity-40"
          >
            {redeeming ? "…" : "Confirmar"}
          </button>
        </form>
        <div className="mt-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-divider" />
          <span className="text-[12px] text-text-tertiary">ou</span>
          <span className="h-px flex-1 bg-divider" />
        </div>
        <button
          type="button"
          onClick={() => { setRedeemResult(null); setScanning(true); }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#FFC9D6] bg-[#FFF1F4] py-3.5 text-[14px] font-semibold text-[#E0395F]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" /></svg>
          Escanear QR do cliente
        </button>
        {scanning && (
          <QRScanner
            onClose={() => setScanning(false)}
            onDetect={(text) => { setScanning(false); setCode(text.toUpperCase()); redeemCode(text); }}
          />
        )}
        {redeemResult && (
          <div className={`mt-3 rounded-2xl px-4 py-3 text-[13.5px] font-medium leading-relaxed ${redeemResult.ok ? "bg-[#DEF3E3] text-[#1F9E4C]" : "bg-red-50 text-red-600"}`}>
            {redeemResult.message}
          </div>
        )}
      </div>

      {/* Lista de quem resgatou — o painel de verdade */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[15px] font-semibold">Quem resgatou</p>
        <span className="text-[13px] text-text-tertiary">{redemptions.length} {redemptions.length === 1 ? "pessoa" : "pessoas"}</span>
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
                onClick={() => setFilter(f.v)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${filter === f.v ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
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
            <p className="mt-1 text-[13px] text-text-tertiary">Assim que alguém pegar esse cupom na sua página, aparece aqui com nome e WhatsApp.</p>
          </div>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="rounded-[20px] border border-divider bg-surface-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold">{r.visitor_name || "Sem nome"}</p>
                <p className="mt-0.5 text-[13px] text-text-tertiary">Código {r.code} · {formatDate(r.created_at)}</p>
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
        ))}
      </div>

      <button onClick={deleteVoucher} className="mt-8 text-[13px] font-medium text-red-600">
        Excluir este cupom
      </button>
    </div>
  );
}
