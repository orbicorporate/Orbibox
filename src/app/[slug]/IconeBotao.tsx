import { IconeLinha, ehIconeLinha } from "@/components/ui/IconesLinha";

/**
 * Ícone pequeno de botão (miniatura estática). Os ícones animados do app são
 * guardados por chave ("__pin__", "__wadisc__"...), e jogar a chave como texto
 * mostrava "_pin_" na tela. Aqui cada chave vira um ícone de linha simples;
 * qualquer outro valor (símbolo ou emoji) aparece como texto, como antes.
 */
const TRACOS: Record<string, React.ReactNode> = {
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  chat: <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.4-4.4A7.5 7.5 0 1 1 20 11.5z" />,
  estrela: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z" />,
  brilho: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.5l5.1-1.9z" />,
  check: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.3l2.5 2.5 4.6-5" /></>,
  link: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  dinheiro: <><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.4.7-2.4 1.8 0 2.5 5 1.1 5 3.7 0 1.1-1.1 1.8-2.6 1.8-1.1 0-2-.4-2.6-1.2M12 6.5V8m0 8v1.5" /></>,
  percent: <><path d="M18 6L6 18" /><circle cx="8" cy="8" r="2" /><circle cx="16" cy="16" r="2" /></>,
  coracao: <path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.7a3.9 3.9 0 0 1 7 2.2c0 5.3-7 9.6-7 9.6z" />,
  presente: <><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M3.5 9h17M12 9v11M12 9c-1.5-4-5-4-5-1.8 0 1.2 1.4 1.8 5 1.8zM12 9c1.5-4 5-4 5-1.8 0 1.2-1.4 1.8-5 1.8z" /></>,
  rosto: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14c.9 1.3 2 2 3.5 2s2.6-.7 3.5-2M9 9.8v.4M15 9.8v.4" /></>,
  pata: <><circle cx="7.5" cy="10" r="1.6" /><circle cx="11" cy="6.8" r="1.6" /><circle cx="15.5" cy="7.5" r="1.6" /><circle cx="18" cy="11.5" r="1.6" /><path d="M8 17c0-3 2.2-5 4.5-5s4.5 2 4 4.7c-.3 1.6-1.6 2.3-3 2-1-.2-1.4-.5-2-.5s-1 .3-2 .5c-1.4.3-2.5-.4-2.5-1.700z" /></>,
  folha: <path d="M5 19c0-8 5-13.5 14-14 0 9-5 14-13 14M5 19c3-4 6-6.5 9-8" />,
  ingresso: <><path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.500h13A1.5 1.5 0 0 1 20 8.500V10a2 2 0 0 0 0 4v1.500a1.5 1.5 0 0 1-1.5 1.500h-13A1.5 1.5 0 0 1 4 15.500V14a2 2 0 0 0 0-4z" /><path d="M14 7.500v9" strokeDasharray="1.5 2" /></>,
};

const POR_CHAVE: Record<string, keyof typeof TRACOS> = {
  __none__: "link",
  __pin__: "pin",
  __wadisc__: "chat",
  __orbwa__: "chat",
  __google__: "estrela",
  __orb__: "brilho",
  __orbcheck__: "check",
  __money__: "dinheiro",
  __percent__: "percent",
  __arrow__: "link",
  __heart__: "coracao",
  __gift__: "presente",
  __happy__: "rosto",
  __dog__: "pata",
  __leaf__: "folha",
  __ticket__: "ingresso",
};

export function IconeBotao({ icone, size = 20 }: { icone: string; size?: number }) {
  if (ehIconeLinha(icone)) return <IconeLinha chave={icone} size={size} />;
  const chave = POR_CHAVE[icone] ?? (icone.startsWith("__") ? "link" : null);
  if (!chave) return <>{icone}</>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {TRACOS[chave]}
    </svg>
  );
}
