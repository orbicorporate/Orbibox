// Temas de cor dos cupons — 4 opções, todas com degradê profundo e texto
// branco. O vermelho "cereja" é a cor-assinatura da ferramenta de vouchers
// e também é usado nos botões do admin (CHERRY abaixo).
export type VoucherColor = "cherry" | "black" | "navy" | "green";

export const VOUCHER_THEMES: Record<VoucherColor, { label: string; from: string; via: string; to: string; ctaText: string; glow: string }> = {
  cherry: { label: "Vermelho", from: "#A80F2B", via: "#CC1739", to: "#E4264C", ctaText: "#C4143A", glow: "rgba(204,23,57,0.45)" },
  black: { label: "Preto", from: "#0B0D12", via: "#1A1E27", to: "#2B3140", ctaText: "#111318", glow: "rgba(17,19,24,0.45)" },
  navy: { label: "Azul escuro", from: "#081A45", via: "#102B68", to: "#1A3D8C", ctaText: "#102B68", glow: "rgba(16,43,104,0.45)" },
  green: { label: "Verde", from: "#0B4A2E", via: "#136B42", to: "#1C8A57", ctaText: "#136B42", glow: "rgba(19,107,66,0.45)" },
};

export function voucherTheme(color: string | null | undefined) {
  return VOUCHER_THEMES[(color as VoucherColor) in VOUCHER_THEMES ? (color as VoucherColor) : "cherry"];
}

export function voucherGradient(color: string | null | undefined) {
  const t = voucherTheme(color);
  return `linear-gradient(135deg, ${t.from} 0%, ${t.via} 55%, ${t.to} 100%)`;
}

// Vermelho cereja — o mesmo tom em todo botão/cabeçalho do Vouchers no admin.
export const CHERRY_GRADIENT = "linear-gradient(135deg, #A80F2B 0%, #CC1739 55%, #E4264C 100%)";
export const CHERRY_SHADOW = "0 12px 32px rgba(204,23,57,0.40)";
export const CHERRY_TEXT = "#C4143A";
export const CHERRY_SOFT_BG = "#FCE8EC";
