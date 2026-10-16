import type { ReactNode } from "react";

/**
 * Cada categoria do cardápio ganha um ícone de linha delicado e uma cor suave,
 * escolhidos pelo nome (Bebidas quentes, Sobremesas, Lanches...). Sem palavra
 * conhecida, usa o prato genérico com a cor neutra da marca.
 */
type Chave = "xicara" | "copo" | "bolo" | "sorvete" | "burger" | "pizza" | "folha" | "prato";

const TRACOS: Record<Chave, ReactNode> = {
  xicara: <><path d="M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V9z" /><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8 3.5c-.8 1 .8 1.6 0 2.8M12 3.5c-.8 1 .8 1.6 0 2.8" /></>,
  copo: <><path d="M6.5 4h11l-1.3 15a1.5 1.5 0 0 1-1.5 1.4H9.3a1.5 1.5 0 0 1-1.5-1.4L6.5 4z" /><path d="M7 9h10" /><path d="M13.5 4l1.5-2" /></>,
  bolo: <><path d="M5 20h14v-6H5v6z" /><path d="M6.5 14v-2.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5V14" /><path d="M12 10V7.5M12 5.2c.9.6.9 1.7 0 2.3-.9-.6-.9-1.7 0-2.3z" /></>,
  sorvete: <><path d="M8 11a4 4 0 1 1 8 0" /><path d="M7.5 11h9L12 21l-4.5-10z" /></>,
  burger: <><path d="M4.5 11a7.5 7.5 0 0 1 15 0h-15z" /><path d="M4.5 14.5h15" /><path d="M5 17.5h14a0 0 0 0 1 0 0 2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /></>,
  pizza: <><path d="M12 20.5L3.5 6.5a17 17 0 0 1 17 0L12 20.5z" /><circle cx="10.5" cy="9.5" r="1" /><circle cx="14" cy="11.5" r="1" /><circle cx="11.5" cy="14.5" r=".9" /></>,
  folha: <><path d="M5 19c0-8 5-13.5 14-14 0 9-5 14-13 14" /><path d="M5 19c3-4 6-6.5 9-8" /></>,
  prato: <><path d="M8 3.5v7a2 2 0 0 0 2 2v8M6 3.5v5M10 3.5v5" /><path d="M16.5 20.5v-17c-2 1.5-3 4-3 7 0 2 1 3 3 3.5" /></>,
};

type Estilo = { chave: Chave; cor: string };

const REGRAS: { re: RegExp; chave: Chave; cor: string }[] = [
  { re: /(quente|caf[eé]|cappu|expresso|chocolate quente|ch[aá])/i, chave: "xicara", cor: "#B7791F" },
  { re: /(milk|shake|sorvete|gelad|a[cç]a[ií]|picol[eé]|casquinha|frapp)/i, chave: "sorvete", cor: "#BE185D" },
  { re: /(sobremesa|doce|bolo|torta|petit|gateau|brigadeiro|fundue|fondue|confeit|chocolate)/i, chave: "bolo", cor: "#C2410C" },
  { re: /(bebida|suco|drink|cerveja|vinho|refri|coquet|caipir|[aá]gua|limonada|smoothie)/i, chave: "copo", cor: "#0F766E" },
  { re: /(lanche|burger|hamb|hot ?dog|sandu|x-)/i, chave: "burger", cor: "#B45309" },
  { re: /(pizza|massa|macarr|lasanha|italian)/i, chave: "pizza", cor: "#B91C1C" },
  { re: /(salada|vegan|vegetar|saud[aá]vel|fit|natural)/i, chave: "folha", cor: "#2F7D4F" },
];

export function estiloCategoria(nome: string): Estilo {
  for (const r of REGRAS) if (r.re.test(nome)) return { chave: r.chave, cor: r.cor };
  return { chave: "prato", cor: "#5B5F6B" };
}

export function IconeCategoria({ chave, size = 20 }: { chave: Chave; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {TRACOS[chave]}
    </svg>
  );
}
