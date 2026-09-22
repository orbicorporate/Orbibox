"use client";

import { useEffect, useRef, useState } from "react";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoToParts(iso: string | null): { date: Date | null; time: string } {
  if (!iso) return { date: null, time: "12:00" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: null, time: "12:00" };
  return { date: d, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

function partsToIso(date: Date, time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString();
}

function formatDisplay(iso: string | null): string {
  if (!iso) return "Escolher data";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Escolher data";
  return `${pad(d.getDate())} ${MESES_ABREV[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Campo de data + hora com calendário próprio, no lugar do
 * <input type="datetime-local"> nativo, cujo popup de calendário é
 * renderizado pelo navegador/SO e não dá pra estilizar de jeito nenhum.
 * Mesma cara do resto do painel: cantos bem arredondados, degradê da Orbi
 * no dia selecionado, tipografia consistente.
 */
export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { date: selectedDate, time } = isoToParts(value);
  const [viewMonth, setViewMonth] = useState(() => selectedDate ?? new Date());
  const [horario, setHorario] = useState(time);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setHorario(time), [time]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [open]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const hoje = new Date();

  function escolherDia(day: number) {
    onChange(partsToIso(new Date(year, month, day), horario));
  }

  function mudarHorario(novo: string) {
    setHorario(novo);
    if (selectedDate) onChange(partsToIso(selectedDate, novo));
  }

  return (
    <div ref={ref} className="relative">
      <p className="text-[12px] font-medium text-text-tertiary">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`mt-1.5 flex w-full items-center gap-2.5 rounded-2xl border bg-surface-white px-4 py-3 text-left text-[14px] outline-none transition ${
          open ? "border-on-background" : "border-divider"
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[13px]" aria-hidden>
          📅
        </span>
        <span className={value ? "font-medium tabular-nums" : "text-text-tertiary"}>{formatDisplay(value)}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[300px] rounded-[26px] border border-divider bg-surface-white p-4 shadow-[0_20px_50px_rgba(17,19,24,0.18)]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              aria-label="Mês anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-[14px] active:opacity-60"
            >
              ‹
            </button>
            <p className="text-[13.5px] font-semibold capitalize">
              {MESES[month]} {year}
            </p>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              aria-label="Próximo mês"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-[14px] active:opacity-60"
            >
              ›
            </button>
          </div>

          <div className="mt-3.5 grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold uppercase text-text-tertiary">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const selecionado =
                !!selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
              const ehHoje = hoje.getFullYear() === year && hoje.getMonth() === month && hoje.getDate() === day;
              return (
                <div key={i} className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => escolherDia(day)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition active:scale-90 ${
                      selecionado
                        ? "orbi-gradient font-semibold text-on-background shadow-[0_4px_12px_rgba(110,231,216,0.4)]"
                        : ehHoje
                          ? "border border-on-background/30 text-on-background"
                          : "text-text-secondary hover:bg-surface-soft"
                    }`}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-soft px-3.5 py-2.5">
            <span className="text-[12.5px] font-medium text-text-secondary">Horário</span>
            <input
              type="time"
              value={horario}
              onChange={(e) => mudarHorario(e.target.value)}
              className="bg-transparent text-right text-[14px] font-semibold tabular-nums outline-none"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="flex-1 rounded-full border border-divider py-2 text-center text-[12.5px] font-medium text-red-600"
              >
                Limpar
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full bg-on-background py-2 text-center text-[12.5px] font-medium text-white"
            >
              Pronto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
