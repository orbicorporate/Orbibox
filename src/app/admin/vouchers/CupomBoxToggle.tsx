"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function CupomBoxToggle({ businessId, initialHasBox, boxId, nextPosition }: { businessId: string; initialHasBox: boolean; boxId?: string | null; nextPosition: number }) {
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
        config: { label: "Vouchers", subtitle: "Resgate agora e aproveite", icon: "🎟️", action: "cupom", color: "transparent" },
      });
      if (!error) setHasBox(true);
    } finally {
      setAdding(false);
    }
  }

  if (hasBox) {
    // Confirmação discreta: o box já está lá, então isso é status, não
    // algo que precise ocupar meia tela toda vez.
    return (
      <div className="flex items-center gap-2.5 rounded-full border border-[#BBF7D0] bg-surface-white py-2 pl-2.5 pr-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4ADE80] to-[#16A34A] text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: "#15803D" }}>
          Box &quot;Cupons&quot; na sua página
        </p>
        {/* Leva direto pro box certo, já aberto pra editar, em vez de
            largar a pessoa no topo da lista pra procurar. */}
        <Link href={boxId ? `/admin/boxes?box=${boxId}` : "/admin/boxes"} className="shrink-0 rounded-full bg-[#DEF3E3] px-3 py-1.5 text-[12.5px] font-semibold" style={{ color: "#15803D" }}>
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
