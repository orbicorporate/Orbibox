import Link from "next/link";
import type { ReactNode } from "react";
import { PROGRESS_STEPS, type ProgressKey } from "@/lib/progress";

// Ícone + cor de cada passo — pastel de fundo com o traço numa cor mais forte,
// no mesmo espírito de referências como Wix/Shopify onboarding.
const STEP_ICONS: Record<ProgressKey, { bg: string; fg: string; icon: ReactNode }> = {
  marca: {
    bg: "#E7EAFC",
    fg: "#4453D6",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
        <path d="M9 20v-5a1 1 0 011-1h4a1 1 0 011 1v5" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
  orbi: {
    bg: "orbi-gradient",
    fg: "#111318",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
        <path d="M19 15l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6L15.5 18l2.6-.4L19 15z" opacity=".65" />
      </svg>
    ),
  },
  vitrine: {
    bg: "#FCEADC",
    fg: "#C2650A",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
  boxes: {
    bg: "#FDEEDF",
    fg: "#C2650A",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <path d="M17 13v8M13 17h8" />
      </svg>
    ),
  },
  whatsapp: {
    bg: "#DEF3E3",
    fg: "#1F9E4C",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm5.8 14.3c-.2.7-1.4 1.4-2 1.4-.5 0-1.1.2-3.6-.9-3-1.3-5-4.4-5.1-4.6-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .5 0 .7.6.3.6 1 2.1 1 2.3.1.2.1.3 0 .5-.1.2-.2.3-.4.5-.2.2-.4.4-.5.6-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.6.3.2.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.2.7-.1.3.1 1.8.9 2.1 1 .3.2.5.2.6.4.1.2.1.7-.1 1.4z" />
      </svg>
    ),
  },
  capa: {
    bg: "#FBE7DE",
    fg: "#DB7A4E",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.7" />
        <path d="M21 16l-5.5-5.5a1 1 0 00-1.4 0L6 19" />
      </svg>
    ),
  },
};

// Card completo do checklist — vai na Today. Some quando estiver 100%.
export function ProgressCard({ done, pct }: { done: Record<string, boolean>; pct: number }) {
  if (pct >= 100) return null;

  // Primeiro passo ainda não feito ganha o selo "Recomendado" — sempre
  // aponta pro próximo passo lógico, igual referências de onboarding
  // (Wix, Shopify) que destacam uma única ação por vez.
  const nextKey = PROGRESS_STEPS.find((s) => !done[s.key])?.key;

  return (
    <div className="mt-5 rounded-[24px] border border-divider bg-surface-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold">Deixe seu Orbibox completo</p>
        <span className="text-[13px] font-semibold text-text-secondary">{pct}%</span>
      </div>
      <p className="mt-0.5 text-[13px] text-text-tertiary">Quanto mais completo, mais seu Orbibox vende.</p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-soft">
        <div className="h-full rounded-full orbi-gradient transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 flex flex-col divide-y divide-divider">
        {PROGRESS_STEPS.map((step) => {
          const feito = done[step.key];
          const cfg = STEP_ICONS[step.key];
          const recomendado = !feito && step.key === nextKey;
          return (
            <Link
              key={step.key}
              href={step.href}
              className={`flex items-center gap-3 py-3 active:opacity-60 ${feito ? "opacity-55" : ""}`}
            >
              {/* Radio de conclusão */}
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${feito ? "orbi-gradient" : "border-2 border-divider"}`}>
                {feito && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111318" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>

              {/* Ícone colorido do passo, estilo referência */}
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={cfg.bg === "orbi-gradient" ? undefined : { backgroundColor: cfg.bg, color: cfg.fg }}
              >
                {cfg.bg === "orbi-gradient" ? (
                  <span className="orbi-gradient flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: cfg.fg }}>
                    {cfg.icon}
                  </span>
                ) : (
                  cfg.icon
                )}
              </span>

              <span className={`flex-1 text-[14px] ${feito ? "text-text-secondary line-through" : "font-medium"}`}>{step.label}</span>

              {recomendado ? (
                <span className="orbi-gradient shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-on-background">
                  Recomendado
                </span>
              ) : !feito ? (
                <span className="shrink-0 text-[13px] text-text-tertiary">›</span>
              ) : null}
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
