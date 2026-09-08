"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TOUR_STEPS } from "./tourSteps";

type Rect = { top: number; left: number; width: number; height: number };

export function TourOverlay({ businessId }: { businessId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const stepParam = searchParams.get("tour");
  const stepIndex = stepParam !== null ? parseInt(stepParam, 10) : null;
  const step = stepIndex !== null ? TOUR_STEPS[stepIndex] : null;

  const [rect, setRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    if (!step) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.id}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Espera o elemento-alvo montar (a página pode ainda estar carregando
  // dados do servidor), tentando por até ~2.5s antes de desistir do destaque
  // pontual e mostrar só o cartão centralizado.
  useEffect(() => {
    if (!step) return;
    let tries = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(measure, 280);
        return;
      }
      tries += 1;
      if (tries < 25) window.setTimeout(tick, 100);
    };
    tick();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, pathname]);

  useEffect(() => {
    if (!step) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  if (!step || stepIndex === null) return null;

  const isLast = stepIndex === TOUR_STEPS.length - 1;

  async function finish() {
    await supabase.from("businesses").update({ tour_completed_at: new Date().toISOString() }).eq("id", businessId);
    router.push("/admin");
  }

  function next() {
    const nextIndex = stepIndex! + 1;
    const nextStep = TOUR_STEPS[nextIndex];
    if (!nextStep) return finish();
    router.push(`${nextStep.page}?tour=${nextIndex}`);
  }

  // Posição do cartão: perto do alvo quando ele foi encontrado, senão
  // centralizado na tela — nunca deixa o usuário sem explicação nenhuma.
  const cardTop = rect
    ? Math.min(Math.max(rect.top + rect.height + 16, 16), window.innerHeight - 220)
    : undefined;

  return (
    <div className="fixed inset-0 z-50">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-[20px] transition-all duration-300"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: "0 0 0 9999px rgba(11,12,16,0.72), 0 0 0 3px #B7F34A, 0 0 32px 6px rgba(183,243,74,0.55)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[#0B0C10]/72" />
      )}

      <div
        className="fixed left-1/2 z-10 w-[88vw] max-w-[360px] -translate-x-1/2 rounded-[24px] bg-surface-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
        style={cardTop !== undefined ? { top: cardTop } : { top: "50%", transform: "translate(-50%, -50%)" }}
      >
        <p className="text-[12px] font-medium text-text-tertiary">
          {stepIndex + 1} de {TOUR_STEPS.length}
        </p>
        <p className="mt-1 font-[family-name:var(--font-manrope)] text-[18px] font-medium tracking-[-0.01em]">
          {step.title}
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={finish} className="text-[13px] text-text-tertiary">
            Pular tour
          </button>
          <button
            onClick={next}
            className="rounded-full bg-button-primary px-5 py-2.5 text-[13px] font-medium text-white"
          >
            {isLast ? "Concluir" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
