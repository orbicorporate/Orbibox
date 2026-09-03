"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Box = { id: string; box_type: string; title: string | null; position: number; is_active: boolean; auto_arranged: boolean };

// O que cada box realmente faz na página do visitante.
const META: Record<string, { name: string; opcao: string; explica: string; icon: string; fixo?: boolean }> = {
  hero: {
    name: "Entrada",
    opcao: "Tela inicial",
    explica: "A pergunta “O que trouxe você aqui hoje?”. É sempre a primeira coisa que aparece.",
    icon: "◈",
    fixo: true,
  },
  product: {
    name: "Vitrine",
    opcao: "Comprar",
    explica: "Mostra seus produtos e serviços na vitrine que você montou.",
    icon: "▤",
  },
  content: {
    name: "História",
    opcao: "Conhecer",
    explica: "Conta sobre a marca, usando o tom de voz do seu DNA.",
    icon: "◫",
  },
  campaign: {
    name: "Presentes",
    opcao: "Presentear",
    explica: "Uma seleção pensada para quem vai comprar para outra pessoa.",
    icon: "◇",
  },
  agent: {
    name: "Zara",
    opcao: "Tirar uma dúvida",
    explica: "Abre a conversa com sua assistente de IA.",
    icon: "◉",
  },
  custom: { name: "Bloco livre", opcao: "Personalizado", explica: "Um caminho extra que você define.", icon: "◌" },
};

export function BoxesManager({ initialBoxes, slug }: { businessId: string; initialBoxes: Box[]; slug: string }) {
  const supabase = createClient();
  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);
  const [arranging, setArranging] = useState(false);

  async function toggleActive(box: Box) {
    if (META[box.box_type]?.fixo) return;
    const { error } = await supabase.from("smart_boxes").update({ is_active: !box.is_active }).eq("id", box.id);
    if (!error) setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, is_active: !b.is_active } : b)));
  }

  async function autoArrange() {
    setArranging(true);
    const priority: Record<string, number> = { hero: 0, product: 1, content: 2, campaign: 3, agent: 4, custom: 5 };
    const sorted = [...boxes].sort((a, b) => (priority[a.box_type] ?? 9) - (priority[b.box_type] ?? 9));
    await Promise.all(sorted.map((b, i) => supabase.from("smart_boxes").update({ position: i, auto_arranged: true }).eq("id", b.id)));
    setBoxes(sorted.map((b, i) => ({ ...b, position: i, auto_arranged: true })));
    setArranging(false);
  }

  async function move(box: Box, dir: -1 | 1) {
    const ordered = [...boxes].sort((a, b) => a.position - b.position);
    const idx = ordered.findIndex((b) => b.id === box.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("smart_boxes").update({ position: swap.position }).eq("id", box.id),
      supabase.from("smart_boxes").update({ position: box.position }).eq("id", swap.id),
    ]);
    setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, position: swap.position } : b.id === swap.id ? { ...b, position: box.position } : b)));
  }

  const ordered = [...boxes].sort((a, b) => a.position - b.position);
  const ativos = ordered.filter((b) => b.is_active && !META[b.box_type]?.fixo).length;

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={autoArrange}
          disabled={arranging}
          className="rounded-full orbi-gradient px-4 py-2 text-[13px] font-medium text-on-background disabled:opacity-60"
        >
          {arranging ? "Organizando…" : "✦ Sugerir ordem"}
        </button>
        <Link href={`/${slug}`} target="_blank" className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] text-text-secondary">
          Ver resultado ↗
        </Link>
      </div>

      <p className="text-[13px] text-text-secondary">
        {ativos === 0
          ? "Nenhum caminho ativo — o visitante só verá a tela inicial."
          : `${ativos} ${ativos === 1 ? "caminho ativo" : "caminhos ativos"} na sua tela inicial.`}
      </p>

      <div className="flex flex-col gap-3">
        {ordered.map((box, idx) => {
          const m = META[box.box_type] ?? META.custom;
          const off = !box.is_active && !m.fixo;
          return (
            <div key={box.id} className={`rounded-[22px] border border-divider bg-surface-white p-4 ${off ? "opacity-55" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col pt-1 text-[11px] text-text-tertiary">
                  <button onClick={() => move(box, -1)} disabled={idx === 0} className="disabled:opacity-30" aria-label="Subir">▲</button>
                  <button onClick={() => move(box, 1)} disabled={idx === ordered.length - 1} className="disabled:opacity-30" aria-label="Descer">▼</button>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-on-background text-[16px] text-white">
                  {m.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-medium">{m.name}</p>
                    {m.fixo && <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-text-tertiary">sempre ativo</span>}
                  </div>
                  <p className="mt-0.5 text-[12px] text-text-secondary">
                    Aparece como <span className="font-medium text-on-background">“{m.opcao}”</span>
                  </p>
                </div>
                {!m.fixo && (
                  <button
                    onClick={() => toggleActive(box)}
                    className={`mt-1 h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${box.is_active ? "orbi-gradient" : "bg-surface-soft"}`}
                    aria-label={box.is_active ? "Desativar" : "Ativar"}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-surface-white shadow transition-transform ${box.is_active ? "translate-x-5" : ""}`} />
                  </button>
                )}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">{m.explica}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
