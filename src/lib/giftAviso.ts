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

/** Primeira mensagem: confirma o pagamento e explica. Não leva o link, que vai separado. */
export function textoAvisoGift(g: GiftParaAviso, negocio: string) {
  const quem = g.to_name || "quem vai ganhar";
  return `Oi${g.from_name ? `, ${g.from_name}` : ""}! Recebemos o pagamento e o gift card de ${brl(g.value_cents)} para ${quem} está liberado.\n\nComo funciona:\n1. Já vou te mandar o link do presente em uma mensagem separada. Encaminhe apenas essa mensagem, só com o link, para ${quem}. Não encaminhe esta explicação.\n2. Na hora de usar, ${quem} mostra a tela do link (com o código ${g.code}) ao garçom ou ao atendimento de ${negocio}.\n3. Nós conferimos o código e damos baixa no valor. O gift só pode ser utilizado uma única vez.\n\nQualquer dúvida, é só responder aqui.`;
}

/** Segunda mensagem: só o link, pronta para quem comprou encaminhar ao presenteado. */
export function textoLinkGift(g: GiftParaAviso, origin: string) {
  return `${origin}/gift/${g.code}`;
}

export function linkWhatsAviso(g: GiftParaAviso, negocio: string) {
  const fone = digitos(g.buyer_whatsapp);
  return `https://wa.me/${fone}?text=${encodeURIComponent(textoAvisoGift(g, negocio))}`;
}

export function linkWhatsLink(g: GiftParaAviso, origin: string) {
  const fone = digitos(g.buyer_whatsapp);
  return `https://wa.me/${fone}?text=${encodeURIComponent(textoLinkGift(g, origin))}`;
}

/** Mensagem para quem ganhou o presente: curta, com o link no fim para abrir a tela do gift. */
export function textoParaPresenteado(g: GiftParaAviso, negocio: string, origin: string) {
  const link = `${origin}/gift/${g.code}`;
  const de = g.from_name ? `${g.from_name} te enviou` : "Você ganhou";
  return `Oi${g.to_name ? `, ${g.to_name}` : ""}! ${de} um presente de ${brl(g.value_cents)} para usar em ${negocio}.\n\nAbra seu gift card aqui: ${link}\n\nNa hora de usar, mostre a tela ao atendimento. O gift só pode ser utilizado uma única vez.`;
}

/** Abre o WhatsApp para o presenteado. Sem número, o WhatsApp deixa escolher o contato. */
export function linkWhatsPresenteado(g: GiftParaAviso, negocio: string, origin: string, fone?: string) {
  const d = digitos(fone);
  return `https://wa.me/${d}?text=${encodeURIComponent(textoParaPresenteado(g, negocio, origin))}`;
}
