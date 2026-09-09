export type ThemeColor = { hex: string; role: string };

export type VitrineTheme = {
  id: string;
  name: string;
  description: string;
  colors: ThemeColor[];
};

// Cada tema é uma paleta coesa de 4 cores, pensada pra funcionar bem tanto
// como "Cor do box" (sem foto) quanto como "Cor do rodapé" (com foto) — a
// mesma lógica de contraste automático do resto do app cuida do texto.
export const VITRINE_THEMES: VitrineTheme[] = [
  {
    id: "editorial",
    name: "Editorial Minimalista",
    description: "Off-white, grafite e um toque de dourado. Elegante, sóbrio, deixa a foto ser protagonista.",
    colors: [
      { hex: "#F7F5F0", role: "Fundo" },
      { hex: "#2B2A28", role: "Contraste" },
      { hex: "#C9A968", role: "Detalhe" },
      { hex: "#E4DFD3", role: "Suave" },
    ],
  },
  {
    id: "vivo",
    name: "Colorido e Vivo",
    description: "Cores saturadas e alegres. Perfeito pra marca jovem, food, festa, algo que precisa chamar atenção.",
    colors: [
      { hex: "#FF6B4A", role: "Principal" },
      { hex: "#2E5EFF", role: "Contraste" },
      { hex: "#FFD447", role: "Detalhe" },
      { hex: "#12B886", role: "Suave" },
    ],
  },
  {
    id: "luxo",
    name: "Luxo Escuro",
    description: "Fundo profundo com champagne e bordô. Para marca premium, joias, moda de alto padrão.",
    colors: [
      { hex: "#15130F", role: "Fundo" },
      { hex: "#D8C08A", role: "Detalhe" },
      { hex: "#5B1622", role: "Contraste" },
      { hex: "#3A362E", role: "Suave" },
    ],
  },
  {
    id: "pastel",
    name: "Pastel Delicado",
    description: "Tons suaves e claros. Combina com beleza, bem-estar, infantil, tudo que precisa parecer leve.",
    colors: [
      { hex: "#FBE7ED", role: "Principal" },
      { hex: "#E3E9FB", role: "Contraste" },
      { hex: "#FFF3D6", role: "Detalhe" },
      { hex: "#E1F3EA", role: "Suave" },
    ],
  },
  {
    id: "organico",
    name: "Natural e Orgânico",
    description: "Verdes e terracota sobre creme. Combina com comida saudável, plantas, produtos artesanais.",
    colors: [
      { hex: "#F3EDE1", role: "Fundo" },
      { hex: "#5C6E4E", role: "Contraste" },
      { hex: "#C97A4A", role: "Detalhe" },
      { hex: "#8C9C7C", role: "Suave" },
    ],
  },
];
