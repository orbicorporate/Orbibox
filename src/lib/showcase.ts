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

// Paleta de boxes: [fundo, texto]. Neutros + o verde/teal da Orbi.
export const BOX_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  neutro: { bg: "#F1EFE8", fg: "#2C2C2A", label: "Neutro" },
  claro: { bg: "#FFFFFF", fg: "#111318", label: "Claro" },
  escuro: { bg: "#111318", fg: "#F7F7F4", label: "Escuro" },
  verde: { bg: "#EAF3DE", fg: "#173404", label: "Verde" },
  teal: { bg: "#E1F5EE", fg: "#04342C", label: "Teal" },
  coral: { bg: "#FAECE7", fg: "#4A1B0C", label: "Coral" },
  azul: { bg: "#E6F1FB", fg: "#042C53", label: "Azul" },
};

export function colorOf(key: string | null | undefined) {
  return BOX_COLORS[key ?? "neutro"] ?? BOX_COLORS.neutro;
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
