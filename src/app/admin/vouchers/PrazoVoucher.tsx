"use client";

import { useState } from "react";
import { VALIDADES } from "./VouchersManager";

/**
 * Prazo pra usar o voucher depois de resgatar: atalhos prontos e "Outro prazo",
 * onde a pessoa digita quantos dias ou horas quiser. O valor sai sempre em horas
 * (string vazia = sem prazo), que é o que o banco guarda.
 */
export function PrazoVoucher({ horas, onChange }: { horas: string; onChange: (h: string) => void }) {
  const ehPronto = VALIDADES.some((v) => v.horas === horas);
  const [aberto, setAberto] = useState(!ehPronto);
  const n = Number(horas) || 0;
  const [unidade, setUnidade] = useState<"dias" | "horas">(n > 0 && n % 24 === 0 ? "dias" : n > 0 ? "horas" : "dias");
  const qtd = n > 0 ? String(unidade === "dias" ? n / 24 : n) : "";

  function digitar(texto: string, un: "dias" | "horas") {
    const v = Number(texto);
    if (!texto || !(v > 0)) return onChange("");
    onChange(String(Math.round(un === "dias" ? v * 24 : v)));
  }

  const chip = (ativo: boolean) => `min-h-[40px] rounded-full px-3.5 text-[13px] font-medium ${ativo ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`;
  return (
    <div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {VALIDADES.map((v) => (
          <button key={v.rotulo} type="button" onClick={() => { setAberto(false); onChange(v.horas); }} aria-pressed={!aberto && horas === v.horas} className={chip(!aberto && horas === v.horas)}>
            {v.rotulo}
          </button>
        ))}
        <button type="button" onClick={() => { setAberto(true); if (ehPronto) onChange(""); }} aria-pressed={aberto} className={chip(aberto)}>
          Outro prazo
        </button>
      </div>
      {aberto && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={qtd}
            onChange={(e) => digitar(e.target.value, unidade)}
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="Ex: 3"
            aria-label="Quantidade do prazo"
            className="w-24 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
          />
          <div role="radiogroup" aria-label="Unidade" className="flex gap-1 rounded-full bg-surface-soft p-1">
            {(["dias", "horas"] as const).map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={unidade === u}
                onClick={() => { setUnidade(u); digitar(qtd, u); }}
                className={`min-h-[44px] rounded-full px-3.5 text-[13px] font-medium ${unidade === u ? "bg-on-background text-white" : "text-text-secondary"}`}
              >
                {u === "dias" ? "dias" : "horas"}
              </button>
            ))}
          </div>
        </div>
      )}
      {aberto && !horas && <p className="mt-1.5 text-[12px] text-text-tertiary">Digite um número. Vazio vale como sem prazo.</p>}
    </div>
  );
}
