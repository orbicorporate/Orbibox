"use client";

import { useState, type ReactNode } from "react";

export function VoucherExplainer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="orbi-gradient flex w-full items-center justify-between gap-3 rounded-[24px] p-5 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-background/10 text-[16px]">✦</span>
          <span className="text-[15px] font-semibold leading-snug text-on-background">
            {open ? "Esconder explicação" : "Clique pra entender como gerar seus vouchers"}
          </span>
        </span>
        <span className="shrink-0 text-[14px] text-on-background/60">{open ? "▲" : "▼"}</span>
      </button>

      {open && <div className="mt-4 flex flex-col gap-4">{children}</div>}
    </div>
  );
}
