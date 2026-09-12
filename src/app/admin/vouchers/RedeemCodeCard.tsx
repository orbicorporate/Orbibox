"use client";

import { useState, type FormEvent } from "react";
import { QRScanner } from "@/components/mobile/QRScanner";
import { CHERRY_GRADIENT, CHERRY_SHADOW, CHERRY_TEXT, CHERRY_SOFT_BG } from "@/lib/voucherThemes";

function discountLabel(v: { discount_type?: string; discount_value?: number }) {
  return v.discount_type === "percent" ? `${v.discount_value}% off` : `R$ ${v.discount_value} off`;
}

/** Card "Resgatar código" no design da referência. Usado no topo da tela de
 * Cupons (recolhível) e dentro dos painéis. Valida qualquer cupom ativo do
 * negócio, por texto digitado ou pelo QR escaneado. Quando recebe a lista
 * de cupons, mostra um seletor pra deixar explícito qual está sendo
 * resgatado (e recusa código de outro cupom). */
export function RedeemCodeCard({
  businessId,
  collapsible = false,
  onRedeemed,
  vouchers,
  fixedVoucherId,
  fixedVoucherTitle,
}: {
  businessId: string;
  collapsible?: boolean;
  onRedeemed?: () => void;
  vouchers?: { id: string; title: string }[];
  fixedVoucherId?: string;
  fixedVoucherTitle?: string;
}) {
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [open, setOpen] = useState(!collapsible);
  // Cupom escolhido no seletor. "todos" = valida qualquer um. Quando o card
  // é de um cupom fixo (painel individual), sempre trava nele.
  const [selected, setSelected] = useState<string>(fixedVoucherId ?? "todos");
  const activeVoucherId = fixedVoucherId ?? (selected === "todos" ? undefined : selected);
  const selectedTitle = fixedVoucherTitle ?? vouchers?.find((v) => v.id === selected)?.title;

  async function redeemCode(raw: string) {
    const value = raw.trim();
    if (!value || redeeming) return;
    setRedeeming(true);
    setResult(null);
    try {
      const res = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, code: value, expectedVoucherId: activeVoucherId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? "Código inválido." });
      } else {
        setResult({ ok: true, message: `Confirmado: ${data.voucher?.title ?? "cupom"} (${discountLabel(data.voucher ?? {})})` });
        setCode("");
        onRedeemed?.();
      }
    } finally {
      setRedeeming(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    redeemCode(code);
  }

  return (
    <div className="rounded-[26px] bg-surface-white p-5 shadow-[0_8px_30px_rgba(17,19,24,0.06)]">
      <button
        onClick={() => collapsible && setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 text-left ${collapsible ? "" : "cursor-default"}`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: CHERRY_SOFT_BG }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CHERRY_TEXT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8z" />
            <circle cx="7.5" cy="7.5" r="1.2" fill={CHERRY_TEXT} stroke="none" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold">Resgatar código</span>
          {(!collapsible || open) ? (
            <span className="mt-0.5 block text-[13px] leading-snug text-text-secondary">Cliente chegou com o cupom? Digite ou escaneie pra validar.</span>
          ) : (
            <span className="mt-0.5 block text-[13px] leading-snug text-text-tertiary">Toque pra validar um cupom na hora.</span>
          )}
        </span>
        {collapsible && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft transition-transform ${open ? "rotate-180" : ""}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Cupom fixo (painel individual) — deixa explícito qual está sendo resgatado */}
          {fixedVoucherId && selectedTitle && (
            <p className="mt-4 rounded-2xl px-3.5 py-2.5 text-[13px] font-medium" style={{ backgroundColor: CHERRY_SOFT_BG, color: CHERRY_TEXT }}>
              Validando o cupom: {selectedTitle}
            </p>
          )}

          {/* Seletor de cupom — deixa explícito qual cupom está sendo
              resgatado. Só aparece quando há mais de um e o card não é de
              um cupom fixo. */}
          {!fixedVoucherId && vouchers && vouchers.length > 1 && (
            <div className="mt-4">
              <p className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Qual cupom?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelected("todos"); setResult(null); }}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${selected === "todos" ? "text-white" : "bg-surface-soft text-text-secondary"}`}
                  style={selected === "todos" ? { backgroundImage: CHERRY_GRADIENT } : undefined}
                >
                  Qualquer um
                </button>
                {vouchers.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelected(v.id); setResult(null); }}
                    className={`max-w-full truncate rounded-full px-3.5 py-2 text-[13px] font-medium ${selected === v.id ? "text-white" : "bg-surface-soft text-text-secondary"}`}
                    style={selected === v.id ? { backgroundImage: CHERRY_GRADIENT } : undefined}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
              {selectedTitle && (
                <p className="mt-2.5 rounded-2xl px-3.5 py-2.5 text-[13px] font-medium" style={{ backgroundColor: CHERRY_SOFT_BG, color: CHERRY_TEXT }}>
                  Validando o cupom: {selectedTitle}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4">
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setResult(null); }}
              placeholder="EX: A1B2C3"
              className="w-full rounded-2xl border-2 px-4 py-3.5 text-center text-[19px] font-semibold uppercase tracking-[4px] outline-none transition-colors focus:border-[color:var(--cherry)]"
              style={{ borderColor: code ? CHERRY_TEXT : "#E3D4D8", ["--cherry" as string]: CHERRY_TEXT }}
            />
            <button
              type="submit"
              disabled={redeeming || !code.trim()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-bold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundImage: CHERRY_GRADIENT, boxShadow: CHERRY_SHADOW }}
            >
              {redeeming ? "Validando…" : <>Confirmar <span aria-hidden>→</span></>}
            </button>
          </form>

          {result && (
            <div className={`mt-3 rounded-2xl px-4 py-3 text-[13.5px] font-medium leading-relaxed ${result.ok ? "bg-[#DEF3E3] text-[#1F9E4C]" : "bg-red-50 text-red-600"}`}>
              {result.ok ? "✓ " : ""}{result.message}
            </div>
          )}

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-divider" />
            <span className="text-[12px] text-text-tertiary">ou</span>
            <span className="h-px flex-1 bg-divider" />
          </div>

          <button
            onClick={() => { setResult(null); setScanning(true); }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold"
            style={{ backgroundColor: CHERRY_SOFT_BG, color: CHERRY_TEXT }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" /></svg>
            Escanear QR do cliente
          </button>

          <div className="mt-4 flex items-center gap-2 border-t border-divider pt-3.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9AA0AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /></svg>
            <span className="text-[12.5px] text-text-tertiary">
              {activeVoucherId ? "Só aceita código deste cupom." : "Válido para qualquer cupom ativo da sua loja."}
            </span>
          </div>
        </>
      )}

      {scanning && (
        <QRScanner
          onClose={() => setScanning(false)}
          onDetect={(text) => { setScanning(false); setCode(text.toUpperCase()); redeemCode(text); }}
        />
      )}
    </div>
  );
}
