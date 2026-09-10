import Link from "next/link";
import { PROGRESS_STEPS, type ProgressKey } from "@/lib/progress";

// Card completo do checklist — vai na Today. Some quando estiver 100%.
export function ProgressCard({ done, pct }: { done: Record<string, boolean>; pct: number }) {
  if (pct >= 100) return null;

  return (
    <div className="mt-5 rounded-[24px] border border-divider bg-surface-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold">Deixe seu Orbibox completo</p>
        <span className="text-[13px] font-semibold text-text-secondary">{pct}%</span>
      </div>
      <p className="mt-0.5 text-[13px] text-text-tertiary">Quanto mais completo, mais seu Orbibox vende.</p>

      {/* Barra simples */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-soft">
        <div className="h-full rounded-full orbi-gradient transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {PROGRESS_STEPS.map((step) => {
          const feito = done[step.key];
          return (
            <Link
              key={step.key}
              href={step.href}
              className={`flex items-center gap-3 ${feito ? "opacity-55" : ""}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${feito ? "orbi-gradient" : "border-2 border-divider"}`}>
                {feito && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111318" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                )}
              </span>
              <span className={`flex-1 text-[14px] ${feito ? "text-text-secondary line-through" : "font-medium"}`}>{step.label}</span>
              {!feito && <span className="text-[13px] text-text-tertiary">→</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Selo fino de progresso — vai no topo de todas as telas (no header).
export function ProgressBadge({ pct }: { pct: number }) {
  if (pct >= 100) return null;
  return (
    <Link href="/admin" className="flex items-center gap-2 rounded-full bg-surface-soft px-2.5 py-1">
      <span className="relative flex h-3.5 w-14 overflow-hidden rounded-full bg-surface-white">
        <span className="h-full rounded-full orbi-gradient" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[11px] font-semibold text-text-secondary">{pct}%</span>
    </Link>
  );
}

export type { ProgressKey };
