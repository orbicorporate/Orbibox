"use client";

import { useState, type ReactNode } from "react";

export function PulseTabs({ visitantes, marketing }: { visitantes: ReactNode; marketing: ReactNode }) {
  const [aba, setAba] = useState<"visitantes" | "marketing">("visitantes");

  return (
    <div className="flex flex-col">
      {/* Dois botões grandes lado a lado. Ativo fica preto, o outro vazado. */}
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setAba("marketing")}
          className={`flex items-center justify-center gap-1.5 rounded-full py-3.5 text-[14px] font-semibold transition-colors ${
            aba === "marketing"
              ? "bg-on-background text-white"
              : "border border-divider bg-transparent text-text-secondary"
          }`}
        >
          <span aria-hidden>✦</span> Marketing IA
        </button>
        <button
          onClick={() => setAba("visitantes")}
          className={`flex items-center justify-center gap-1.5 rounded-full py-3.5 text-[14px] font-semibold transition-colors ${
            aba === "visitantes"
              ? "bg-on-background text-white"
              : "border border-divider bg-transparent text-text-secondary"
          }`}
        >
          <span aria-hidden>◑</span> Visitantes
        </button>
      </div>

      <div className="mt-2">{aba === "visitantes" ? visitantes : marketing}</div>
    </div>
  );
}
