"use client";

import { useEffect, useState, useCallback } from "react";

export type MiniTourStep = { id: string; title: string; body: string };

type Rect = { top: number; left: number; width: number; height: number };

export function MiniTour({
  steps,
  active,
  onDone,
}: {
  steps: MiniTourStep[];
  active: boolean;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (!active) setIndex(0);
  }
  const step = active ? steps[index] : null;

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.id}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    if (!step) return;
    let tries = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(measure, 260);
        return;
      }
      tries += 1;
      if (tries < 20) window.setTimeout(tick, 100);
    };
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  useEffect(() => {
    if (!step) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  if (!active || !step) return null;

  const isLast = index === steps.length - 1;

  function next() {
    if (isLast) {
      onDone();
      return;
    }
    setIndex((i) => i + 1);
  }

  const cardTop = rect
    ? Math.min(Math.max(rect.top + rect.height + 14, 16), window.innerHeight - 200)
    : undefined;

  return (
    <div className="fixed inset-0 z-[60]">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-[18px] transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(11,12,16,0.68), 0 0 0 3px #B7F34A, 0 0 28px 5px rgba(183,243,74,0.5)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[#0B0C10]/68" />
      )}

      <div
        className="fixed left-1/2 z-10 w-[86vw] max-w-[340px] -translate-x-1/2 rounded-[22px] bg-surface-white p-4.5 shadow-[0_12px_36px_rgba(0,0,0,0.25)]"
        style={cardTop !== undefined ? { top: cardTop } : { top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <p className="text-[11px] font-medium text-text-tertiary">
          {index + 1} de {steps.length}
        </p>
        <p className="mt-1 font-[family-name:var(--font-manrope)] text-[16px] font-medium tracking-[-0.01em]">
          {step.title}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={onDone} className="text-[12px] text-text-tertiary">
            Pular
          </button>
          <button onClick={next} className="rounded-full bg-button-primary px-4 py-2 text-[12px] font-medium text-white">
            {isLast ? "Entendi" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
