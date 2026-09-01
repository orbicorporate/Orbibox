"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Config = {
  id: string;
  agent_name: string;
  tone_formal_informal: number;
  tone_reserved_energetic: number;
  tone_concise_detailed: number;
  objectives: string[];
};

const SLIDERS = [
  { key: "tone_formal_informal", from: "Formal", to: "Informal" },
  { key: "tone_reserved_energetic", from: "Reservada", to: "Energética" },
  { key: "tone_concise_detailed", from: "Concisa", to: "Detalhista" },
] as const;

const OBJECTIVES = [
  { key: "vender", label: "Vender" },
  { key: "agendar", label: "Agendar" },
  { key: "informar", label: "Informar" },
];

export function AgentConfigForm({ config }: { config: Config }) {
  const supabase = createClient();
  const [state, setState] = useState(config);
  const [saved, setSaved] = useState(false);

  function updateSlider(key: string, value: number) {
    setState((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  function toggleObjective(key: string) {
    setState((s) => ({
      ...s,
      objectives: s.objectives.includes(key)
        ? s.objectives.filter((o) => o !== key)
        : [...s.objectives, key],
    }));
    setSaved(false);
  }

  async function save() {
    const { error } = await supabase
      .from("agent_configs")
      .update({
        agent_name: state.agent_name,
        tone_formal_informal: state.tone_formal_informal,
        tone_reserved_energetic: state.tone_reserved_energetic,
        tone_concise_detailed: state.tone_concise_detailed,
        objectives: state.objectives,
      })
      .eq("id", state.id);
    if (!error) setSaved(true);
  }

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <label className="text-[13px] text-text-tertiary">Nome da assistente</label>
        <input
          value={state.agent_name}
          onChange={(e) => {
            setState((s) => ({ ...s, agent_name: e.target.value }));
            setSaved(false);
          }}
          className="mt-1 w-full rounded-2xl border border-divider px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
        />
      </div>

      <div className="flex flex-col gap-5">
        {SLIDERS.map((slider) => (
          <div key={slider.key}>
            <div className="flex justify-between text-[13px] text-text-secondary">
              <span>{slider.from}</span>
              <span>{slider.to}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={state[slider.key]}
              onChange={(e) => updateSlider(slider.key, Number(e.target.value))}
              className="mt-1 w-full accent-[#111318]"
            />
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[13px] text-text-tertiary">Objetivos</p>
        <div className="flex flex-wrap gap-2">
          {OBJECTIVES.map((obj) => {
            const active = state.objectives.includes(obj.key);
            return (
              <button
                key={obj.key}
                type="button"
                onClick={() => toggleObjective(obj.key)}
                className={
                  active
                    ? "orbi-gradient rounded-full px-4 py-2 text-[13px] font-medium text-on-background"
                    : "rounded-full bg-surface-soft px-4 py-2 text-[13px] text-text-secondary"
                }
              >
                {obj.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save}>Salvar</Button>
        {saved && <span className="text-[13px] text-text-tertiary">✓ Salvo</span>}
      </div>
    </Card>
  );
}
