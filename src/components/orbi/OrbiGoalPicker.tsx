"use client";

import { useState } from "react";
import { OrbiInsightCard, OrbiInsightHeader } from "@/components/orbi/OrbiInsightCard";

// Tela "Qual é o próximo passo pra sua marca?". Reaproveita o mesmo
// card degradê (orbi-card-light) do resto dos insights da Orbi, mas
// em vez de uma frase + 1 CTA, apresenta as opções como tags que se
// encaixam lado a lado (flex-wrap) e só quebram linha quando não
// cabe mais, em vez de uma lista vertical ocupando a largura toda.

type Goal = { id: string; label: string };

const GOALS: Goal[] = [
  { id: "redes", label: "Crescer nas redes" },
  { id: "trafego", label: "Vender mais com tráfego" },
  { id: "site", label: "Criar site ou app" },
  { id: "identidade", label: "Construir identidade forte" },
];

export function OrbiGoalPicker({ onSelect }: { onSelect?: (goalId: string) => void }) {
  const [selecionado, setSelecionado] = useState<string | null>(null);

  function escolher(goal: Goal) {
    setSelecionado(goal.id);
    onSelect?.(goal.id);
  }

  return (
    <OrbiInsightCard>
      <div className="relative flex items-center justify-between">
        <OrbiInsightHeader />
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-[13px] font-semibold text-text-secondary active:bg-white"
          aria-label="Ajuda"
        >
          ?
        </button>
      </div>

      <p className="relative mt-4 text-[22px] font-medium leading-tight text-on-background">
        Qual é o próximo passo pra sua marca?
      </p>

      <div className="relative mt-5 flex flex-wrap gap-2.5">
        {GOALS.map((goal) => {
          const ativo = selecionado === goal.id;
          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => escolher(goal)}
              className={`whitespace-nowrap rounded-full border px-4 py-3 text-[14px] font-medium leading-snug transition-colors ${
                ativo
                  ? "border-on-background bg-on-background text-white"
                  : "border-divider bg-surface-white text-on-background active:bg-surface-soft"
              }`}
            >
              {goal.label}
            </button>
          );
        })}
      </div>
    </OrbiInsightCard>
  );
}
