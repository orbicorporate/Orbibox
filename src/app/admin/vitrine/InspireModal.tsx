"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { contrastFg } from "@/lib/showcase";
import { VITRINE_THEMES } from "@/lib/vitrineThemes";

export function InspireModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [applying, setApplying] = useState<string | null>(null);

  async function usarTema(themeId: string) {
    const tema = VITRINE_THEMES.find((t) => t.id === themeId);
    if (!tema || applying) return;
    setApplying(themeId);
    await supabase.from("businesses").update({ brand_colors: tema.colors }).eq("id", businessId);
    router.refresh();
    setApplying(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-background-main p-6 sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">✦ Inspire-se</p>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          Escolha um estilo que combina com o seu negócio. A Orbi aplica a paleta de cores na hora — dá pra trocar
          depois, item por item, quando quiser.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {VITRINE_THEMES.map((tema) => (
            <div key={tema.id} className="rounded-[24px] border border-divider bg-surface-white p-4">
              <div className="flex gap-2">
                {tema.colors.slice(0, 2).map((c, i) => (
                  <div
                    key={i}
                    className="flex h-16 flex-1 items-center justify-center rounded-2xl px-2 text-center"
                    style={{ backgroundColor: c.hex }}
                  >
                    <span className="font-[family-name:var(--font-open-sans)] text-[13px] font-bold leading-tight" style={{ color: contrastFg(c.hex) }}>
                      Item
                    </span>
                  </div>
                ))}
                <div className="flex flex-col gap-2">
                  {tema.colors.slice(2, 4).map((c, i) => (
                    <div key={i} className="h-[30px] w-[30px] shrink-0 rounded-full border border-divider" style={{ backgroundColor: c.hex }} />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-[15px] font-medium">{tema.name}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{tema.description}</p>
              <button
                onClick={() => usarTema(tema.id)}
                disabled={applying !== null}
                className="mt-3 w-full rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
              >
                {applying === tema.id ? "Aplicando…" : "Usar esse estilo"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
