"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function CupomBoxToggle({ businessId, initialHasBox, nextPosition }: { businessId: string; initialHasBox: boolean; nextPosition: number }) {
  const supabase = createClient();
  const [hasBox, setHasBox] = useState(initialHasBox);
  const [adding, setAdding] = useState(false);

  async function adicionar() {
    setAdding(true);
    try {
      const { error } = await supabase.from("smart_boxes").insert({
        business_id: businessId,
        box_type: "custom",
        title: "Cupons",
        position: nextPosition,
        is_active: true,
        config: { label: "Cupons", subtitle: "Descontos por tempo limitado", icon: "🎟️", action: "cupom", color: "transparent" },
      });
      if (!error) setHasBox(true);
    } finally {
      setAdding(false);
    }
  }

  if (hasBox) {
    return (
      <div className="flex items-center gap-4 rounded-[24px] border border-[#BBF7D0] bg-surface-white p-5">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <span aria-hidden className="absolute inset-0 rounded-full bg-[#22C55E] opacity-35 blur-md" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4ADE80] to-[#16A34A] text-white shadow-[0_6px_18px_rgba(34,197,94,0.45)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug" style={{ color: "#15803D" }}>O box &quot;Cupons&quot; já está na sua página inicial</p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">É por ele que o visitante encontra seus cupons.</p>
        </div>
        <Link href="/admin/boxes" className="shrink-0 rounded-full border border-[#BBF7D0] bg-white px-4 py-2 text-[14px] font-semibold" style={{ color: "#15803D" }}>
          Editar
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-dashed border-divider p-5 text-center">
      <p className="text-[14px] font-medium">Falta o box na sua página inicial</p>
      <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
        Sem ele, os cupons ficam prontos aqui, mas ninguém vê na sua página. Leva um toque pra adicionar.
      </p>
      <button
        onClick={adicionar}
        disabled={adding}
        className="orbi-gradient mt-4 rounded-full px-5 py-2.5 text-[14px] font-medium text-on-background disabled:opacity-50"
      >
        {adding ? "Adicionando…" : "+ Colocar na página inicial"}
      </button>
    </div>
  );
}
