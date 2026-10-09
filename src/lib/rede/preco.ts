/**
 * Preço quando a marca paga todas as lojas da rede.
 * Regra: a partir de 21 lojas, 10% de desconto em todas; a partir de 101, 20%.
 * (Prévia: valores e regra ainda em validação.)
 */
export type PlanoRede = "titanio" | "niobio";

export const PRECO_MENSAL: Record<PlanoRede, number> = { titanio: 79, niobio: 109 };
export const NOME_PLANO: Record<PlanoRede, string> = { titanio: "Titânio", niobio: "Nióbio" };

export const FAIXAS = [
  { de: 1, ate: 20, desconto: 0 },
  { de: 21, ate: 100, desconto: 10 },
  { de: 101, ate: null as number | null, desconto: 20 },
];

export function descontoPara(lojas: number): number {
  if (lojas > 100) return 20;
  if (lojas > 20) return 10;
  return 0;
}

export function calcularRede(lojas: number, plano: PlanoRede) {
  const base = PRECO_MENSAL[plano];
  const desconto = descontoPara(lojas);
  const porLoja = base * (1 - desconto / 100);
  const total = porLoja * lojas;
  const semDesconto = base * lojas;
  return { base, desconto, porLoja, total, economia: semDesconto - total };
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 2 });
