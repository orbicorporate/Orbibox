"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";

export function ResumoEmailToggle({ businessId, inicial }: { businessId: string; inicial: boolean }) {
  const [ligado, setLigado] = useState(inicial);
  async function alternar() {
    const v = !ligado;
    setLigado(v);
    const res = await createClient().from("businesses").update({ resumo_semanal: v }).eq("id", businessId);
    if (!conferirSalvo(res)) setLigado(!v);
  }
  return (
    <button type="button" onClick={alternar} role="switch" aria-checked={ligado} className="mt-4 flex w-full items-center justify-between gap-3 text-left">
      <span className="text-[13px] text-text-secondary">Receber este resumo por e-mail toda segunda</span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${ligado ? "bg-on-background" : "bg-divider"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${ligado ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
