/**
 * Ícones do onboarding no jeito Orbibox: traço branco fino sobre uma bolinha de cor sólida.
 * Nada de emoji, para combinar com o resto do app.
 */
export type NomeIcone =
  | "sacola" | "brilho" | "balao" | "orbita" | "carrinho" | "documento" | "whatsapp" | "agenda"
  | "pino" | "olho" | "ticket" | "telefone" | "grade" | "estrela" | "check" | "paleta";

const TRACOS: Record<NomeIcone, React.ReactNode> = {
  sacola: <><path d="M5.5 8h13l-1 12h-11z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  brilho: <><path d="M12 3.5l1.9 5 5.1 1.9-5.1 1.9-1.9 5-1.9-5L5 10.4l5.1-1.9z" /><path d="M18.5 16v4M16.5 18h4" /></>,
  balao: <><path d="M5 19l1.2-3.6A7.5 7.5 0 1 1 9 18.4z" /><path d="M9 11h.01M12 11h.01M15 11h.01" /></>,
  orbita: <><circle cx="12" cy="12" r="3.2" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-25 12 12)" /></>,
  carrinho: <><path d="M3 4h2.2l2 11h10.6l2-7.5H6.2" /><circle cx="9" cy="19" r="1.2" /><circle cx="17" cy="19" r="1.2" /></>,
  documento: <><rect x="5.5" y="3.5" width="13" height="17" rx="2.5" /><path d="M9 8.5h6M9 12h6M9 15.5h3.5" /></>,
  whatsapp: <><path d="M5 19l1.2-3.6A7.5 7.5 0 1 1 9 18.4z" /><path d="M9.5 9.3c.4 2.1 2.1 3.8 4.2 4.2" /></>,
  agenda: <><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M4 10h16M9 3.5v4M15 3.5v4" /></>,
  pino: <><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  olho: <><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.6" /></>,
  ticket: <><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" /><path d="M14 7.5v9" /></>,
  telefone: <path d="M6 4h3.2l1.8 4.6-2.3 1.4a10.5 10.5 0 0 0 5.3 5.3l1.4-2.3 4.6 1.8V18a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2z" />,
  grade: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  estrela: <path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.6l-5 2.6.9-5.6-4-3.9 5.6-.8z" />,
  check: <path d="M5.5 12.5l4.2 4.2 8.8-9.2" />,
  paleta: <><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.8-1.8 0-1.3-1.1-1.6-1.1-2.8 0-1 .8-1.7 1.8-1.7h2.2a3.8 3.8 0 0 0 3.8-3.8c0-3.8-3.8-6.9-8.5-6.9z" /><circle cx="8" cy="11" r=".9" /><circle cx="11" cy="7.6" r=".9" /><circle cx="15.2" cy="8.2" r=".9" /></>,
};

export function IconeOrbi({ nome, cor, tamanho = 44, traco = 1.8, className = "" }: { nome: NomeIcone; cor: string; tamanho?: number; traco?: number; className?: string }) {
  const svg = Math.round(tamanho * 0.5);
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full text-white ${className}`} style={{ width: tamanho, height: tamanho, backgroundColor: cor }} aria-hidden>
      <svg width={svg} height={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={traco} strokeLinecap="round" strokeLinejoin="round">
        {TRACOS[nome]}
      </svg>
    </span>
  );
}
