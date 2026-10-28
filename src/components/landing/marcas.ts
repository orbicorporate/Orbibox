/** Marcas reais que aparecem de modelo no celular da landing. */
export type IconeBolinha = "cardapio" | "whatsapp" | "endereco" | "voucher" | "presente" | "delivery" | "materiais" | "catalogo";

export type MarcaLanding = {
  id: string;
  chip: string;
  nome: string;
  frase: string;
  pergunta: string;
  logo: string;
  cor: string; // cor da marca (brilho, botão principal)
  fundo: string; // fundo da página
  principal: string;
  bolinhas: { tipo: IconeBolinha; rotulo: string }[];
  secao: string;
  cards: { titulo: string; url: string }[];
};

const B = "https://bzuajbbwueptvkngtsoy.supabase.co/storage/v1/object/public/box-images";

export const MARCAS_LANDING: MarcaLanding[] = [
  {
    id: "jardineira", chip: "Jardineira Grill", nome: "Jardineira Grill", frase: "Rodízio de carnes nobres e buffet com frutos do mar.", pergunta: "O que vamos celebrar?", logo: `${B}/b2cf5a8d-fac5-4bb2-a9d0-d1443078aa0b/logo-1792546852685-debkr0.png`, cor: "#2E2A26", fundo: "#EFE8DC", principal: "Reservar mesa",
    bolinhas: [{ tipo: "cardapio", rotulo: "Cardápio" }, { tipo: "whatsapp", rotulo: "WhatsApp" }, { tipo: "endereco", rotulo: "Como chegar" }, { tipo: "presente", rotulo: "Presente" }],
    secao: "Em destaque",
    cards: [
      { titulo: "Rodízio", url: `${B}/b2cf5a8d-fac5-4bb2-a9d0-d1443078aa0b/1791454523691-dhp6d5.jpg` },
      { titulo: "Buffet", url: `${B}/b2cf5a8d-fac5-4bb2-a9d0-d1443078aa0b/1791454557676-rk8pst.jpg` },
      { titulo: "Sobremesas", url: `${B}/b2cf5a8d-fac5-4bb2-a9d0-d1443078aa0b/1791512707627-cl98ar.jpg` },
      { titulo: "Ceia de Natal", url: `${B}/b2cf5a8d-fac5-4bb2-a9d0-d1443078aa0b/1792547318424-72b5dx.jpg` },
    ],
  },
  {
    id: "vabene", chip: "Vabene", nome: "Vabene", frase: "Insumos para confeitaria e sorveteria.", pergunta: "O que você vai criar?", logo: `${B}/81e38462-b747-44e2-a095-4ca2f63fc709/logo-1793061274899-mjmrte.png`, cor: "#FD0927", fundo: "#FFFFFF", principal: "Ver catálogo",
    bolinhas: [{ tipo: "catalogo", rotulo: "Catálogo" }, { tipo: "whatsapp", rotulo: "WhatsApp" }, { tipo: "materiais", rotulo: "Materiais" }, { tipo: "voucher", rotulo: "Vouchers" }],
    secao: "Categorias",
    cards: [
      { titulo: "Recheios Artesanais", url: "/catalogo-vabene/artesanal-01.webp" },
      { titulo: "Ganaches", url: "/catalogo-vabene/ganache-01.webp" },
      { titulo: "Crocantes", url: "/catalogo-vabene/crocante-01.webp" },
      { titulo: "Cookies", url: "/catalogo-vabene/cookies-01.webp" },
    ],
  },
  {
    id: "melten", chip: "Melten", nome: "Melten", frase: "Fondue, sorvete e açaí do seu jeito.", pergunta: "Qual é a vontade de hoje?", logo: `${B}/9bf040e8-3ecb-4d2b-b560-e57524cf2510/logo-1791598239291-w08ipd.png`, cor: "#9C8163", fundo: "#EDEBE7", principal: "Monte o seu pote",
    bolinhas: [{ tipo: "cardapio", rotulo: "Cardápio" }, { tipo: "delivery", rotulo: "Delivery" }, { tipo: "voucher", rotulo: "Vouchers" }, { tipo: "whatsapp", rotulo: "WhatsApp" }],
    secao: "Mais pedidos",
    cards: [
      { titulo: "Sorvete", url: `${B}/9bf040e8-3ecb-4d2b-b560-e57524cf2510/1790630266976-c67s9t.jpg` },
      { titulo: "Açaí", url: `${B}/9bf040e8-3ecb-4d2b-b560-e57524cf2510/1790524211599-1pbfhu.jpg` },
      { titulo: "Fondue", url: `${B}/9bf040e8-3ecb-4d2b-b560-e57524cf2510/1790437081546-wsctel.jpg` },
      { titulo: "Milk-Shake", url: `${B}/9bf040e8-3ecb-4d2b-b560-e57524cf2510/1792115948797-3y95nk.jpg` },
    ],
  },
];
