export type ThemeColor = { hex: string; role: string };

export type ThemeBox = {
  title: string;
  price?: string;
  size: "destaque" | "largo" | "medio" | "alto";
  img?: number; // índice na lista de fotos do tema (photos[]); ausente = box de cor
  colorIdx?: number; // cor usada quando não tem foto
  label?: string;
};

export type VitrineTheme = {
  id: string;
  name: string;
  vibe: string;
  exampleBusiness: string;
  description: string;
  bg: string;
  colors: ThemeColor[];
  photos: string[]; // URLs no Storage (box-images/inspire), preenchidas conforme upload
  boxes: ThemeBox[];
};

// Base pública do Storage do projeto.
const S = "https://bzuajbbwueptvkngtsoy.supabase.co/storage/v1/object/public/box-images/inspire";
const p = (name: string) => `${S}/${name}`;

// 10 vitrines de EXEMPLO por ramo de negócio. Paletas sóbrias e nobres,
// nunca preto ou vermelho de fundo. As fotos são ilustração; "Usar esse
// estilo" aplica só a paleta na conta do usuário.
export const VITRINE_THEMES: VitrineTheme[] = [
  {
    id: "moda",
    name: "Moda",
    vibe: "Editorial, atemporal",
    exampleBusiness: "Ateliê Norte",
    description: "Grade elegante misturando fotos de peças e boxes em tons terrosos. Pra boutique, brechó, ateliê, loja de roupa.",
    bg: "#F5F1EA",
    colors: [
      { hex: "#EFE8DC", role: "Fundo" },
      { hex: "#2E2A26", role: "Contraste" },
      { hex: "#A8927A", role: "Detalhe" },
      { hex: "#C9BBA8", role: "Suave" },
    ],
    photos: [
      p("moda-08.jpg"), p("moda-01.jpg"), p("moda-03.jpg"), p("moda-09.jpg"),
      p("moda-12.jpg"), p("moda-07.jpg"), p("moda-05.jpg"), p("moda-02.jpg"),
      p("moda-10.jpg"),
    ],
    boxes: [
      { title: "Coleção Inverno", price: "a partir de R$ 289", size: "destaque", img: 0 },
      { title: "Vestidos", size: "medio", colorIdx: 1, label: "18 peças" },
      { title: "Alfaiataria", price: "R$ 349", size: "alto", img: 1 },
      { title: "Acessórios", size: "medio", colorIdx: 2 },
      { title: "Novidades da semana", size: "largo", colorIdx: 3 },
      { title: "Peça do mês", price: "R$ 259", size: "medio", img: 2 },
      { title: "Elegância casual", size: "medio", img: 3 },
      { title: "Jeans", size: "medio", img: 4 },
      { title: "Verão", price: "R$ 219", size: "alto", img: 5 },
      { title: "Sob medida", size: "largo", colorIdx: 2, label: "fale com a gente" },
      { title: "Peças-chave", size: "medio", img: 6 },
      { title: "Sapatos", size: "medio", colorIdx: 1 },
      { title: "Outlet", price: "até 50% off", size: "medio", colorIdx: 3 },
      { title: "Lookbook", size: "medio", img: 7 },
      { title: "Novidade", size: "medio", img: 8 },
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
    photos: [],
    boxes: [
      { title: "Menu do dia", price: "R$ 68", size: "destaque", img: 0 },
      { title: "Entradas", size: "medio", colorIdx: 2 },
      { title: "Prato assinatura", price: "R$ 92", size: "alto", img: 1 },
      { title: "Sobremesas", size: "medio", colorIdx: 1 },
      { title: "Reservar mesa", size: "largo", colorIdx: 3, label: "toque para reservar" },
      { title: "Vinhos", size: "medio", img: 2 },
      { title: "Ambiente", size: "medio", img: 3 },
      { title: "Delivery", size: "medio", colorIdx: 2 },
      { title: "Eventos e festas", size: "largo", colorIdx: 1 },
      { title: "Chef recomenda", price: "R$ 78", size: "medio", img: 4 },
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
    photos: [],
    boxes: [
      { title: "Mais vendidos", size: "destaque", img: 0 },
      { title: "Novidades", size: "medio", colorIdx: 2 },
      { title: "Coleção casa", price: "R$ 120", size: "alto", img: 1 },
      { title: "Presentes", size: "medio", colorIdx: 1 },
      { title: "Kits especiais", size: "largo", colorIdx: 3 },
      { title: "Papelaria", price: "R$ 32", size: "medio", img: 2 },
      { title: "Promoções", size: "medio", colorIdx: 2 },
      { title: "Edição limitada", size: "medio", img: 3 },
      { title: "Fale conosco", size: "largo", colorIdx: 1, label: "WhatsApp" },
      { title: "Últimas peças", size: "medio", img: 4 },
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
    photos: [],
    boxes: [
      { title: "Nossos serviços", size: "destaque", img: 0 },
      { title: "Consultoria", size: "medio", colorIdx: 1 },
      { title: "Como trabalhamos", size: "alto", img: 1 },
      { title: "Planos", size: "medio", colorIdx: 2 },
      { title: "Agende uma conversa", size: "largo", colorIdx: 3, label: "sem compromisso" },
      { title: "Cases", size: "medio", img: 2 },
      { title: "A equipe", size: "medio", img: 3 },
      { title: "Depoimentos", size: "medio", colorIdx: 1 },
      { title: "Orçamento", size: "largo", colorIdx: 2, label: "peça o seu" },
      { title: "Fale conosco", size: "medio", img: 4 },
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
    photos: [],
    boxes: [
      { title: "Pizza da casa", price: "R$ 54", size: "destaque", img: 0 },
      { title: "Sabores", size: "medio", colorIdx: 3, label: "24 opções" },
      { title: "Broto", price: "R$ 32", size: "alto", img: 1 },
      { title: "Bebidas", size: "medio", colorIdx: 2 },
      { title: "Peça no WhatsApp", size: "largo", colorIdx: 1, label: "entrega rápida" },
      { title: "Massa artesanal", size: "medio", img: 2 },
      { title: "Combos", size: "medio", colorIdx: 3 },
      { title: "Forno a lenha", size: "medio", img: 3 },
      { title: "Promoção terça", price: "2 por R$ 89", size: "largo", colorIdx: 2 },
      { title: "Doce de forno", size: "medio", img: 4 },
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
    photos: [],
    boxes: [
      { title: "Destaque da semana", price: "R$ 890 mil", size: "destaque", img: 0 },
      { title: "Apartamentos", size: "medio", colorIdx: 2 },
      { title: "Casa alto padrão", price: "R$ 1,2 mi", size: "alto", img: 1 },
      { title: "Aluguel", size: "medio", colorIdx: 1 },
      { title: "Agende uma visita", size: "largo", colorIdx: 3, label: "toque para agendar" },
      { title: "Lançamentos", size: "medio", img: 2 },
      { title: "Comercial", size: "medio", colorIdx: 2 },
      { title: "Na planta", size: "medio", img: 3 },
      { title: "Fale com um corretor", size: "largo", colorIdx: 1, label: "WhatsApp" },
      { title: "Temporada", size: "medio", img: 4 },
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
    photos: [],
    boxes: [
      { title: "Portfólio", size: "destaque", img: 0 },
      { title: "Ensaios", size: "medio", colorIdx: 1 },
      { title: "Casamentos", size: "alto", img: 1 },
      { title: "Retratos", size: "medio", colorIdx: 2 },
      { title: "Reserve sua data", size: "largo", colorIdx: 3, label: "agenda 2026" },
      { title: "Eventos", size: "medio", img: 2 },
      { title: "Books", size: "medio", colorIdx: 1 },
      { title: "Making of", size: "medio", img: 3 },
      { title: "Pacotes", size: "largo", colorIdx: 2, label: "ver preços" },
      { title: "Últimos trabalhos", size: "medio", img: 4 },
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
    photos: [],
    boxes: [
      { title: "Nossos cortes", size: "destaque", img: 0 },
      { title: "Corte + barba", price: "R$ 70", size: "medio", colorIdx: 2 },
      { title: "Coloração", size: "alto", img: 1 },
      { title: "Manicure", size: "medio", colorIdx: 1 },
      { title: "Agende seu horário", size: "largo", colorIdx: 3, label: "toque para agendar" },
      { title: "Tratamentos", size: "medio", img: 2 },
      { title: "Combos", size: "medio", colorIdx: 2 },
      { title: "O espaço", size: "medio", img: 3 },
      { title: "Planos mensais", size: "largo", colorIdx: 1 },
      { title: "Antes e depois", size: "medio", img: 4 },
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
    photos: [],
    boxes: [
      { title: "Bolo do mês", price: "R$ 120", size: "destaque", img: 0 },
      { title: "Docinhos", size: "medio", colorIdx: 2, label: "cento a partir de R$ 90" },
      { title: "Bolo de festa", price: "sob encomenda", size: "alto", img: 1 },
      { title: "Tortas", size: "medio", colorIdx: 1 },
      { title: "Encomende pelo WhatsApp", size: "largo", colorIdx: 3, label: "toque aqui" },
      { title: "Kit festa", size: "medio", img: 2 },
      { title: "Sazonais", size: "medio", colorIdx: 2 },
      { title: "Vitrine do dia", size: "medio", img: 3 },
      { title: "Provas de bolo", size: "largo", colorIdx: 1, label: "agende" },
      { title: "Novidades", size: "medio", img: 4 },
    ],
  },
  {
    id: "academia",
    name: "Academia",
    vibe: "Energético, forte",
    exampleBusiness: "Forja Studio",
    description: "Treino e espaço com tons de grafite e verde-limão sóbrio. Pra academia, personal, crossfit, pilates.",
    bg: "#EDEFEC",
    colors: [
      { hex: "#E6EAE4", role: "Fundo" },
      { hex: "#23281F", role: "Contraste" },
      { hex: "#5E7345", role: "Detalhe" },
      { hex: "#A2A89A", role: "Suave" },
    ],
    photos: [],
    boxes: [
      { title: "Conheça o espaço", size: "destaque", img: 0 },
      { title: "Musculação", size: "medio", colorIdx: 1 },
      { title: "Aulas coletivas", size: "alto", img: 1 },
      { title: "Personal", size: "medio", colorIdx: 2 },
      { title: "Matricule-se", size: "largo", colorIdx: 3, label: "primeira aula grátis" },
      { title: "Cross training", size: "medio", img: 2 },
      { title: "Planos", size: "medio", colorIdx: 1 },
      { title: "Avaliação física", size: "medio", img: 3 },
      { title: "Horários", size: "largo", colorIdx: 2, label: "ver grade" },
      { title: "Resultados", size: "medio", img: 4 },
    ],
  },
];
