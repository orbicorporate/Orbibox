"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ModoHome } from "@/lib/modoHome";

/**
 * Escolha do dono: como a tela inicial abre para quem chega. O visitante
 * continua podendo trocar entre os dois, isto só define o padrão.
 */
export function HomeModePicker({ businessId, inicial }: { businessId: string; inicial: string | null }) {
  const supabase = createClient();
  const [modo, setModo] = useState<ModoHome>(inicial === "orbita" ? "orbita" : "grade");
  const [salvo, setSalvo] = useState(false);

  async function escolher(novo: ModoHome) {
    if (novo === modo) return;
    setModo(novo);
    setSalvo(false);
    await supabase.from("businesses").update({ home_mode: novo }).eq("id", businessId);
    setSalvo(true);
  }

  const opcoes: { v: ModoHome; titulo: string; texto: string; desenho: React.ReactNode }[] = [
    {
      v: "orbita",
      titulo: "Modo Órbita",
      texto: "Seus boxes giram em volta do seu logo, um de cada vez, com transições animadas.",
      desenho: (
        <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden>
          <ellipse cx="60" cy="34" rx="46" ry="14" fill="none" stroke="currentColor" strokeOpacity=".25" strokeDasharray="1.5 4" />
          <circle cx="60" cy="32" r="9" fill="currentColor" fillOpacity=".85" />
          <circle cx="20" cy="36" r="5" fill="currentColor" fillOpacity=".35" />
          <circle cx="100" cy="30" r="5" fill="currentColor" fillOpacity=".35" />
          <circle cx="60" cy="48" r="7" fill="currentColor" fillOpacity=".6" />
          <circle cx="42" cy="22" r="3.5" fill="currentColor" fillOpacity=".2" />
          <circle cx="80" cy="21" r="3.5" fill="currentColor" fillOpacity=".2" />
        </svg>
      ),
    },
    {
      v: "grade",
      titulo: "Modo Box",
      texto: "Todos os boxes visíveis de uma vez, em cards, no tamanho que você escolheu.",
      desenho: (
        <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden>
          <rect x="22" y="6" width="36" height="24" rx="6" fill="currentColor" fillOpacity=".3" />
          <rect x="62" y="6" width="36" height="24" rx="6" fill="currentColor" fillOpacity=".3" />
          <rect x="22" y="34" width="76" height="12" rx="5" fill="currentColor" fillOpacity=".55" />
          <rect x="22" y="50" width="76" height="10" rx="5" fill="currentColor" fillOpacity=".2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mt-5 rounded-[20px] bg-surface-soft p-4">
      <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Como sua página abre</p>
      <p className="mt-1 text-[12px] text-text-secondary">
        Escolha o modo padrão da tela inicial. O visitante vê um seletor no topo e pode trocar quando quiser.
      </p>
      <div role="radiogroup" aria-label="Modo padrão da tela inicial" className="mt-3 grid grid-cols-2 gap-2">
        {opcoes.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={modo === o.v}
            onClick={() => escolher(o.v)}
            className={`flex flex-col items-center rounded-2xl border-2 bg-surface-white px-3 pb-3 pt-2 text-center transition-colors ${modo === o.v ? "border-on-background text-on-background" : "border-transparent text-text-tertiary"}`}
          >
            {o.desenho}
            <span className="mt-1 text-[13px] font-medium text-on-background">{o.titulo}</span>
            <span className="mt-1 text-[11.5px] leading-snug text-text-secondary">{o.texto}</span>
            {modo === o.v && <span className="mt-2 rounded-full bg-on-background px-2.5 py-0.5 text-[10.5px] text-white">Padrão</span>}
          </button>
        ))}
      </div>
      {salvo && <p className="mt-2 text-[11.5px] text-text-tertiary">Salvo. Quem abrir sua página agora vê o {modo === "orbita" ? "Modo Órbita" : "Modo Box"} primeiro.</p>}
    </div>
  );
}
