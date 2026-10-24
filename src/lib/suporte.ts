// Suporte humano do Orbibox: o WhatsApp da Nume Company. Um lugar só pro número.
// Pode ser trocado pela variável NEXT_PUBLIC_SUPORTE_WHATSAPP (com 55 e DDD).
export const WHATSAPP_SUPORTE = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP || "5515997587720";

export function linkSuporte(negocio?: string | null) {
  const msg = `Olá, Nume Company! Preciso de ajuda no meu Orbibox${negocio ? ` (${negocio})` : ""}.`;
  return `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(msg)}`;
}
