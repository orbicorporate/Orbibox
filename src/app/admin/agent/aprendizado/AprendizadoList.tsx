"use client";

import { useState } from "react";
import Link from "next/link";
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
        <div key={g.id} className="rounded-[22px] border border-divider bg-surface-white p-5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FDEEDF] text-[12px]">❓</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold leading-snug">{g.pergunta}</p>
              {g.vezes > 1 && <p className="mt-0.5 text-[12px] text-text-tertiary">Apareceu {g.vezes} vezes nas conversas</p>}
            </div>
          </div>
          {g.sugestao && (
            <div className="mt-3 rounded-2xl bg-surface-soft px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Sugestão da Orbi</p>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">{g.sugestao}</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Link
              href="/admin/config/orbi"
              onClick={() => marcar(g.id, "resolvido")}
              className="flex-1 rounded-full bg-button-primary py-2.5 text-center text-[13.5px] font-semibold text-white"
            >
              Ensinar a Orbi
            </Link>
            <button onClick={() => marcar(g.id, "ignorado")} className="rounded-full bg-surface-soft px-4 py-2.5 text-[13.5px] font-medium text-text-secondary">
              Ignorar
            </button>
          </div>
        </div>
      ))}

      {resolvidos.length > 0 && (
        <>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Já tratados</p>
          {resolvidos.map((g) => (
            <div key={g.id} className="flex items-center gap-2.5 rounded-2xl bg-surface-soft px-4 py-3">
              <span className="text-[13px]">{g.status === "resolvido" ? "✓" : "—"}</span>
              <p className="min-w-0 flex-1 truncate text-[13.5px] text-text-secondary">{g.pergunta}</p>
              <span className="shrink-0 text-[11px] uppercase tracking-wide text-text-tertiary">{g.status === "resolvido" ? "Ensinado" : "Ignorado"}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
