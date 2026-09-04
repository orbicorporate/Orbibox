// Vocabulário compartilhado da vitrine — usado no construtor (admin) e na vitrine pública.

export type BoxSize = "destaque" | "largo" | "medio" | "alto";
export type BoxStyle = "cor" | "foto";

export const SIZE_LABEL: Record<BoxSize, string> = {
  destaque: "Destaque",
  largo: "Largo",
  medio: "Médio",
  alto: "Alto",
};

// Classes de grade por formato (grade de 2 colunas).
export const SIZE_CLASS: Record<BoxSize, string> = {
  destaque: "col-span-2 min-h-[190px]",
  largo: "col-span-2 min-h-[110px]",
  medio: "col-span-1 min-h-[150px]",
  alto: "col-span-1 row-span-2 min-h-[240px]",
};

// A foto de capa preenche o box — então ela segue o formato do box, não uma
// escolha própria. Largo e Destaque são baixinhos (paisagem), Alto é bem
// vertical (retrato), Médio fica perto de quadrado. Compartilhado entre o
// editor (admin) e a página pública, pra capa nunca ficar diferente dos dois lados.
export const COVER_RATIO_BY_SIZE: Record<BoxSize, "quadrado" | "retrato" | "paisagem"> = {
  destaque: "paisagem",
  largo: "paisagem",
  medio: "quadrado",
  alto: "retrato",
};

type Swatch = { bg: string; fg: string; label: string };

// Paletas do editor de box, em grupos. "Padrão" é a original (neutros + Orbi).
// As quatro novas são curadoria fixa; "Marca" (fora daqui, ver colorOf) é
// montada em tempo real com as cores que a Orbi definiu no DNA da marca.
export const PALETTE_GROUPS: { name: string; colors: Record<string, Swatch> }[] = [
  {
    name: "Padrão",
    colors: {
      neutro: { bg: "#F1EFE8", fg: "#2C2C2A", label: "Neutro" },
      claro: { bg: "#FFFFFF", fg: "#111318", label: "Claro" },
      escuro: { bg: "#111318", fg: "#F7F7F4", label: "Escuro" },
      verde: { bg: "#EAF3DE", fg: "#173404", label: "Verde" },
      teal: { bg: "#E1F5EE", fg: "#04342C", label: "Teal" },
      coral: { bg: "#FAECE7", fg: "#4A1B0C", label: "Coral" },
      azul: { bg: "#E6F1FB", fg: "#042C53", label: "Azul" },
    },
  },
  {
    name: "Premium",
    colors: {
      "premium-onix": { bg: "#18140F", fg: "#F0E6CE", label: "Ônix" },
      "premium-champagne": { bg: "#F1E4C3", fg: "#4A3B12", label: "Champagne" },
      "premium-bordo": { bg: "#3B0D14", fg: "#F5D9DE", label: "Bordô" },
      "premium-platina": { bg: "#E7E4DC", fg: "#2B2A26", label: "Platina" },
    },
  },
  {
    name: "Luxury",
    colors: {
      "luxury-esmeralda": { bg: "#0E2B22", fg: "#CFF3E4", label: "Esmeralda" },
      "luxury-marfim": { bg: "#FAF6EE", fg: "#3A3527", label: "Marfim" },
      "luxury-dourado": { bg: "#F4E3B2", fg: "#6B4E05", label: "Dourado" },
      "luxury-grafite": { bg: "#23211D", fg: "#EDEAE2", label: "Grafite" },
    },
  },
  {
    name: "Yung",
    colors: {
      "yung-rosa": { bg: "#FFD6EC", fg: "#7A0E52", label: "Rosa choque" },
      "yung-lima": { bg: "#E8FF9E", fg: "#3B4B00", label: "Lima" },
      "yung-lilas": { bg: "#E7DBFF", fg: "#4B2E8C", label: "Lilás" },
      "yung-ciano": { bg: "#CFFBFF", fg: "#044B52", label: "Ciano" },
    },
  },
  {
    name: "Energy",
    colors: {
      "energy-laranja": { bg: "#FFE1C2", fg: "#7A3300", label: "Laranja" },
      "energy-vermelho": { bg: "#FFD9D6", fg: "#7A140E", label: "Vermelho" },
      "energy-amarelo": { bg: "#FFF3B0", fg: "#6B5200", label: "Amarelo" },
      "energy-magenta": { bg: "#FFD3EE", fg: "#7A0A52", label: "Magenta" },
    },
  },
];

// Todas as cores das paletas fixas, achatadas — usado pra resolver por chave.
export const BOX_COLORS: Record<string, Swatch> = Object.assign(
  {},
  ...PALETTE_GROUPS.map((g) => g.colors)
);

/** Preto ou branco, o que der mais contraste sobre o hex informado. */
function contrastFg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111318" : "#FFFFFF";
}

/**
 * Resolve a cor de um box. Aceita tanto uma chave de paleta fixa ("verde",
 * "premium-onix"...) quanto um hex literal ("#1C1B1C") — é assim que a
 * "Paleta da marca" funciona: ao escolher, salvamos o hex direto, já que
 * essas cores são únicas de cada negócio e não existem como chave fixa.
 */
export function colorOf(key: string | null | undefined): Swatch {
  if (!key) return BOX_COLORS.neutro;
  if (BOX_COLORS[key]) return BOX_COLORS[key];
  if (/^#[0-9a-fA-F]{6}$/.test(key)) {
    return { bg: key, fg: contrastFg(key), label: "Cor da marca" };
  }
  return BOX_COLORS.neutro;
}

export function sizeOf(key: string | null | undefined): BoxSize {
  return (["destaque", "largo", "medio", "alto"] as const).includes(key as BoxSize)
    ? (key as BoxSize)
    : "medio";
}

// Agrupa itens em seções por categoria, preservando a ordem de position.
export function groupByCategory<T extends { brand_label: string | null; position: number }>(items: T[]) {
  const ordered = [...items].sort((a, b) => a.position - b.position);
  const map = new Map<string, T[]>();
  for (const it of ordered) {
    const key = it.brand_label?.trim() || "Destaques";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }
  return [...map.entries()].map(([name, list]) => ({ name, items: list }));
}

export type PriceType = "exato" | "a_partir" | "faixa" | "media";

export const PRICE_TYPE_LABEL: Record<PriceType, string> = {
  exato: "Preço exato",
  a_partir: "A partir de",
  faixa: "Faixa de preço",
  media: "Média de",
};

function brl(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

/** Formata o preço de um item conforme o tipo escolhido — mesma regra usada
 * na Vitrine, na grade pública e na página do item, pra nunca ficar diferente. */
export function formatPrice(item: { price: number | null; price_type?: string | null; price_max?: number | null }): string | null {
  if (item.price == null) return null;
  const tipo = (item.price_type as PriceType) || "exato";
  switch (tipo) {
    case "a_partir":
      return `A partir de ${brl(item.price)}`;
    case "media":
      return `Média de ${brl(item.price)}`;
    case "faixa":
      return item.price_max != null ? `${brl(item.price)} – ${brl(item.price_max)}` : brl(item.price);
    default:
      return brl(item.price);
  }
}
