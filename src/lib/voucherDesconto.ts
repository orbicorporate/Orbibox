// O benefício de um voucher pode ser porcentagem, um valor em reais ou um
// brinde (item/benefício sem número, descrito no título). Todos os textos que
// mostram o desconto passam por aqui, pra um brinde nunca virar "R$ 0 off".

type D = { discount_type?: string | null; discount_value?: number | null };

export function descontoCurto(v: D): string {
  if (v.discount_type === "gift") return "Brinde";
  return v.discount_type === "percent" ? `${v.discount_value}% off` : `R$ ${v.discount_value} off`;
}

export function descontoLongo(v: D): string {
  if (v.discount_type === "gift") return "Brinde";
  return v.discount_type === "percent" ? `${v.discount_value}% de desconto` : `R$ ${v.discount_value} de desconto`;
}

export function descontoGrande(v: D): string {
  if (v.discount_type === "gift") return "BRINDE";
  return v.discount_type === "percent" ? `${v.discount_value}% OFF` : `R$ ${v.discount_value} OFF`;
}
