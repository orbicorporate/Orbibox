export type GiftParaAviso = {
  code: string;
  value_cents: number;
  from_name: string | null;
  to_name: string | null;
  buyer_whatsapp?: string | null;
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function digitos(n: string | null | undefined) {
  const d = (n ?? "").replace(/\D/g, "");
  if (d.length < 10) return "";
  return d.startsWith("55") ? d : `55${d}`;
}

/** Texto que o negócio manda a quem comprou: confirma o pagamento e explica os 3 passos. */
export function textoAvisoGift(g: GiftParaAviso, negocio: string, origin: string) {
  const link = `${origin}/gift/${g.code}`;
  const quem = g.to_name || "quem vai ganhar";
  return `Oi${g.from_name ? `, ${g.from_name}` : ""}! Recebemos o pagamento e o gift card de ${brl(g.value_cents)} para ${quem} está liberado.\n\nComo funciona:\n1. Envie este link para ${quem}: ${link}\n2. Na hora de usar, ${quem} mostra a tela do link (com o código ${g.code}) ao garçom ou ao atendimento de ${negocio}.\n3. Nós conferimos o código e damos baixa no valor.\n\nQualquer dúvida, é só responder aqui.`;
}

export function linkWhatsAviso(g: GiftParaAviso, negocio: string, origin: string) {
  const fone = digitos(g.buyer_whatsapp);
  return `https://wa.me/${fone}?text=${encodeURIComponent(textoAvisoGift(g, negocio, origin))}`;
}
