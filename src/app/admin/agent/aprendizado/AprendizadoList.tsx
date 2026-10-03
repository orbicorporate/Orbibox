"use client";

import { useState } from "react";
import { ResponderPergunta } from "../ResponderPergunta";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Gap = Database["public"]["Tables"]["orbi_learnings"]["Row"];

export function AprendizadoList({ initialGaps }: { initialGaps: Gap[] }) {
  const supabase = createClient();
  const [gaps, setGaps] = useState(initialGaps);

  const pendentes = gaps.filter((g) => g.status === "pendente");
  const resolvidos = gaps.filter((g) => g.status !== "pendente");

  async function marcar(id: string, status: "resolvido" | "ignorado") {
    setGaps((p) => p.map((g) => (g.id === id ? { ...g, status } : g)));
    await supabase.from("orbi_learnings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  }

  if (gaps.length === 0) {
    return (
      <div className="mt-6 rounded-[24px] border border-dashed border-divider p-8 text-center">
        <span className="text-[28px]">💬</span>
        <p className="mt-3 text-[15px] font-semibold">Nada por aqui ainda</p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">
          Assim que os visitantes começarem a conversar com a Orbi, ela vai anotar aqui o que não soube responder pra você ensinar. Divulgue seu link pra trazer as primeiras conversas.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {pendentes.map((g) => (
        <div key={g.id} className="rounded-[22px] bg-surface-white p-5">
          <ResponderPergunta
            id={g.id}
            pergunta={g.pergunta}
            vezes={g.vezes}
            onEnsinado={(r) => setTimeout(() => setGaps((p) => p.map((x) => (x.id === g.id ? { ...x, status: "ensinado", sugestao: r } : x))), 1600)}
          />
          <button onClick={() => marcar(g.id, "ignorado")} className="mt-3 min-h-[40px] text-[13px] text-text-tertiary underline underline-offset-4">
            Ignorar essa pergunta
          </button>
        </div>
      ))}

      {resolvidos.length > 0 && (
        <>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Já tratados</p>
          {resolvidos.map((g) => (
            <div key={g.id} className="flex items-center gap-2.5 rounded-2xl bg-surface-soft px-4 py-3">
              <span className="text-[13px]">{g.status === "ignorado" ? "·" : "✓"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] text-text-secondary">{g.pergunta}</p>
                {g.status === "ensinado" && g.sugestao && <p className="truncate text-[12.5px] text-text-tertiary">{g.sugestao}</p>}
              </div>
              <span className="shrink-0 text-[11px] uppercase tracking-wide text-text-tertiary">{g.status === "ignorado" ? "Ignorado" : "Ensinado"}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
