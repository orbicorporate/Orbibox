// Converte o que a pessoa digita num campo de preço em número.
// Aceita "12,50", "12.50", "R$ 1.234,56", "1234" e devolve null quando
// não dá pra entender (em vez de NaN, que quebrava o salvamento).
export function parsePreco(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = v.replace(/r\$/gi, "").replace(/\s/g, "").trim();
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.234" sem vírgula é milhar, não decimal
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

// Mostra o número no jeito brasileiro dentro do campo: 12.5 vira "12,50".
export function precoParaCampo(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");
}
