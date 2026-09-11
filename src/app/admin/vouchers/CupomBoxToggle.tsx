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
      <div className="flex items-center gap-3 rounded-[24px] border border-divider bg-surface-white p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orbi-gradient-start/25 text-[16px]">✓</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">O box &quot;Cupons&quot; já está na sua página inicial</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-text-tertiary">É por ele que o visitante encontra seus cupons.</p>
        </div>
        <Link href="/admin/boxes" className="shrink-0 text-[13px] font-medium text-text-secondary underline">
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
