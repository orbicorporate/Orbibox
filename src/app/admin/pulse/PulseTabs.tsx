"use client";

import { useState, type ReactNode } from "react";

export function PulseTabs({ visitantes, marketing }: { visitantes: ReactNode; marketing: ReactNode }) {
  const [aba, setAba] = useState<"visitantes" | "marketing">("visitantes");

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label="Ver" className="mt-5 flex gap-2">
        {([
          { k: "visitantes", rot: "Visitantes" },
          { k: "marketing", rot: "Marketing IA" },
        ] as const).map((t) => (
          <button
            key={t.k}
            type="button"
            role="tab"
            aria-selected={aba === t.k}
            onClick={() => setAba(t.k)}
            className={`cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${aba === t.k ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
          >
            {t.rot}
          </button>
        ))}
      </div>

      <div className="mt-3">{aba === "visitantes" ? visitantes : marketing}</div>
    </div>
  );
}
