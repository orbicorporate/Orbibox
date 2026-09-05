"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PRESETS = [
  { key: "24h", label: "24h", dias: 1 },
  { key: "3d", label: "3 dias", dias: 3 },
  { key: "7d", label: "Semana", dias: 7 },
  { key: "15d", label: "15 dias", dias: 15 },
  { key: "30d", label: "Mês", dias: 30 },
  { key: "365d", label: "Ano", dias: 365 },
] as const;

const MES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIA_NOMES = ["D", "S", "T", "Q", "Q", "S", "S"];

function toISO(d: Date, endOfDay = false) {
  const c = new Date(d);
  if (endOfDay) c.setHours(23, 59, 59, 999);
  else c.setHours(0, 0, 0, 0);
  return c.toISOString();
}

function fmt(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function PulseDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const activeLabel = searchParams.get("label");

  function applyRange(since: Date, until: Date, label: string) {
    const params = new URLSearchParams();
    params.set("since", toISO(since));
    params.set("until", toISO(until, true));
    params.set("label", label);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function applyPreset(dias: number, label: string) {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - (dias - 1));
    applyRange(inicio, fim, label);
  }

  function clearFilter() {
    router.push(pathname);
    setRangeStart(null);
    setRangeEnd(null);
    setOpen(false);
  }

  function pickDay(d: Date) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(d);
      setRangeEnd(null);
      return;
    }
    // Segundo clique: fecha o intervalo (em qualquer ordem).
    if (d < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(d);
    } else {
      setRangeEnd(d);
    }
  }

  function confirmCalendar() {
    if (!rangeStart) return;
    const fim = rangeEnd ?? rangeStart;
    const label = rangeEnd && rangeEnd.getTime() !== rangeStart.getTime()
      ? `${fmt(rangeStart)} – ${fmt(fim)}`
      : fmt(rangeStart);
    applyRange(rangeStart, fim, label);
  }

  const monthGrid = useMemo(() => {
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i));
    return cells;
  }, [viewMonth]);

  function inRange(d: Date) {
    if (!rangeStart) return false;
    const end = rangeEnd ?? rangeStart;
    const lo = rangeStart < end ? rangeStart : end;
    const hi = rangeStart < end ? end : rangeStart;
    return d >= lo && d <= hi;
  }

  return (
    <div className="relative mt-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.dias, p.label)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              activeLabel === p.label ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Escolher data no calendário"
          className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] ${
            open || (activeLabel && !PRESETS.some((p) => p.label === activeLabel)) ? "bg-button-primary text-white" : "bg-surface-soft"
          }`}
        >
          📅
        </button>
        {activeLabel && (
          <button onClick={clearFilter} className="ml-1 text-[12px] text-text-tertiary underline underline-offset-2">
            limpar ({activeLabel}) ×
          </button>
        )}
      </div>

      {open && (
        <div ref={popRef} className="absolute left-0 top-11 z-20 w-[300px] rounded-[24px] border border-divider bg-surface-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-[13px]"
            >
              ‹
            </button>
            <p className="text-[14px] font-medium">
              {MES_NOMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </p>
            <button
              onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-[13px]"
            >
              ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-[11px] text-text-tertiary">
            {DIA_NOMES.map((n, i) => <span key={i}>{n}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
            {monthGrid.map((d, i) => {
              if (!d) return <span key={i} />;
              const selected = inRange(d);
              const isEdge = (rangeStart && d.getTime() === rangeStart.getTime()) || (rangeEnd && d.getTime() === rangeEnd.getTime());
              return (
                <button
                  key={i}
                  onClick={() => pickDay(d)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] ${
                    isEdge ? "bg-button-primary text-white" : selected ? "bg-surface-soft" : "hover:bg-surface-soft"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[12px] text-text-tertiary">
            Toque num dia para filtrar por ele, ou toque em dois dias pra escolher um período.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={confirmCalendar}
              disabled={!rangeStart}
              className="flex-1 rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
            >
              Aplicar
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full bg-surface-soft px-4 py-2.5 text-[13px]">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
