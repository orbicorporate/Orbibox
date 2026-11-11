"use client";

import { DIAS_CURTOS, rotuloJanela } from "@/lib/validadeVoucher";

export type JanelaForm = { dias: number[]; inicio: string; fim: string };
export const JANELA_VAZIA: JanelaForm = { dias: [], inicio: "", fim: "" };

/** Converte o formulário para as colunas do banco (null = sem restrição). */
export function janelaParaBanco(j: JanelaForm) {
  const dias = j.dias.length > 0 && j.dias.length < 7 ? [...j.dias].sort((a, b) => a - b) : null;
  return { dias_semana: dias, hora_inicio: j.inicio || null, hora_fim: j.fim || null };
}

/** Lê as colunas do banco para o formulário ("18:00:00" vira "18:00"). */
export function janelaDoBanco(v: { dias_semana?: number[] | null; hora_inicio?: string | null; hora_fim?: string | null }): JanelaForm {
  return { dias: v.dias_semana ?? [], inicio: v.hora_inicio?.slice(0, 5) ?? "", fim: v.hora_fim?.slice(0, 5) ?? "" };
}

/**
 * Dias e horário em que o voucher vale. Vazio = vale todos os dias, o dia todo.
 * A conferência acontece quando o balcão confirma o código.
 */
export function DiasHorarioVoucher({ valor, onChange }: { valor: JanelaForm; onChange: (j: JanelaForm) => void }) {
  const chip = (ativo: boolean) => `min-h-[40px] min-w-[48px] rounded-full px-3 text-[13px] font-medium ${ativo ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`;
  const entrada = "w-[110px] rounded-2xl border border-divider bg-surface-white px-3 py-2.5 text-[15px] outline-none focus:border-on-background";
  const rotulo = rotuloJanela({ dias_semana: valor.dias, hora_inicio: valor.inicio || null, hora_fim: valor.fim || null });

  function alternar(d: number) {
    onChange({ ...valor, dias: valor.dias.includes(d) ? valor.dias.filter((x) => x !== d) : [...valor.dias, d] });
  }

  return (
    <div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange({ ...valor, dias: [] })} aria-pressed={valor.dias.length === 0} className={chip(valor.dias.length === 0)}>
          Todos os dias
        </button>
        {DIAS_CURTOS.map((nome, d) => (
          <button key={nome} type="button" onClick={() => alternar(d)} aria-pressed={valor.dias.includes(d)} className={chip(valor.dias.includes(d))}>
            {nome}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-text-secondary">
        <label className="flex items-center gap-2">
          <span>Das</span>
          <input type="time" value={valor.inicio} onChange={(e) => onChange({ ...valor, inicio: e.target.value })} aria-label="Horário inicial" className={entrada} />
        </label>
        <label className="flex items-center gap-2">
          <span>às</span>
          <input type="time" value={valor.fim} onChange={(e) => onChange({ ...valor, fim: e.target.value })} aria-label="Horário final" className={entrada} />
        </label>
        {(valor.inicio || valor.fim) && (
          <button type="button" onClick={() => onChange({ ...valor, inicio: "", fim: "" })} className="text-[12px] underline">
            Limpar horário
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[12px] text-text-tertiary">
        {rotulo ? `${rotulo}. O balcão só confirma o código nesse período.` : "Sem restrição: vale todos os dias, o dia todo. Escolha dias e horário para limitar."}
      </p>
    </div>
  );
}
