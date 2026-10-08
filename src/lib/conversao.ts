// O que o dono quer conseguir com o Orbibox e o que ele mais quer que o
// cliente faça. As duas respostas decidem a estrutura da página: qual botão
// vem primeiro, como ele se chama e o que a Orbi tenta puxar na conversa.

export type ObjetivoId = "vender" | "apresentar" | "atender" | "tudo";
export type ConversaoId = "comprar" | "orcamento" | "whatsapp" | "agendar" | "visitar" | "conhecer" | "oferta" | "contato";

export const OBJETIVOS: { id: ObjetivoId; rotulo: string; detalhe: string }[] = [
  { id: "vender", rotulo: "Vender mais", detalhe: "Ofertas, vouchers e promoções" },
  { id: "apresentar", rotulo: "Apresentar meu negócio", detalhe: "Uma vitrine bonita do que você faz" },
  { id: "atender", rotulo: "Atender clientes sozinho", detalhe: "Uma IA que responde por você" },
  { id: "tudo", rotulo: "Fazer tudo isso", detalhe: "Vitrine, IA e ofertas juntas" },
];

/** Botão da página que melhor leva à conversão escolhida. */
export type BotaoChave = "catalogo" | "whatsapp" | "endereco" | "cupom" | "agent" | "conhecer";

export const CONVERSOES: {
  id: ConversaoId;
  rotulo: string;
  principal: BotaoChave;
  /** Se o botão principal não puder existir (sem WhatsApp, sem endereço). */
  reserva: BotaoChave;
  /** Nome do botão de WhatsApp quando ele é o principal. */
  rotuloWhatsapp?: { label: string; subtitle: string };
  /** O que a Orbi tenta conseguir na conversa. */
  objetivoConversa: string;
  precisa?: "whatsapp" | "endereco";
}[] = [
  { id: "comprar", rotulo: "Comprar", principal: "catalogo", reserva: "agent", objetivoConversa: "levar o cliente a comprar" },
  { id: "orcamento", rotulo: "Pedir orçamento", principal: "whatsapp", reserva: "agent", rotuloWhatsapp: { label: "Pedir orçamento", subtitle: "Resposta rápida no WhatsApp" }, objetivoConversa: "entender a necessidade e encaminhar um pedido de orçamento", precisa: "whatsapp" },
  { id: "whatsapp", rotulo: "Falar no WhatsApp", principal: "whatsapp", reserva: "agent", rotuloWhatsapp: { label: "Fale no WhatsApp", subtitle: "Atendimento rápido" }, objetivoConversa: "levar o cliente para o WhatsApp", precisa: "whatsapp" },
  { id: "agendar", rotulo: "Agendar", principal: "whatsapp", reserva: "agent", rotuloWhatsapp: { label: "Agendar horário", subtitle: "Escolha o melhor dia no WhatsApp" }, objetivoConversa: "levar o cliente a agendar um horário", precisa: "whatsapp" },
  { id: "visitar", rotulo: "Visitar o local", principal: "endereco", reserva: "whatsapp", objetivoConversa: "convidar o cliente a visitar o espaço", precisa: "endereco" },
  { id: "conhecer", rotulo: "Conhecer produtos", principal: "catalogo", reserva: "conhecer", objetivoConversa: "apresentar os produtos e recomendar o mais adequado" },
  { id: "oferta", rotulo: "Resgatar uma oferta", principal: "cupom", reserva: "catalogo", objetivoConversa: "oferecer o voucher e levar ao resgate" },
  { id: "contato", rotulo: "Entrar em contato", principal: "whatsapp", reserva: "agent", rotuloWhatsapp: { label: "Fale com a gente", subtitle: "Resposta rápida" }, objetivoConversa: "capturar o contato do cliente", precisa: "whatsapp" },
];

export function objetivoPorId(id: string | null | undefined) {
  return OBJETIVOS.find((o) => o.id === id) ?? null;
}
export function conversaoPorId(id: string | null | undefined) {
  return CONVERSOES.find((c) => c.id === id) ?? null;
}

/**
 * Ordem dos botões da tela inicial. O principal vem primeiro; o objetivo
 * decide o segundo (IA pra quem quer atender, oferta pra quem quer vender,
 * vitrine pra quem quer apresentar). O resto segue a ordem do ramo.
 */
export function ordenarBotoes(opts: {
  disponiveis: BotaoChave[];
  conversao: ConversaoId | null;
  objetivo: ObjetivoId | null;
  servico: boolean;
}): BotaoChave[] {
  const base: BotaoChave[] = opts.servico
    ? ["conhecer", "agent", "catalogo", "whatsapp", "cupom", "endereco"]
    : ["catalogo", "agent", "conhecer", "whatsapp", "cupom", "endereco"];
  const tem = (k: BotaoChave) => opts.disponiveis.includes(k);
  const ordem: BotaoChave[] = [];
  const por = (k: BotaoChave | null | undefined) => {
    if (k && tem(k) && !ordem.includes(k)) ordem.push(k);
  };
  const c = conversaoPorId(opts.conversao);
  if (c) por(tem(c.principal) ? c.principal : c.reserva);
  const segundo: Record<ObjetivoId, BotaoChave[]> = {
    vender: ["cupom", "catalogo"],
    apresentar: [opts.servico ? "conhecer" : "catalogo", "conhecer"],
    atender: ["agent"],
    tudo: ["agent", "cupom"],
  };
  if (opts.objetivo) segundo[opts.objetivo].forEach(por);
  base.forEach(por);
  return ordem;
}
