"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

export function OrbiFloatingButton({ onOpen, orbiColors, agentName }: { onOpen: () => void; orbiColors: string[] | null; agentName: string }) {
  const [showHint, setShowHint] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Effect dedicado só pra marcar que montou no cliente (necessário pro portal).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Balãozinho "Posso ajudar?" só na primeira visita — guarda no
    // localStorage do visitante pra não repetir toda vez.
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

  // Portal pro body: escapa do overflow-hidden e do contexto de empilhamento
  // do <main>, garantindo que o botão fixo apareça sempre por cima de tudo.
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
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_6px_24px_rgba(0,0,0,0.22)] ring-1 ring-black/5 transition-transform active:scale-95"
      >
        <OrbiParticleSphere size={52} colors={orbiColors ?? undefined} className="rounded-full" />
      </button>
    </div>,
    document.body
  );
}
