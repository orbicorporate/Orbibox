"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

export function OrbiFloatingButton({ onOpen, orbiColors, agentName }: { onOpen: () => void; orbiColors: string[] | null; agentName: string }) {
  const [showHint, setShowHint] = useState(false);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = localStorage.getItem("orbi_hint_seen") === "1";
    } catch {
      // localStorage indisponível (modo privado): mostra mesmo assim uma vez.
    }
    if (alreadyShown) return;
    const t = setTimeout(() => setShowHint(true), 1200);
    const t2 = setTimeout(() => {
      setShowHint(false);
      try { localStorage.setItem("orbi_hint_seen", "1"); } catch { /* ignora */ }
    }, 7000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  function abrir() {
    setShowHint(false);
    try { localStorage.setItem("orbi_hint_seen", "1"); } catch { /* ignora */ }
    onOpen();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-5 right-4 z-[9999] flex flex-col items-end gap-2">
      {showHint && (
        <button
          onClick={abrir}
          className="pointer-events-auto max-w-[220px] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-neutral-900 shadow-[0_6px_24px_rgba(0,0,0,0.16)] animate-[fadeInUp_0.3s_ease]"
        >
          ✦ Oi! Sou a {agentName}. Posso ajudar?
        </button>
      )}
      <button
        onClick={abrir}
        aria-label={`Conversar com a ${agentName}`}
        className="pointer-events-auto relative flex h-16 w-16 items-center justify-center transition-transform active:scale-95"
        style={{ filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.3))" }}
      >
        {/* Halo branco leve e contido atrás, só pra destacar do fundo */}
        <span className="absolute inset-2 rounded-full bg-black/40 blur-md" />
        <OrbiParticleSphere size={64} colors={orbiColors ?? undefined} vivid className="relative rounded-full" />
      </button>
    </div>,
    document.body
  );
}
