"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const CONFETTI_COLORS = ["#FF6A4D", "#FF2E7E", "#B7F34A", "#6EE7D8", "#4453D6", "#FBBC05"];

export function ReferralCelebration({ id, title, body }: { id: string; title: string; body: string }) {
  const [open, setOpen] = useState(true);
  // Confete gerado uma vez, no initializer do estado (roda só na montagem).
  const [confetti] = useState(() =>
    Array.from({ length: 60 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.4 + Math.random() * 1.8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + Math.random() * 7,
      rotate: Math.random() * 360,
    }))
  );

  async function fechar() {
    setOpen(false);
    try {
      const supabase = createClient();
      await supabase.from("notifications").update({ seen_at: new Date().toISOString() }).eq("id", id);
    } catch {
      /* silencioso */
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-on-background/55 p-6 backdrop-blur-sm">
      {/* Confete caindo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="absolute top-[-8%] block rounded-[2px]"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size * 1.4,
              backgroundColor: c.color,
              transform: `rotate(${c.rotate}deg)`,
              animation: `confettiFall ${c.duration}s linear ${c.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-[360px] rounded-[30px] bg-surface-white p-7 text-center shadow-[0_24px_70px_rgba(17,19,24,0.3)]">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span aria-hidden className="absolute inset-0 rounded-full bg-[#FF3B6E] opacity-30 blur-xl" />
          <span className="relative text-[52px]">🎉</span>
        </div>
        <p className="mt-4 font-[family-name:var(--font-manrope)] text-[24px] font-bold leading-tight">{title}</p>
        <p className="mt-2.5 text-[14px] leading-relaxed text-text-secondary">{body}</p>

        <Link
          href="/admin/indique"
          onClick={fechar}
          className="orbi-gradient mt-6 block rounded-full py-3.5 text-[15px] font-bold text-on-background"
        >
          Indicar mais amigos
        </Link>
        <button onClick={fechar} className="mt-3 text-[14px] font-medium text-text-tertiary">
          Fechar
        </button>
      </div>
    </div>,
    document.body
  );
}
