// A Orbi só empurra o Cardápio para quem parece vender comida ou bebida.
// Quem não vende (moda, beleza, serviços...) não vê o cardápio como foco.
const TERMOS = /\b(prato|pratos|pizza|pizzaria|lanche|lanches|hamb[uú]rguer|burger|a[cç]a[ií]|sorvete|sorveteria|picol[eé]|doce|doces|bolo|bolos|torta|salgado|salgados|marmita|bebida|bebidas|suco|caf[eé]|restaurante|card[aá]pio|sobremesa|sobremesas|churrasco|por[cç][aã]o|padaria|p[aã]o|p[aã]es|comida|almo[cç]o|jantar|ceia|confeitaria|brigadeiro|pastel|sushi|massa|massas|refei[cç][aã]o)\b/i;

export function pareceGastronomico(categorias: string[] | null | undefined, titulos: string[]): boolean {
  if ((categorias ?? []).some((c) => TERMOS.test(c))) return true;
  return titulos.filter((t) => TERMOS.test(t)).length >= 2;
}
