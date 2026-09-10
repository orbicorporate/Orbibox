export type ThemeColor = { hex: string; role: string };

// Uma foto do tema já traz o próprio nome/preço, definidos no upload —
// assim a foto e o texto sempre combinam, independente da ordem.
export type ThemePhoto = { url: string; title?: string; price?: string };

// Só o tamanho e o índice da foto — o conteúdo (nome/preço) vem da foto.
export type ThemeBox = {
  title?: string;
  price?: string;
  size: "destaque" | "largo" | "medio" | "alto";
  img?: number;
};

export type VitrineTheme = {
  id: string;
  name: string;
  vibe: string;
  exampleBusiness: string;
  description: string;
  bg: string;
  colors: ThemeColor[];
  // Posição do recorte da foto (object-position). Fotos com texto/lettering
  // ficam melhor com "top" (preserva o topo, onde o texto costuma estar).
  // Padrão é "center".
  objectPosition?: string;
};


// 10 vitrines de EXEMPLO por ramo de negócio. Paletas sóbrias e nobres,
// nunca preto ou vermelho de fundo. As fotos são ilustração; "Usar esse
// estilo" aplica só a paleta na conta do usuário.
export const VITRINE_THEMES: VitrineTheme[] = [
  {
    id: "moda",
    name: "Moda",
    vibe: "Editorial, atemporal",
    exampleBusiness: "Ateliê Norte",
    description: "Vitrine editorial com fotos das peças. Pra boutique, brechó, ateliê, loja de roupa.",
    bg: "#F5F1EA",
    colors: [
      { hex: "#EFE8DC", role: "Fundo" },
      { hex: "#2E2A26", role: "Contraste" },
      { hex: "#A8927A", role: "Detalhe" },
      { hex: "#C9BBA8", role: "Suave" },
    ],
  },
  {
    id: "joalheria",
    name: "Joalheria",
    vibe: "Sofisticado, precioso",
    exampleBusiness: "Ouro Fino",
    description: "Peças em destaque com brilho, champagne e dourado sobre fundo claro. Pra joalheria, ourivesaria, relojoaria, semijoias.",
    bg: "#F4F1EC",
    colors: [
      { hex: "#F0EBE2", role: "Fundo" },
      { hex: "#2B2620", role: "Contraste" },
      { hex: "#B69455", role: "Detalhe" },
      { hex: "#CBBBA0", role: "Suave" },
    ],
  },
  {
    id: "restaurante",
    name: "Restaurante",
    vibe: "Sofisticado, acolhedor",
    exampleBusiness: "Casa Dumont",
    description: "Fotos de pratos e ambiente com fundo quente e detalhe dourado. Pra restaurante, bistrô, cozinha autoral.",
    bg: "#F4EFE7",
    colors: [
      { hex: "#EDE5D6", role: "Fundo" },
      { hex: "#3A2E22", role: "Contraste" },
      { hex: "#B08A4A", role: "Detalhe" },
      { hex: "#8A6E4E", role: "Suave" },
    ],
  },
  {
    id: "loja",
    name: "Loja",
    vibe: "Clean, versátil",
    exampleBusiness: "Studio Bem",
    description: "Vitrine organizada de produtos com muito respiro. Pra loja de artigos, presentes, papelaria, decoração.",
    bg: "#F1F0EC",
    colors: [
      { hex: "#EEEDE7", role: "Fundo" },
      { hex: "#2C2E2B", role: "Contraste" },
      { hex: "#7C8A7E", role: "Detalhe" },
      { hex: "#C4C2B8", role: "Suave" },
    ],
  },
  {
    id: "fitness",
    name: "Loja Fitness",
    vibe: "Enérgico, atlético",
    exampleBusiness: "Move Store",
    description: "Roupas, acessórios e suplementos com tons de grafite e verde-limão contido. Pra loja fitness, moda esportiva, suplementos, equipamentos.",
    bg: "#EFF1EE",
    colors: [
      { hex: "#E9ECE8", role: "Fundo" },
      { hex: "#22271F", role: "Contraste" },
      { hex: "#6E8B3D", role: "Detalhe" },
      { hex: "#9BA69A", role: "Suave" },
    ],
  },
  {
    id: "servicos",
    name: "Serviços",
    vibe: "Confiável, corporativo",
    exampleBusiness: "Grupo Meridiano",
    description: "Ambiente profissional, tom sério e verde-petróleo. Pra consultoria, agência, escritório, contabilidade.",
    bg: "#EEF1EF",
    colors: [
      { hex: "#E7ECEA", role: "Fundo" },
      { hex: "#16332B", role: "Contraste" },
      { hex: "#4A7A68", role: "Detalhe" },
      { hex: "#9FB3AC", role: "Suave" },
    ],
  },
  {
    id: "agencia",
    name: "Agência de Marketing",
    vibe: "Inovador, estratégico",
    exampleBusiness: "Nova Mídia",
    description: "Cases, resultados e criativos com tons de grafite, roxo e verde-limão. Pra agência, social media, tráfego, branding.",
    bg: "#EEF0F4",
    colors: [
      { hex: "#E9EBF1", role: "Fundo" },
      { hex: "#1E1B2E", role: "Contraste" },
      { hex: "#6C4AE0", role: "Detalhe" },
      { hex: "#8E93A8", role: "Suave" },
    ],
  },
  {
    id: "pizzaria",
    name: "Pizzaria",
    vibe: "Aconchegante, saboroso",
    exampleBusiness: "Forno di Napoli",
    description: "Pizza em destaque, tons de massa e verde manjericão. Pra pizzaria, cantina, rodízio, delivery.",
    bg: "#F3EEE4",
    colors: [
      { hex: "#EDE4D2", role: "Fundo" },
      { hex: "#33291C", role: "Contraste" },
      { hex: "#6E8B4E", role: "Detalhe" },
      { hex: "#C08A3E", role: "Suave" },
    ],
  },
  {
    id: "hamburgueria",
    name: "Hamburgueria",
    vibe: "Descolado, saboroso",
    exampleBusiness: "Brasa Burger",
    description: "Lanches em close com tons de mostarda, terracota e madeira. Pra hamburgueria, food truck, lanchonete, delivery.",
    bg: "#F4EEE6",
    colors: [
      { hex: "#EFE6D6", role: "Fundo" },
      { hex: "#2E2119", role: "Contraste" },
      { hex: "#C88A3C", role: "Detalhe" },
      { hex: "#A56A45", role: "Suave" },
    ],
  },
  {
    id: "imobiliaria",
    name: "Imobiliária",
    vibe: "Elegante, confiável",
    exampleBusiness: "Vértice Imóveis",
    description: "Imóveis em destaque, azul-ardósia e areia. Pra imobiliária, corretor, arquitetura, aluguel de temporada.",
    bg: "#EEF0F2",
    colors: [
      { hex: "#E8EBEE", role: "Fundo" },
      { hex: "#22303C", role: "Contraste" },
      { hex: "#5E7A8C", role: "Detalhe" },
      { hex: "#B7A88E", role: "Suave" },
    ],
  },
  {
    id: "fotografo",
    name: "Fotógrafo",
    vibe: "Autoral, minimalista",
    exampleBusiness: "Estúdio Luz",
    description: "Portfólio com fotos grandes e fundo neutro escuro-suave. Pra fotógrafo, videomaker, estúdio, produtora.",
    bg: "#EDEBE8",
    colors: [
      { hex: "#E9E7E3", role: "Fundo" },
      { hex: "#2A2826", role: "Contraste" },
      { hex: "#847C70", role: "Detalhe" },
      { hex: "#BEB6A8", role: "Suave" },
    ],
  },
  {
    id: "grafica",
    name: "Gráfica / Papelaria",
    vibe: "Criativo, organizado",
    exampleBusiness: "Papel & Tinta",
    description: "Impressos, cadernos e materiais com tons de índigo, kraft e mostarda. Pra gráfica, papelaria, ateliê de convites, personalizados.",
    bg: "#F1F0EC",
    colors: [
      { hex: "#EDECE6", role: "Fundo" },
      { hex: "#26304A", role: "Contraste" },
      { hex: "#C79A3E", role: "Detalhe" },
      { hex: "#B0A88E", role: "Suave" },
    ],
  },
  {
    id: "salao",
    name: "Salão / Barbearia",
    vibe: "Estiloso, caprichado",
    exampleBusiness: "Studio Lâmina",
    description: "Antes/depois e ambiente, tons de fumê e cobre. Pra salão, barbearia, cabeleireiro, manicure.",
    bg: "#EFEDEC",
    colors: [
      { hex: "#EAE7E5", role: "Fundo" },
      { hex: "#2B2724", role: "Contraste" },
      { hex: "#A06A48", role: "Detalhe" },
      { hex: "#9A9490", role: "Suave" },
    ],
  },
  {
    id: "estetica",
    name: "Clínica de Estética",
    vibe: "Clean, cuidado",
    exampleBusiness: "Pele & Arte",
    description: "Ambiente clean e procedimentos com tons de rosé, nude e verde suave. Pra clínica de estética, depilação, harmonização, spa.",
    bg: "#F6F1EF",
    colors: [
      { hex: "#F2E9E6", role: "Fundo" },
      { hex: "#3E332F", role: "Contraste" },
      { hex: "#C79A8E", role: "Detalhe" },
      { hex: "#A8B7A6", role: "Suave" },
    ],
  },
  {
    id: "doceria",
    name: "Doceria",
    vibe: "Delicado, afetivo",
    exampleBusiness: "Doce Ateliê",
    description: "Doces e bolos com tons pastel sóbrios. Pra doceria, confeitaria, bolos de festa, brigaderia.",
    bg: "#F5EFEA",
    colors: [
      { hex: "#F0E6E0", role: "Fundo" },
      { hex: "#4A3A34", role: "Contraste" },
      { hex: "#C98F84", role: "Detalhe" },
      { hex: "#D8C3AE", role: "Suave" },
    ],
  },
  {
    id: "sorveteria",
    name: "Sorveteria",
    vibe: "Alegre, refrescante",
    exampleBusiness: "Gelato Bello",
    description: "Cores cremosas e refrescantes, com um toque de menta e pêssego. Pra sorveteria, gelateria, açaí, milk-shake.",
    bg: "#F3F6F2",
    colors: [
      { hex: "#EDF4F1", role: "Fundo" },
      { hex: "#3A4A44", role: "Contraste" },
      { hex: "#E39A82", role: "Detalhe" },
      { hex: "#8FC7B5", role: "Suave" },
    ],
  },
  {
    id: "arquitetura",
    name: "Escritório de Arquitetura",
    vibe: "Minimalista, refinado",
    exampleBusiness: "Traço Studio",
    description: "Projetos e ambientes com muito respiro, tons de concreto e madeira. Pra arquiteto, designer de interiores, urbanista, paisagismo.",
    bg: "#F0EFEC",
    colors: [
      { hex: "#EDEBE7", role: "Fundo" },
      { hex: "#2A2926", role: "Contraste" },
      { hex: "#9C8163", role: "Detalhe" },
      { hex: "#B8B5AD", role: "Suave" },
    ],
  },
  {
    id: "investimentos",
    name: "Consultoria de Investimentos",
    vibe: "Sóbrio, confiável",
    exampleBusiness: "Ápice Capital",
    description: "Tom institucional em azul-marinho profundo e dourado discreto. Pra assessoria de investimentos, gestão de patrimônio, planejamento financeiro.",
    bg: "#EEF1F4",
    objectPosition: "center top",
    colors: [
      { hex: "#E8ECF1", role: "Fundo" },
      { hex: "#16233A", role: "Contraste" },
      { hex: "#B8974E", role: "Detalhe" },
      { hex: "#9FA8B5", role: "Suave" },
    ],
  },
];
