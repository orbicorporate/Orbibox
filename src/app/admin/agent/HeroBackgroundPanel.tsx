"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { HERO_STYLES, heroBackground, heroPrecisaVeu } from "@/lib/heroStyle";
import { ColorChip, ColorPickerSheet, DEFAULT_HERO, DEFAULT_ORBI } from "@/app/admin/config/colorPieces";

type PickerKey = "hero1" | "hero2";

/**
 * Fundo da tela inicial da página pública. Fica logo abaixo das cores da
 * Orbi porque a esfera aparece em cima dele: na prática a pessoa escolhe
 * os dois juntos, olhando se combinam.
 */
export function HeroBackgroundPanel({
  businessId,
  orbiColors: orbiColorsProp,
  initialHeroGradient,
  initialHeroStyle,
}: {
  businessId: string;
  orbiColors: string[] | null;
  initialHeroGradient: string[] | null;
  initialHeroStyle?: string | null;
}) {
  const supabase = createClient();
  const orbiColors = orbiColorsProp && orbiColorsProp.length >= 2 ? orbiColorsProp : DEFAULT_ORBI;
  const [heroGradient, setHeroGradient] = useState<string[]>(
    initialHeroGradient && initialHeroGradient.length >= 2 ? initialHeroGradient : DEFAULT_HERO
  );
  const [heroStyle, setHeroStyle] = useState<string>(initialHeroStyle || "brilho");
  const [openPicker, setOpenPicker] = useState<PickerKey | null>(null);
  const [aberto, setAberto] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#fundo-pagina",
  );

  async function pickHeroStyle(style: string) {
    setHeroStyle(style);
    await supabase.from("businesses").update({ hero_style: style }).eq("id", businessId);
  }

  async function pickHeroColor(slot: 0 | 1, hex: string) {
    const next = [...heroGradient];
    next[slot] = hex;
    setHeroGradient(next);
    await supabase.from("businesses").update({ hero_gradient: next }).eq("id", businessId);
  }

  const previaCelular = (
    <span className="relative flex h-48 w-28 flex-col items-center overflow-hidden rounded-2xl border-4 border-[#1a1a1a] pt-5" style={{ background: heroBackground(heroStyle, heroGradient[0], heroGradient[1]) }}>
      {heroPrecisaVeu(heroStyle) && <span className="absolute inset-0" style={{ background: "rgba(247,247,244,0.18)" }} />}
      <OrbiParticleSphere key={orbiColors.join("-")} size={56} colors={orbiColors} className="relative rounded-full" />
    </span>
  );

  return (
    <div id="fundo-pagina" className="scroll-mt-6 rounded-[24px] border border-divider bg-surface-white">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-4 p-5 text-left"
      >
        <span
          className="h-14 w-10 shrink-0 rounded-xl border border-divider"
          style={{ background: heroBackground(heroStyle, heroGradient[0], heroGradient[1]) }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Fundo da tela inicial</span>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-text-secondary">
            A primeira tela que o visitante vê ao abrir sua página.
          </span>
        </span>
        <span className={`shrink-0 text-text-tertiary transition-transform ${aberto ? "rotate-90" : ""}`}>→</span>
      </button>

      {aberto && (
        <div className="border-t border-divider px-5 pb-5 pt-4">
          {/* Prévia no formato real (celular em pé), com a Orbi onde ela fica. */}
          <div className="flex justify-center">
            <div className="relative h-64 w-40 overflow-hidden rounded-[26px] border-4 border-[#1a1a1a] shadow-lg" style={{ background: heroBackground(heroStyle, heroGradient[0], heroGradient[1]) }}>
              {heroPrecisaVeu(heroStyle) && <span className="absolute inset-0" style={{ background: "rgba(247,247,244,0.18)" }} />}
              <div className="relative flex h-full flex-col items-center pt-8">
                <OrbiParticleSphere key={orbiColors.join("-")} size={72} colors={orbiColors} className="rounded-full" />
                <span className="mt-2 text-[10px] font-medium text-on-background/70">Prévia da tela real</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {HERO_STYLES.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => pickHeroStyle(e.id)}
                className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 p-2 transition-colors ${heroStyle === e.id ? "border-on-background" : "border-transparent bg-surface-soft"}`}
              >
                <span className="h-9 w-full overflow-hidden rounded-lg" style={{ background: heroBackground(e.id, heroGradient[0], heroGradient[1]) }} />
                <span className="mt-1.5 text-[11px] font-medium leading-tight">{e.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-stretch gap-2.5">
            <ColorChip label="Cor 1" hex={heroGradient[0]} onOpen={() => setOpenPicker("hero1")} />
            <ColorChip label="Cor 2" hex={heroGradient[1]} onOpen={() => setOpenPicker("hero2")} />
          </div>
        </div>
      )}

      {openPicker && (
        <ColorPickerSheet
          current={openPicker === "hero1" ? heroGradient[0] : heroGradient[1]}
          onSelect={(hex) => pickHeroColor(openPicker === "hero1" ? 0 : 1, hex)}
          onClose={() => setOpenPicker(null)}
          preview={previaCelular}
        />
      )}
    </div>
  );
}
