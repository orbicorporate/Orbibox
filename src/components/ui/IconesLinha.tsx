/**
 * Ícones de linha minimalistas (traço fino, sem preenchimento), como alternativa aos emojis.
 * Ficam guardados por chave "__l_nome__" e herdam a cor do texto (currentColor), então
 * combinam com qualquer cor de botão. Traços no estilo Lucide (licença ISC).
 */
import type { ReactNode } from "react";

const T: Record<string, { rotulo: string; d: ReactNode }> = {
  chama: { rotulo: "Chama", d: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /> },
  garfo: { rotulo: "Garfo", d: <path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v8M7 11v10" /> },
  faca: { rotulo: "Faca", d: <path d="M17 21V3c-3 1-5 5-5 9 0 1.5 1 2.5 2.5 2.5H17" /> },
  garfofaca: { rotulo: "Garfo e faca", d: <path d="M3 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6a2 2 0 0 0 2 2h3zm0 0v7" /> },
  cafe: { rotulo: "Café", d: <path d="M6 2v2M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1zM17 11h1a3 3 0 0 1 0 6h-1" /> },
  pizza: { rotulo: "Pizza", d: <path d="M12 3 3 19c5.5 3 12.5 3 18 0zM4.5 8.5a14 14 0 0 1 15 0M9 11.5h.01M14 13.5h.01M11.5 16.5h.01" /> },
  hamburguer: { rotulo: "Hambúrguer", d: <path d="M4 11a8 8 0 0 1 16 0zM3 15h18M5 18.5h14a1 1 0 0 0 1-1V15H4v2.5a1 1 0 0 0 1 1z" /> },
  bolo: { rotulo: "Bolo", d: <path d="M4 20h16M5 20v-7h14v7M5 13c1.5 0 1.5-1.5 3-1.5s1.5 1.5 3 1.5 1.5-1.5 3-1.5 1.5 1.5 3 1.5M12 11V8.5M12 6v.01" /> },
  sorvete: { rotulo: "Sorvete", d: <path d="M7 11a5 5 0 0 1 10 0zM7 11l5 11 5-11" /> },
  vinho: { rotulo: "Vinho", d: <path d="M8 22h8M7 10h10M12 15v7M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5z" /> },
  cerveja: { rotulo: "Cerveja", d: <path d="M5 8h10v12H5zM15 11h2.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H15M5 8c0-1.5 1-2.5 2.5-2.5 1 0 1.5.5 2.5.5s1.5-.5 2.5-.5C14 5.5 15 6.5 15 8" /> },
  sacola: { rotulo: "Sacola", d: <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" /> },
  camisa: { rotulo: "Camiseta", d: <path d="M8 3 3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z" /> },
  tesoura: { rotulo: "Tesoura", d: <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" /></> },
  presente: { rotulo: "Presente", d: <><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M3.5 9h17M12 9v11M12 9c-1.5-4-5-4-5-1.8 0 1.2 1.4 1.8 5 1.8zM12 9c1.5-4 5-4 5-1.8 0 1.2-1.4 1.8-5 1.8z" /></> },
  etiqueta: { rotulo: "Etiqueta", d: <><path d="M3 11V4h7l11 11-7 7z" /><path d="M7.5 8.5h.01" /></> },
  ingresso: { rotulo: "Ingresso", d: <><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4z" /><path d="M14 7.5v9" strokeDasharray="1.5 2" /></> },
  carteira: { rotulo: "Cartão", d: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></> },
  dinheiro: { rotulo: "Dinheiro", d: <><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.4.7-2.4 1.8 0 2.5 5 1.1 5 3.7 0 1.1-1.1 1.8-2.6 1.8-1.1 0-2-.4-2.6-1.2M12 6.5V8m0 8v1.5" /></> },
  pin: { rotulo: "Local", d: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></> },
  telefone: { rotulo: "Telefone", d: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /> },
  chat: { rotulo: "Conversa", d: <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.4-4.4A7.5 7.5 0 1 1 20 11.5z" /> },
  email: { rotulo: "E-mail", d: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> },
  calendario: { rotulo: "Agenda", d: <><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M8 2.5v4M16 2.5v4M3 10h18" /></> },
  relogio: { rotulo: "Horário", d: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></> },
  camera: { rotulo: "Foto", d: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" /><circle cx="12" cy="13" r="3.2" /></> },
  globo: { rotulo: "Site", d: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" /></> },
  casa: { rotulo: "Casa", d: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> },
  chave: { rotulo: "Chave", d: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="m11 12 9-9M17 6l3 3M14 9l2 2" /></> },
  carro: { rotulo: "Carro", d: <><path d="M3 16v-4l2-5h14l2 5v4zM3 12h18" /><circle cx="7.5" cy="17" r="1.8" /><circle cx="16.5" cy="17" r="1.8" /></> },
  caminhao: { rotulo: "Entrega", d: <><path d="M1.5 6h12v10h-12zM13.5 9h4l3 3v4h-7" /><circle cx="6" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></> },
  caixa: { rotulo: "Pacote", d: <path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" /> },
  halter: { rotulo: "Academia", d: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /> },
  musica: { rotulo: "Música", d: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></> },
  livro: { rotulo: "Livro", d: <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 2h13v-4" /> },
  coracao: { rotulo: "Coração", d: <path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.7a3.9 3.9 0 0 1 7 2.2c0 5.3-7 9.6-7 9.6z" /> },
  estrela: { rotulo: "Estrela", d: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z" /> },
  brilho: { rotulo: "Brilho", d: <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1L5 10.5l5.1-1.9z" /> },
  raio: { rotulo: "Raio", d: <path d="M13 2 4 14h7l-1 8 9-12h-7z" /> },
  sol: { rotulo: "Sol", d: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></> },
  folha: { rotulo: "Folha", d: <path d="M5 19c0-8 5-13.5 14-14 0 9-5 14-13 14M5 19c3-4 6-6.5 9-8" /> },
  pata: { rotulo: "Pet", d: <><circle cx="7.5" cy="10" r="1.6" /><circle cx="11" cy="6.8" r="1.6" /><circle cx="15.5" cy="7.5" r="1.6" /><circle cx="18" cy="11.5" r="1.6" /><path d="M8 17c0-3 2.2-5 4.5-5s4.5 2 4 4.7c-.3 1.6-1.6 2.3-3 2-1-.2-1.4-.5-2-.5s-1 .3-2 .5c-1.4.3-2.5-.4-2.5-1.7z" /></> },
  trofeu: { rotulo: "Troféu", d: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" /> },
  megafone: { rotulo: "Novidade", d: <path d="M3 11v2a1 1 0 0 0 1 1h2l8 4V6L6 10H4a1 1 0 0 0-1 1zM17 9a4 4 0 0 1 0 6" /> },
  seta: { rotulo: "Seta", d: <path d="M5 12h14M13 6l6 6-6 6" /> },
  check: { rotulo: "Check", d: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.3l2.5 2.5 4.6-5" /></> },
};

export const ICONES_LINHA = Object.entries(T).map(([nome, v]) => ({ chave: `__l_${nome}__`, rotulo: v.rotulo }));

export function ehIconeLinha(v: string | null | undefined): boolean {
  return !!v && /^__l_[a-z]+__$/.test(v) && !!T[v.slice(4, -2)];
}

export function IconeLinha({ chave, size = 22, className }: { chave: string; size?: number; className?: string }) {
  const item = T[chave.slice(4, -2)];
  if (!item) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {item.d}
    </svg>
  );
}
