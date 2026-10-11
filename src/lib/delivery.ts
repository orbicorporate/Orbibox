/** Apps de delivery que o dono pode ligar. A ordem aqui é a ordem em que aparecem para ligar. */
export type AppDeliveryId = "ifood" | "rappi" | "99food" | "keeta" | "ubereats" | "aiqfome" | "whatsapp" | "proprio";

export type AppDelivery = { id: AppDeliveryId; nome: string; cor: string; texto: string; marca: string; dica: string };

export const APPS_DELIVERY: AppDelivery[] = [
  { id: "ifood", nome: "iFood", cor: "#EA1D2C", texto: "#FFFFFF", marca: "iFood", dica: "Cole o link da sua loja no iFood" },
  { id: "rappi", nome: "Rappi", cor: "#FF441F", texto: "#FFFFFF", marca: "Rappi", dica: "Cole o link da sua loja no Rappi" },
  { id: "99food", nome: "99Food", cor: "#FFC800", texto: "#111318", marca: "99Food", dica: "Cole o link da sua loja no 99Food" },
  { id: "keeta", nome: "Keeta", cor: "#FFD100", texto: "#111318", marca: "Keeta", dica: "Cole o link da sua loja no Keeta" },
  { id: "ubereats", nome: "Uber Eats", cor: "#111318", texto: "#06C167", marca: "Uber Eats", dica: "Cole o link da sua loja no Uber Eats" },
  { id: "aiqfome", nome: "aiqfome", cor: "#7B2CBF", texto: "#FFFFFF", marca: "aiqfome", dica: "Cole o link da sua loja no aiqfome" },
  { id: "whatsapp", nome: "WhatsApp", cor: "#25D366", texto: "#FFFFFF", marca: "WhatsApp", dica: "Número com DDD ou o link wa.me" },
  { id: "proprio", nome: "Site próprio", cor: "#E9EAE6", texto: "#111318", marca: "Site", dica: "Link do seu site de pedidos" },
];

export type DeliveryApp = { id: AppDeliveryId; url: string; ativo: boolean };

export function appPorId(id: string) {
  return APPS_DELIVERY.find((a) => a.id === id);
}

/** Lê a lista de apps guardada no botão, tolerando lixo e apps que não existem mais. */
export function lerApps(raw: unknown): DeliveryApp[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is { id: string; url?: unknown; ativo?: unknown } => !!x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string")
    .filter((x) => !!appPorId(x.id))
    .map((x) => ({ id: x.id as AppDeliveryId, url: typeof x.url === "string" ? x.url : "", ativo: x.ativo !== false }));
}

/** Link pronto para abrir. WhatsApp aceita só o número. */
export function linkDoApp(app: DeliveryApp): string | null {
  const bruto = app.url.trim();
  if (!bruto) return null;
  if (/^https?:\/\//i.test(bruto)) return bruto;
  if (app.id === "whatsapp" && /^[\d\s()+-]{8,}$/.test(bruto)) {
    const d = bruto.replace(/\D/g, "");
    return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
  }
  return `https://${bruto}`;
}

export function appsAtivos(raw: unknown): DeliveryApp[] {
  return lerApps(raw).filter((a) => a.ativo && linkDoApp(a));
}
