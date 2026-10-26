"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { whatsappLink } from "@/lib/track";
import { RedeemCodeCard } from "../RedeemCodeCard";
import { LinkDoVoucher } from "../LinkDoVoucher";
import { voucherTheme, voucherGradient } from "@/lib/voucherThemes";
import type { Database } from "@/lib/supabase/types";
import { descontoCurto } from "@/lib/voucherDesconto";

type Voucher = Database["public"]["Tables"]["vouchers"]["Row"];
type Redemption = Database["public"]["Tables"]["voucher_redemptions"]["Row"];

function discountLabel(v: Pick<Voucher, "discount_type" | "discount_value">) {
  return descontoCurto(v);
}

function statusLabel(status: string) {
  if (status === "redeemed") return "Já usou";
  if (status === "expired") return "Expirado";
  return "Não usou ainda";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function VouchersOverviewPanel({ businessId, initialVouchers, initialRedemptions, linkBase }: { businessId: string; initialVouchers: Voucher[]; initialRedemptions: Redemption[]; linkBase: string | null }) {
  const supabase = createClient();
  const [vouchers, setVouchers] = useState(initialVouchers);
  const [redemptions, setRedemptions] = useState(initialRedemptions);
  const [voucherFilter, setVoucherFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | "claimed" | "redeemed">("todos");
  const [query, setQuery] = useState("");
  const [linkAberto, setLinkAberto] = useState<string | null>(null);


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

  async function toggleActive(v: Voucher) {
    const { data } = await supabase.from("vouchers").update({ is_active: !v.is_active }).eq("id", v.id).select().single();
    if (data) setVouchers((p) => p.map((x) => (x.id === v.id ? (data as Voucher) : x)));
  }

  const porVoucher = useMemo(() => {
    const m = new Map<string, { total: number; aguardando: number; usaram: number }>();
    for (const r of redemptions) {
      const x = m.get(r.voucher_id) ?? { total: 0, aguardando: 0, usaram: 0 };
      x.total++;
      if (r.status === "redeemed") x.usaram++;
      else if (r.status === "claimed") x.aguardando++;
      m.set(r.voucher_id, x);
    }
    return m;
  }, [redemptions]);
  const varios = vouchers.length > 1;

  // Vindo do cartão "Resgates" da página inicial (#resgates): já leva até a lista de quem pegou.
  useEffect(() => {
    if (window.location.hash !== "#resgates") return;
    const t = setTimeout(() => {
      const el = document.getElementById("resgates");
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.animate([{ boxShadow: "0 0 0 0 rgba(17,19,24,0)" }, { boxShadow: "0 0 0 6px rgba(17,19,24,.16)" }, { boxShadow: "0 0 0 0 rgba(17,19,24,0)" }], { duration: 1800, delay: 400, easing: "ease-in-out" });
      }
    }, 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col pb-4">
      <Link href="/admin/vouchers" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Vouchers</Link>

      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.02em]">Painel de vouchers</h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        {ativos} {ativos === 1 ? "voucher ativo" : "vouchers ativos"} · {totalResgatados} {totalResgatados === 1 ? "voucher pego" : "vouchers pegos"} no total
      </p>

      {/* 1. O que se faz todo dia: validar o código do cliente no balcão */}
      <div className="mt-4">
        <RedeemCodeCard
          businessId={businessId}
          onRedeemed={refresh}
          vouchers={vouchers.map((v) => ({ id: v.id, title: v.title }))}
          resgates={redemptions.map((r) => ({ code: r.code, voucher_id: r.voucher_id, visitor_name: r.visitor_name, status: r.status }))}
        />
      </div>

      {/* 2. Números por voucher: cada linha diz de qual voucher são os números */}
      <div className="mt-7 flex items-baseline justify-between">
        <p className="text-[15px] font-semibold">Seus vouchers</p>
        {varios && <p className="text-[12.5px] text-text-tertiary">Toque num voucher para ver só os resgates dele</p>}
      </div>

      {varios && (
        <div className="mt-2.5 flex items-stretch rounded-[20px] bg-surface-white py-3.5 ring-1 ring-black/[0.06]">
          {[
            { n: totalResgatados, t: "pegaram" },
            { n: totalAguardando, t: "ainda não usaram" },
            { n: totalConfirmados, t: "já usaram" },
          ].map((k, i) => (
            <div key={k.t} className={`flex-1 text-center ${i > 0 ? "border-l border-divider" : ""}`}>
              <p className="font-[family-name:var(--font-manrope)] text-[24px] font-semibold leading-none tabular-nums">{k.n}</p>
              <p className="mt-1.5 text-[12px] text-text-tertiary">{k.t}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-3">
        {vouchers.map((v) => {
          const e = porVoucher.get(v.id) ?? { total: 0, aguardando: 0, usaram: 0 };
                    const selecionado = voucherFilter === v.id;
          const conv = e.total > 0 ? Math.round((e.usaram / e.total) * 100) : 0;
          return (
            <div key={v.id} className={`overflow-hidden rounded-[22px] bg-surface-white ring-1 transition-shadow ${selecionado ? "ring-2 ring-on-background" : "ring-black/[0.06]"}`}>
              <button type="button" onClick={() => setVoucherFilter(selecionado ? "todos" : v.id)} className="flex w-full items-center gap-3 p-3.5 text-left">
                {v.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold uppercase text-white" style={{ background: voucherGradient(v.color) }}>
                    {v.discount_type === "gift" ? "Brinde" : discountLabel(v).split(" ")[0]}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold">{v.title}</span>
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-text-tertiary">{discountLabel(v)} · {v.quantity_total - v.quantity_claimed} de {v.quantity_total} restantes</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${v.is_active ? "bg-[#DEF3E3] text-[#1F9E4C]" : "bg-surface-soft text-text-tertiary"}`}>{v.is_active ? "Ativo" : "Pausado"}</span>
              </button>

              <div className="px-4 pb-4">
                {e.total === 0 ? (
                  <p className="rounded-2xl bg-surface-soft px-3.5 py-2.5 text-[13px] text-text-secondary">Ninguém pegou este voucher ainda.</p>
                ) : (
                  <>
                    <div className="flex items-stretch rounded-2xl bg-surface-soft py-2.5">
                      {[
                        { n: e.total, t: "pegaram" },
                        { n: e.aguardando, t: "a usar" },
                        { n: e.usaram, t: "usaram" },
                      ].map((k, i) => (
                        <div key={k.t} className={`flex-1 text-center ${i > 0 ? "border-l border-divider" : ""}`}>
                          <p className="font-[family-name:var(--font-manrope)] text-[20px] font-semibold leading-none tabular-nums">{k.n}</p>
                          <p className="mt-1 text-[11.5px] text-text-tertiary">{k.t}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-soft" aria-hidden>
                      <div className="h-full rounded-full bg-on-background" style={{ width: `${conv}%` }} />
                    </div>
                    <p className="mt-1.5 text-[12px] text-text-tertiary">{conv}% de quem pegou já usou</p>
                  </>
                )}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {linkBase && v.is_active ? (
                    <button type="button" onClick={() => setLinkAberto(linkAberto === v.id ? null : v.id)} className="min-h-[44px] rounded-full bg-surface-soft text-[13px] font-medium active:scale-[0.98]">
                      {linkAberto === v.id ? "Fechar" : "Link"}
                    </button>
                  ) : <span aria-hidden />}
                  <button type="button" onClick={() => toggleActive(v)} className="min-h-[44px] rounded-full bg-surface-soft text-[13px] font-medium active:scale-[0.98]">{v.is_active ? "Pausar" : "Ativar"}</button>
                  <Link href={`/admin/vouchers/${v.id}`} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-on-background text-[13px] font-medium text-white active:scale-[0.98]">Abrir</Link>
                </div>
                {linkAberto === v.id && linkBase && <LinkDoVoucher url={`${linkBase}?v=${v.id}`} titulo={v.title} />}
              </div>
            </div>
          );
        })}
        {vouchers.length === 0 && <p className="text-[13px] text-text-tertiary">Nenhum voucher criado ainda.</p>}
      </div>

      {/* 3. Quem resgatou, cada resgate com o voucher identificado */}
      <div id="resgates" className="mt-8 scroll-mt-24 rounded-2xl">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold">Quem pegou seus vouchers</p>
          <span className="text-[13px] text-text-tertiary">{filtered.length}</span>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-text-secondary">
          Cada pessoa que tocou em um voucher na sua página aparece aqui, com o código dela. Quando ela chegar até você, use Confirmar código lá em cima.
        </p>
      </div>

      {varios && (
        <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
          <button type="button" onClick={() => setVoucherFilter("todos")} className={`shrink-0 min-h-[40px] rounded-full px-4 text-[13px] font-medium ${voucherFilter === "todos" ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>Todos os vouchers</button>
          {vouchers.map((v) => (
            <button key={v.id} type="button" onClick={() => setVoucherFilter(v.id)} className={`shrink-0 min-h-[40px] max-w-[200px] truncate rounded-full px-4 text-[13px] font-medium ${voucherFilter === v.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{v.title}</button>
          ))}
        </div>
      )}

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
              { v: "claimed", t: "Não usaram" },
              { v: "redeemed", t: "Já usaram" },
            ] as const).map((f) => (
              <button
                key={f.v}
                onClick={() => setStatusFilter(f.v)}
                className={`min-h-[40px] rounded-full px-4 text-[13px] font-medium ${statusFilter === f.v ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
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
            <p className="mt-1 text-[13px] text-text-tertiary">
              {vouchers.some((v) => v.is_active) && linkBase
                ? "Compartilhe o link de um voucher para ter os primeiros resgates. Toque em Link do voucher no card dele."
                : "Assim que alguém pegar um voucher na sua página, aparece aqui com nome e WhatsApp."}
            </p>
          </div>
        )}
        {filtered.map((r) => {
          const v = voucherById.get(r.voucher_id);
          const tema = voucherTheme(v?.color);
          return (
            <div key={r.id} className="rounded-[20px] border border-divider bg-surface-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-semibold">{r.visitor_name || "Sem nome"}</p>
                  <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-white" style={{ background: tema.via }}>
                    <span className="truncate">{v?.title ?? "Voucher"}</span>
                  </span>
                  <p className="mt-1.5 text-[12.5px] text-text-secondary">código <span className="font-semibold tracking-wide">{r.code}</span> · {formatDate(r.created_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.status === "redeemed" ? "bg-[#DEF3E3] text-[#1F9E4C]" : r.status === "expired" ? "bg-surface-soft text-text-tertiary" : "bg-[#FDEEDF] text-[#C2650A]"}`}>
                  {statusLabel(r.status)}
                </span>
              </div>
              {r.visitor_whatsapp && (
                <a
                  href={whatsappLink(r.visitor_whatsapp, `Olá ${r.visitor_name || ""}! Sobre o voucher ${r.code}...`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#DEF3E3] px-3.5 text-[12.5px] font-medium text-[#1F9E4C]"
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
