"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { ColorChip, ColorPickerSheet, DEFAULT_ORBI } from "@/app/admin/config/colorPieces";

type PickerKey = "primaria" | "secundaria" | "detalhe";

/**
 * Cores da esfera da Orbi. Fica logo acima do fundo da tela inicial, que
 * é um painel separado: são coisas diferentes, mas a esfera aparece em
 * cima do fundo, então escolher as duas na mesma tela é o que ajuda.
 */
export function OrbiColorsPanel({
  businessId,
  initialOrbiColors,
  embutido = false,
}: {
  businessId: string;
  initialOrbiColors: string[] | null;
  /** Sem o cartão e o cabeçalho que abre/fecha: mostra direto os controles. */
  embutido?: boolean;
}) {
  const supabase = createClient();
  const [orbiColors, setOrbiColors] = useState<string[]>(
    initialOrbiColors && initialOrbiColors.length >= 2 ? initialOrbiColors : DEFAULT_ORBI
  );
  const [openPicker, setOpenPicker] = useState<PickerKey | null>(null);
  const [aberto, setAberto] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#cores-orbi",
  );
  const orbiDetail = orbiColors[2] ?? null;

  // upsert por business_id: funciona mesmo se a linha em agent_configs ainda
  // não existir (não depende de outra tela ter criado ela primeiro).
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

  const seletor = openPicker && (
    <ColorPickerSheet
      current={
        openPicker === "primaria" ? orbiColors[0]
        : openPicker === "secundaria" ? orbiColors[1]
        : orbiDetail
      }
      onSelect={(hex) => {
        if (openPicker === "primaria") pickOrbiColor(0, hex);
        else if (openPicker === "secundaria") pickOrbiColor(1, hex);
        else pickOrbiColor(2, hex);
      }}
      onClose={() => setOpenPicker(null)}
      preview={<OrbiParticleSphere key={orbiColors.join("-")} size={124} colors={orbiColors} className="rounded-full" />}
    />
  );

  if (embutido) {
    return (
      <div>
        <div className="flex items-center gap-3">
          <OrbiParticleSphere key={orbiColors.join("-")} size={56} colors={orbiColors} className="shrink-0 rounded-full" />
          <div>
            <p className="text-[14px] font-semibold">Cores da esfera</p>
            <p className="text-[12px] leading-snug text-text-tertiary">A Orbi aparece com elas na sua página.</p>
          </div>
        </div>
        <div className="mt-3 flex items-stretch gap-2.5">
          <ColorChip label="Primária" hex={orbiColors[0]} onOpen={() => setOpenPicker("primaria")} />
          <ColorChip label="Secundária" hex={orbiColors[1]} onOpen={() => setOpenPicker("secundaria")} />
          <ColorChip label="Detalhe (opcional)" hex={orbiDetail} onOpen={() => setOpenPicker("detalhe")} onRemove={orbiDetail ? clearOrbiDetail : undefined} />
        </div>
        {seletor}
      </div>
    );
  }

  return (
    <div id="cores-orbi" className="scroll-mt-6 rounded-[24px] orbi-gradient p-[1.5px]">
      <div className="rounded-[23px] bg-surface-white">
        <button
          type="button"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          className="flex w-full cursor-pointer items-center gap-4 p-5 text-left"
        >
          <OrbiParticleSphere key={orbiColors.join("-")} size={72} colors={orbiColors} className="shrink-0 rounded-full" />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Cores da Orbi</span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-text-secondary">
              {aberto
                ? "Primária e secundária se misturam por toda a esfera; a de detalhe faz um degradê na parte de baixo."
                : "Toque pra escolher as cores da esfera dela."}
            </span>
          </span>
          <span className={`shrink-0 text-text-tertiary transition-transform ${aberto ? "rotate-90" : ""}`}>→</span>
        </button>

        {aberto && (
          <div className="border-t border-divider px-5 pb-5 pt-4">
            <div className="flex items-stretch gap-2.5">
              <ColorChip label="Primária" hex={orbiColors[0]} onOpen={() => setOpenPicker("primaria")} />
              <ColorChip label="Secundária" hex={orbiColors[1]} onOpen={() => setOpenPicker("secundaria")} />
              <ColorChip
                label="Detalhe (opcional)"
                hex={orbiDetail}
                onOpen={() => setOpenPicker("detalhe")}
                onRemove={orbiDetail ? clearOrbiDetail : undefined}
              />
            </div>
          </div>
        )}
      </div>

      {openPicker && (
        <ColorPickerSheet
          current={
            openPicker === "primaria" ? orbiColors[0]
            : openPicker === "secundaria" ? orbiColors[1]
            : orbiDetail
          }
          onSelect={(hex) => {
            if (openPicker === "primaria") pickOrbiColor(0, hex);
            else if (openPicker === "secundaria") pickOrbiColor(1, hex);
            else pickOrbiColor(2, hex);
          }}
          onClose={() => setOpenPicker(null)}
          preview={<OrbiParticleSphere key={orbiColors.join("-")} size={124} colors={orbiColors} className="rounded-full" />}
        />
      )}
    </div>
  );
}
