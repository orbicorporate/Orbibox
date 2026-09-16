// Degradês padrão da arte do gift card, 6 opções. Usados quando a loja não
// sobe uma foto própria (ou como base segura, já pensada pra ficar bonita
// e legível, sem depender do bom gosto de quem configura).
export type GiftTheme = "roxo" | "verde" | "azul" | "dourado" | "preto" | "laranja";

export const GIFT_THEMES: Record<GiftTheme, { label: string; from: string; via: string; to: string; swatch: string }> = {
  roxo: { label: "Roxo", from: "#6D28D9", via: "#93279E", to: "#B0309E", swatch: "linear-gradient(135deg, #6D28D9 0%, #B0309E 100%)" },
  verde: { label: "Verde", from: "#0B4A2E", via: "#136B42", to: "#1EA66B", swatch: "linear-gradient(135deg, #0B4A2E 0%, #1EA66B 100%)" },
  azul: { label: "Azul", from: "#0B1F45", via: "#1A3D8C", to: "#2F63C9", swatch: "linear-gradient(135deg, #0B1F45 0%, #2F63C9 100%)" },
  dourado: { label: "Dourado", from: "#7A3B12", via: "#C2650A", to: "#F0B429", swatch: "linear-gradient(135deg, #7A3B12 0%, #F0B429 100%)" },
  preto: { label: "Preto", from: "#0B0D12", via: "#1A1E27", to: "#2B3140", swatch: "linear-gradient(135deg, #0B0D12 0%, #2B3140 100%)" },
  laranja: { label: "Laranja", from: "#7A2E0A", via: "#D9481C", to: "#FF8A3D", swatch: "linear-gradient(135deg, #7A2E0A 0%, #FF8A3D 100%)" },
};

export function giftTheme(theme: string | null | undefined) {
  return GIFT_THEMES[(theme as GiftTheme) in GIFT_THEMES ? (theme as GiftTheme) : "roxo"];
}

/** Mesmo efeito metálico (brilho de canto + vinco diagonal) usado nos vouchers, aplicado ao tema do gift. */
export function giftGradient(theme: string | null | undefined) {
  const t = giftTheme(theme);
  return [
    `radial-gradient(120% 90% at 12% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 42%)`,
    `linear-gradient(135deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 68%, rgba(0,0,0,0.22) 100%)`,
    `linear-gradient(135deg, ${t.from} 0%, ${t.via} 55%, ${t.to} 100%)`,
  ].join(", ");
}
