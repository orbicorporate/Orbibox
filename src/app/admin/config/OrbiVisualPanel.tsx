"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { ORBI_SPHERE_COLORS } from "@/lib/showcase";

const DEFAULT_ORBI = ["#7FE84A", "#8B2BFF"];
// Mesmas cores que o degradê padrão da tela inicial sempre usou.
const DEFAULT_HERO = ["#B7F34A", "#6EE7D8"];

type PickerKey = "primaria" | "secundaria" | "detalhe" | "hero1" | "hero2";

// Cada botão mostra só a cor atual (uma bolinha) + o nome — a paleta inteira
// só aparece quando toca, numa folha que sobe de baixo.
function ColorRow({ label, hex, onOpen, extra }: { label: string; hex: string | null; onOpen: () => void; extra?: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <button onClick={onOpen} className="flex flex-1 items-center gap-3 rounded-2xl bg-surface-soft px-3 py-2.5 text-left">
        <span
          className="h-7 w-7 shrink-0 rounded-full border border-divider"
          style={hex ? { backgroundColor: hex } : { background: "repeating-linear-gradient(45deg, #ddd, #ddd 3px, transparent 3px, transparent 6px)" }}
        />
        <span className="flex-1 text-[13px] font-medium">{label}</span>
        <span className="text-text-tertiary">›</span>
      </button>
      {extra}
    </div>
  );
}

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
  // Só uma folha de cor aberta por vez — toca no botão, escolhe, fecha.
  const [openPicker, setOpenPicker] = useState<PickerKey | null>(null);

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

        <ColorRow label="Cor primária" hex={orbiColors[0]} onOpen={() => setOpenPicker("primaria")} />
        <ColorRow label="Cor secundária" hex={orbiColors[1]} onOpen={() => setOpenPicker("secundaria")} />
        <ColorRow
          label="Cor de detalhe (opcional)"
          hex={orbiDetail}
          onOpen={() => setOpenPicker("detalhe")}
          extra={orbiDetail && (
            <button onClick={clearOrbiDetail} className="ml-2 shrink-0 text-[11px] text-text-tertiary underline">remover</button>
          )}
        />

        <div className="mt-5 border-t border-divider pt-4">
          <div className="flex items-center gap-4">
            {/* Mini réplica da tela real: fundo claro da página + o brilho na
                parte de baixo. Usa gradiente radial com transparência (em vez
                de blur, que em caixa pequena corta feio) — fica limpo em
                qualquer tamanho e ainda representa o efeito de verdade. */}
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-background-main">
              <span
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 115%, ${heroGradient[0]}CC, ${heroGradient[1]}66 45%, transparent 72%)`,
                }}
              />
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-medium">Fundo da tela inicial</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
                O brilho suave atrás do avatar, na primeira tela que o visitante vê.
              </p>
            </div>
          </div>
          <ColorRow label="Cor 1" hex={heroGradient[0]} onOpen={() => setOpenPicker("hero1")} />
          <ColorRow label="Cor 2" hex={heroGradient[1]} onOpen={() => setOpenPicker("hero2")} />
        </div>
      </div>

      {openPicker && (
        <ColorPickerSheet
          current={
            openPicker === "primaria" ? orbiColors[0]
            : openPicker === "secundaria" ? orbiColors[1]
            : openPicker === "detalhe" ? orbiDetail
            : openPicker === "hero1" ? heroGradient[0]
            : heroGradient[1]
          }
          onSelect={(hex) => {
            if (openPicker === "primaria") pickOrbiColor(0, hex);
            else if (openPicker === "secundaria") pickOrbiColor(1, hex);
            else if (openPicker === "detalhe") pickOrbiColor(2, hex);
            else if (openPicker === "hero1") pickHeroColor(0, hex);
            else pickHeroColor(1, hex);
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  );
}

/** Folha que sobe de baixo com a paleta inteira — só aparece quando a
 * pessoa toca num dos botões de cor, em vez de ficar sempre visível. */
function ColorPickerSheet({
  current,
  onSelect,
  onClose,
}: {
  current: string | null;
  onSelect: (hex: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div className="max-h-[70vh] overflow-y-auto rounded-t-[28px] bg-surface-white p-5" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-divider" aria-label="Fechar" />
        <p className="text-center text-[14px] font-medium">Escolher cor</p>
        <div className="mt-4 grid grid-cols-6 gap-3 pb-2">
          {ORBI_SPHERE_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => { onSelect(c.hex); onClose(); }}
              aria-label={c.label}
              title={c.label}
              className={`aspect-square rounded-full border-2 ${current?.toLowerCase() === c.hex.toLowerCase() ? "border-on-background" : "border-transparent"}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
