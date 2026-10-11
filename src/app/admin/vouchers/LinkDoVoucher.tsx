"use client";

import { useState } from "react";

/**
 * Link de um voucher só. Quem abre cai direto no voucher, e a capinha do
 * link no WhatsApp e no Instagram é o próprio card dele.
 */
export function LinkDoVoucher({ url, titulo }: { url: string; titulo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* sem clipboard */ }
  }

  async function compartilhar() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await navigator.share({ title: titulo, url }); return; } catch { /* cancelou */ }
    }
    copiar();
  }

  return (
    <div className="mt-4 rounded-2xl bg-surface-soft p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Link só deste voucher</p>
      <p className="mt-1 break-all text-[12.5px] text-text-secondary">{url}</p>
      <p className="mt-1 text-[12px] leading-snug text-text-tertiary">Quem toca cai direto neste voucher, e a capinha do link é o card dele.</p>
      <div className="mt-2.5 flex gap-2">
        <button type="button" onClick={copiar} className="min-h-[44px] flex-1 rounded-full bg-on-background px-4 text-[13.5px] font-semibold text-white active:scale-[0.98]">
          {copiado ? "Copiado ✓" : "Copiar link"}
        </button>
        <button type="button" onClick={compartilhar} className="min-h-[44px] flex-1 rounded-full border border-divider px-4 text-[13.5px] font-medium active:scale-[0.98]">
          Compartilhar
        </button>
      </div>
    </div>
  );
}
