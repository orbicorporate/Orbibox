"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";

/**
 * Escolha do dono: o estilo da tela inicial para quem chega.
 */
/** Além dos dois modos, a grade tem o estilo Vitrine (guardado como "vitrine"). */
type ModoEscolha = "grade" | "vitrine";

export function HomeModePicker({ businessId, inicial }: { businessId: string; inicial: string | null }) {
  const supabase = createClient();
  const [modo, setModo] = useState<ModoEscolha>(inicial === "vitrine" ? "vitrine" : "grade");
  const [salvo, setSalvo] = useState(false);
  const [aberto, setAberto] = useState(false);

  async function escolher(novo: ModoEscolha) {
    if (novo === modo) return;
    const anterior = modo;
    setModo(novo);
    setSalvo(false);
    const res = await supabase.from("businesses").update({ home_mode: novo }).eq("id", businessId);
    if (!conferirSalvo(res)) {
      setModo(anterior);
      return;
    }
    setSalvo(true);
  }

  const opcoes: { v: ModoEscolha; titulo: string; curto: string; texto: string; desenho: React.ReactNode }[] = [
    {
      v: "grade",
      titulo: "Grade clássica",
      curto: "Tudo em cards", texto: "Todos os botões visíveis de uma vez, em cards.",
      desenho: (
        <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden>
          <rect x="22" y="6" width="36" height="24" rx="6" fill="currentColor" fillOpacity=".3" />
          <rect x="62" y="6" width="36" height="24" rx="6" fill="currentColor" fillOpacity=".3" />
          <rect x="22" y="34" width="76" height="12" rx="5" fill="currentColor" fillOpacity=".55" />
          <rect x="22" y="50" width="76" height="10" rx="5" fill="currentColor" fillOpacity=".2" />
        </svg>
      ),
    },
    {
      v: "vitrine",
      titulo: "Vitrine",
      curto: "Bolinhas e fotos", texto: "Bolinhas no topo, um botão principal e fotos dos seus itens.",
      desenho: (
        <svg viewBox="0 0 120 64" className="h-16 w-full" aria-hidden>
          <circle cx="30" cy="12" r="6" fill="currentColor" fillOpacity=".6" />
          <circle cx="48" cy="12" r="6" fill="currentColor" fillOpacity=".4" />
          <circle cx="66" cy="12" r="6" fill="currentColor" fillOpacity=".4" />
          <circle cx="84" cy="12" r="6" fill="currentColor" fillOpacity=".4" />
          <rect x="24" y="24" width="72" height="9" rx="4.5" fill="currentColor" fillOpacity=".7" />
          <rect x="24" y="38" width="34" height="22" rx="5" fill="currentColor" fillOpacity=".3" />
          <rect x="62" y="38" width="34" height="22" rx="5" fill="currentColor" fillOpacity=".3" />
        </svg>
      ),
    },
  ];

  const atual = opcoes.find((o) => o.v === modo)!;

  return (
    <div className="mt-5 rounded-[20px] bg-surface-soft">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] uppercase tracking-wide text-text-tertiary">Como sua página abre</span>
          <span className="mt-0.5 block text-[15px] font-medium">{atual.titulo}</span>
        </span>
        <span className="text-[13px] text-text-secondary">{aberto ? "Fechar" : "Mudar"}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-text-secondary transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {aberto && (
        <div className="acao-entra px-4 pb-4">
          <div role="radiogroup" aria-label="Modo padrão da tela inicial" className="grid grid-cols-2 gap-2">
            {opcoes.map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={modo === o.v}
                onClick={() => escolher(o.v)}
                className={`flex flex-col items-center rounded-2xl border-2 bg-surface-white px-2 pb-3 pt-2 text-center transition-colors ${modo === o.v ? "border-on-background text-on-background" : "border-transparent text-text-tertiary"}`}
              >
                {o.desenho}
                <span className="mt-1 text-[13px] font-medium leading-tight text-on-background">{o.titulo}</span>
                <span className="mt-0.5 text-[11.5px] leading-tight text-text-secondary">{o.curto}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] leading-snug text-text-secondary">{atual.texto}</p>
          {salvo && <p className="mt-1.5 text-[12px] text-text-tertiary">Salvo. Já vale para quem abrir sua página.</p>}
        </div>
      )}
    </div>
  );
}
