"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const CHAVE = "orbibox_instalar_dispensado";

/**
 * Convite para instalar o Orbibox na tela inicial do celular. Só aparece no navegador (não no app já
 * instalado). No Android abre o instalador do sistema; no iPhone mostra o passo a passo do Safari.
 */
export function InstalarAppCard() {
  const [pronto, setPronto] = useState(false);
  const [ios, setIos] = useState(false);
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [passos, setPassos] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE)) return;
    } catch {}
    const instalado =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (instalado) return;
    const ua = navigator.userAgent;
    const ehIos = /iphone|ipad|ipod/i.test(ua);
    const ehMovel = ehIos || /android/i.test(ua);
    if (!ehMovel) return;
    const t = setTimeout(() => { setIos(ehIos); setPronto(true); }, 0);
    function aoPerguntar(e: Event) {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    }
    window.addEventListener("beforeinstallprompt", aoPerguntar);
    return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", aoPerguntar); };
  }, []);

  function dispensar() {
    try { localStorage.setItem(CHAVE, "1"); } catch {}
    setPronto(false);
  }

  async function instalar() {
    if (evento) {
      await evento.prompt();
      const r = await evento.userChoice;
      if (r.outcome === "accepted") dispensar();
      return;
    }
    setPassos((v) => !v);
  }

  if (!pronto) return null;

  return (
    <section className="mt-8 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.05]">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-on-background">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M12 8v6m0 0l-2.5-2.5M12 14l2.5-2.5" /></svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium leading-tight">Tenha o Orbibox como app no celular</h2>
          <p className="mt-1 text-[13px] leading-snug text-text-secondary">
            Fica na tela inicial com o seu ícone, abre em tela cheia e você gerencia a marca em um toque.
          </p>
        </div>
      </div>
      {passos && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] leading-snug text-text-secondary">
          {ios ? (
            <>
              <li>Abra esta página no Safari.</li>
              <li>Toque no botão de compartilhar (o quadrado com a seta pra cima).</li>
              <li>Escolha Adicionar à Tela de Início e confirme.</li>
            </>
          ) : (
            <>
              <li>Toque no menu do navegador (os três pontinhos).</li>
              <li>Escolha Instalar app ou Adicionar à tela inicial.</li>
            </>
          )}
        </ol>
      )}
      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={instalar}
          className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-full bg-on-background px-5 text-[14px] font-medium text-white transition-transform active:scale-[0.98]"
        >
          {evento ? "Instalar agora" : passos ? "Ocultar passos" : "Ver como instalar"}
        </button>
        <button
          type="button"
          onClick={dispensar}
          className="inline-flex min-h-[46px] items-center justify-center rounded-full px-4 text-[14px] text-text-secondary"
        >
          Agora não
        </button>
      </div>
    </section>
  );
}
