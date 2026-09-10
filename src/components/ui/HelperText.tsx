"use client";

import { useState } from "react";

/**
 * Texto de apoio (explicações, instruções) — fica numa linha só, com uma
 * tag preta "Ler mais" do lado pra quem quiser o texto inteiro. Evita
 * blocos de texto miúdo tomando conta da tela em formulários densos.
 */
export function HelperText({ children, className = "" }: { children: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`mt-2 flex items-start gap-2 ${className}`}>
      <p className={`min-w-0 flex-1 text-[14px] leading-relaxed text-text-secondary ${open ? "" : "truncate"}`}>
        {children}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-0.5 shrink-0 rounded-full bg-on-background px-2.5 py-1 text-[11px] font-medium text-white"
      >
        {open ? "Ler menos" : "Ler mais"}
      </button>
    </div>
  );
}
