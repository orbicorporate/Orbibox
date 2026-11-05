"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

/**
 * Convite discreto para quem está olhando um Orbibox: depois de dois toques seguidos na página
 * (fora de botões, links e campos), desce do topo uma janelinha colorida perguntando se gostou
 * e convidando a criar um Orbibox para a própria marca. Some sozinha em alguns segundos.
 */
export function ConviteCriarOrbibox({ ativo }: { ativo: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const saida = useRef<ReturnType<typeof setTimeout> | null>(null);
  const some = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fechar() {
    if (some.current) clearTimeout(some.current);
    setSaindo(true);
    saida.current = setTimeout(() => { setAberto(false); setSaindo(false); }, 320);
  }

  useEffect(() => {
    if (!ativo) return;
    let ultimo: { t: number; x: number; y: number } | null = null;
    const ouvir = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const alvo = e.target as Element | null;
      if (alvo?.closest("a, button, input, textarea, select, label, [role=button], [role=radio], [role=switch], [data-sem-convite]")) { ultimo = null; return; }
      const agora = Date.now();
      if (ultimo && agora - ultimo.t < 350 && Math.hypot(e.clientX - ultimo.x, e.clientY - ultimo.y) < 40) {
        ultimo = null;
        if (saida.current) clearTimeout(saida.current);
        if (some.current) clearTimeout(some.current);
        setSaindo(false);
        setAberto(true);
        some.current = setTimeout(() => {
          setSaindo(true);
          saida.current = setTimeout(() => { setAberto(false); setSaindo(false); }, 320);
        }, 8000);
        return;
      }
      ultimo = { t: agora, x: e.clientX, y: e.clientY };
    };
    document.addEventListener("pointerup", ouvir);
    return () => {
      document.removeEventListener("pointerup", ouvir);
      if (saida.current) clearTimeout(saida.current);
      if (some.current) clearTimeout(some.current);
    };
  }, [ativo]);

  if (!aberto) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-[max(12px,env(safe-area-inset-top))]">
      <div role="status" className={`${saindo ? "convite-sobe" : "convite-desce"} pointer-events-auto relative w-full max-w-[400px]`}>
        <Link
          href="/signup"
          className="convite-brilho flex items-center gap-3 rounded-full py-2.5 pl-3 pr-12 text-on-background shadow-[0_14px_34px_-12px_rgba(17,19,24,0.35)] ring-1 ring-white/70 active:scale-[0.98]"
        >
          <span className="convite-coracao grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-[#E0457B]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium leading-tight">Gostou do Orbibox?</span>
            <span className="mt-0.5 block text-[13px] leading-tight text-on-background/75">Crie um pra sua marca.</span>
          </span>
        </Link>
        <button type="button" onClick={fechar} aria-label="Fechar aviso" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/70 text-on-background/70 active:scale-90">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}
