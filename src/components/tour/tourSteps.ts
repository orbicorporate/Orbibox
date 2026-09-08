export type TourStep = {
  id: string;
  page: string;
  title: string;
  body: string;
};

// Ordem pensada pro "wow" vir logo no início — a Orbi (IA) é o diferencial
// mais forte do produto, então abre o tour. Depois desce pelos recursos que
// mais importam pro dono do negócio ver funcionando na prática.
export const TOUR_STEPS: TourStep[] = [
  {
    id: "orbi-ai",
    page: "/admin/agent",
    title: "A Orbi: sua vendedora com IA ✦",
    body: "Ela conversa com quem visita sua página, tira dúvidas e ajuda a fechar venda — do jeito que você configurar aqui.",
  },
  {
    id: "vitrine",
    page: "/admin/vitrine",
    title: "Vitrine inteligente",
    body: "Cada produto, serviço ou categoria vira uma página própria — como uma loja automática dentro do seu Orbibox.",
  },
  {
    id: "boxes",
    page: "/admin/boxes",
    title: "Endereço e WhatsApp com um toque",
    body: "Seu endereço abre direto no Waze ou Google Maps, e o WhatsApp já chega com a mensagem pronta pro cliente só mandar.",
  },
  {
    id: "insights",
    page: "/admin",
    title: "Dicas todo dia",
    body: "A Orbi analisa seu negócio e sugere o próximo passo pra crescer — sempre aqui, na tela inicial.",
  },
  {
    id: "pulse",
    page: "/admin/pulse",
    title: "Pulse: números com contexto",
    body: "Visitas, interesses e conversões — e um guia de marketing sob medida, baseado no que está funcionando pra você.",
  },
  {
    id: "config",
    page: "/admin/config",
    title: "Com a cara do seu negócio",
    body: "Nome, cores, logotipo, contatos — tudo que aparece pros seus clientes fica configurado por aqui.",
  },
];
