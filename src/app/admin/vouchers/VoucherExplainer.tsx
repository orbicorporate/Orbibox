"use client";

import { useState, type ReactNode } from "react";

export function VoucherExplainer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex w-full items-center gap-3.5 overflow-hidden rounded-[24px] bg-gradient-to-r from-[#D9F99D] via-[#A7F3D0] to-[#99F6E4] p-4 text-left shadow-[0_10px_30px_rgba(16,185,129,0.22)]"
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_50%)]" />
        <span aria-hidden className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-48 rounded-full bg-white/30 blur-2xl" />
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/60 text-[#15803D]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 21h4" />
            <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
            <path d="M12 1v1M4.2 4.2l.7.7M19.8 4.2l-.7.7M2 11h1M21 11h1" />
          </svg>
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[16.5px] font-bold leading-tight text-on-background">Entenda como gerar seus vouchers</span>
          <span className="mt-1 block text-[13px] leading-snug text-on-background/70">Veja o passo a passo e aproveite todo o potencial dos cupons.</span>
        </span>
        <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/60 text-on-background transition-transform ${open ? "rotate-180" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>

      {open && <div className="mt-4 flex flex-col gap-4">{children}</div>}
    </div>
  );
}
