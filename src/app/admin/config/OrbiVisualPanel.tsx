"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { ORBI_SPHERE_COLORS } from "@/lib/showcase";

const DEFAULT_ORBI = ["#7FE84A", "#8B2BFF"];
// Mesmas cores que o degradê padrão da tela inicial sempre usou.
const DEFAULT_HERO = ["#B7F34A", "#6EE7D8"];

export function OrbiVisualPanel({
  businessId,
  initialOrbiColors,
  initialHeroGradient,
}: {
  businessId: string;
  initialOrbiColors: string[] | null;
  initialHeroGradient: string[] | null;
}) {
  const supabase = createClient();
  const [orbiColors, setOrbiColors] = useState<string[]>(
    initialOrbiColors && initialOrbiColors.length >= 2 ? initialOrbiColors : DEFAULT_ORBI
  );
  const [heroGradient, setHeroGradient] = useState<string[]>(
    initialHeroGradient && initialHeroGradient.length >= 2 ? initialHeroGradient : DEFAULT_HERO
  );
  const orbiDetail = orbiColors[2] ?? null;

  // upsert por business_id — funciona mesmo se a linha em agent_configs ainda
  // não existir (evita depender de outra tela ter criado ela primeiro).
  async function pickOrbiColor(slot: 0 | 1 | 2, hex: string) {
    const next = [...orbiColors];
    next[slot] = hex;
    setOrbiColors(next);
    await supabase.from("agent_configs").upsert({ business_id: businessId, orbi_colors: next }, { onConflict: "business_id" });
  }
  async function clearOrbiDetail() {
    const next = [orbiColors[0], orbiColors[1]];
    setOrbiColors(next);
    await supabase.from("agent_configs").upsert({ business_id: businessId, orbi_colors: next }, { onConflict: "business_id" });
  }
  async function pickHeroColor(slot: 0 | 1, hex: string) {
    const next = [...heroGradient];
    next[slot] = hex;
    setHeroGradient(next);
    await supabase.from("businesses").update({ hero_gradient: next }).eq("id", businessId);
  }

  return (
    <div id="cores-orbi" className="scroll-mt-6 rounded-[24px] orbi-gradient p-[1.5px]">
      <div className="rounded-[23px] bg-surface-white p-5">
        <div className="flex items-center gap-4">
          <OrbiParticleSphere key={orbiColors.join("-")} size={64} colors={orbiColors} className="rounded-full" />
          <div className="flex-1">
            <p className="text-[14px] font-medium">Cores da Orbi</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
              Cor primária e secundária se misturam por toda a esfera; a cor de detalhe forma um degradê suave na parte de baixo.
            </p>
          </div>
        </div>
        {([0, 1] as const).map((slot) => (
          <div key={slot} className="mt-4">
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{slot === 0 ? "Cor primária" : "Cor secundária"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ORBI_SPHERE_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => pickOrbiColor(slot, c.hex)}
                  aria-label={c.label}
                  className={`h-8 w-8 rounded-full border-2 ${orbiColors[slot] === c.hex ? "border-on-background" : "border-transparent"}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Terceira fileira: cor de detalhe, opcional — degradê suave, concentrado embaixo. */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Cor de detalhe (opcional)</p>
            {orbiDetail && (
              <button onClick={clearOrbiDetail} className="text-[11px] text-text-tertiary underline">remover</button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {ORBI_SPHERE_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => pickOrbiColor(2, c.hex)}
                aria-label={c.label}
                className={`h-8 w-8 rounded-full border-2 ${orbiDetail === c.hex ? "border-on-background" : "border-transparent"}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-divider pt-4">
          <div className="flex items-center gap-4">
            {/* Mini réplica da tela real: fundo claro da página + o halo
                desfocado na parte de baixo, do jeito que aparece de verdade —
                não um quadrado sólido, que enganaria sobre o resultado. */}
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-background-main">
              <span
                className="absolute -bottom-5 left-1/2 h-11 w-11 -translate-x-1/2 rounded-full opacity-60 blur-md"
                style={{ backgroundImage: `linear-gradient(135deg, ${heroGradient[0]}, ${heroGradient[1]})` }}
              />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-medium">Fundo da tela inicial</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
                O brilho suave atrás do avatar, na primeira tela que o visitante vê.
              </p>
            </div>
          </div>
          {([0, 1] as const).map((slot) => (
            <div key={slot} className="mt-4">
              <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{slot === 0 ? "Cor 1" : "Cor 2"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ORBI_SPHERE_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => pickHeroColor(slot, c.hex)}
                    aria-label={c.label}
                    className={`h-8 w-8 rounded-full border-2 ${heroGradient[slot] === c.hex ? "border-on-background" : "border-transparent"}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
