"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VITRINE_THEMES } from "@/lib/vitrineThemes";

export function InspireModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [applying, setApplying] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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
        className="max-h-[88vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-background-main p-6 sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">✦ Inspire-se</p>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
          Vitrines de exemplo, com fotos reais, pra você ver o potencial. As fotos aqui são só ilustração — ao
          escolher um estilo, a Orbi aplica a paleta de cores na sua conta.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {VITRINE_THEMES.map((tema) => {
            const open = openId === tema.id;
            return (
              <div key={tema.id} className="overflow-hidden rounded-[24px] border border-divider bg-surface-white">
                <button onClick={() => setOpenId(open ? null : tema.id)} className="flex w-full items-center gap-3 p-4 text-left">
                  <div className="flex shrink-0 gap-1">
                    {tema.colors.slice(0, 3).map((c, i) => (
                      <span key={i} className="h-6 w-6 rounded-full border border-divider" style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{tema.name}</p>
                    <p className="text-[12px] text-text-tertiary">{tema.vibe}</p>
                  </div>
                  <span className="text-text-tertiary">{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className="border-t border-divider p-4">
                    <p className="text-[11px] uppercase tracking-wide text-text-tertiary">
                      Exemplo · {tema.exampleBusiness}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{tema.description}</p>

                    <div className="mt-3 flex gap-2.5">
                      {tema.items.map((item, i) => (
                        <div key={i} className="flex-1 overflow-hidden rounded-[18px]" style={{ backgroundColor: tema.colors[0].hex }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.photo} alt={item.title} className="aspect-square w-full object-cover" />
                          <div className="p-2.5">
                            <p className="truncate text-[12px] font-medium" style={{ color: tema.colors[1].hex }}>{item.title}</p>
                            <p className="text-[11px]" style={{ color: tema.colors[1].hex, opacity: 0.7 }}>{item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => usarTema(tema.id)}
                      disabled={applying !== null}
                      className="mt-3 w-full rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
                    >
                      {applying === tema.id ? "Aplicando…" : "Usar esse estilo"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
