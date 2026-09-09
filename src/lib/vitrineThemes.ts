export type ThemeColor = { hex: string; role: string };
export type ThemeExampleItem = { title: string; price: string; photo: string };

export type VitrineTheme = {
  id: string;
  name: string;
  vibe: string;
  exampleBusiness: string;
  description: string;
  colors: ThemeColor[];
  items: ThemeExampleItem[];
};

// Ajuda a montar a URL final da imagem, com tamanho/qualidade consistentes.
function unsplash(photoId: string) {
  return `https://images.unsplash.com/${photoId}?w=1200&q=80&auto=format&fit=crop`;
}

// Cada tema é uma vitrine de EXEMPLO — com fotos reais (banco licenciado pra
// uso comercial) de um negócio fictício, só pra mostrar o potencial visual.
// "Usar esse estilo" aplica a paleta de cor na conta; as fotos aqui são só
// ilustração, nunca entram na vitrine de verdade do usuário.
export const VITRINE_THEMES: VitrineTheme[] = [
  {
    id: "moda",
    name: "Estilo Moda",
    vibe: "Editorial, atemporal",
    exampleBusiness: "Ateliê Norte",
    description: "Fotos de arara e still de roupa, tons neutros. Pra brechó, boutique, ateliê de costura.",
    colors: [
      { hex: "#F5F1E8", role: "Fundo" },
      { hex: "#2B2A28", role: "Contraste" },
      { hex: "#8C7A5C", role: "Detalhe" },
      { hex: "#D8CFC0", role: "Suave" },
    ],
    items: [
      { title: "Coleção Inverno", price: "R$ 289", photo: unsplash("photo-1761090617068-f1b3257d27ad") },
      { title: "Peça Assinatura", price: "R$ 349", photo: unsplash("photo-1761682719767-36b43e4acd63") },
    ],
  },
  {
    id: "servico",
    name: "Estilo Serviço",
    vibe: "Confiável, corporativo",
    exampleBusiness: "Grupo Meridiano",
    description: "Ambiente profissional, tom sério. Pra consultoria, agência, escritório, contabilidade.",
    colors: [
      { hex: "#EEF1EF", role: "Fundo" },
      { hex: "#16332B", role: "Contraste" },
      { hex: "#4A7A68", role: "Detalhe" },
      { hex: "#C7D2CC", role: "Suave" },
    ],
    items: [
      { title: "Consultoria Estratégica", price: "Sob consulta", photo: unsplash("photo-1758518729463-0bb73ed899ac") },
      { title: "Planejamento Anual", price: "Sob consulta", photo: unsplash("photo-1758518730136-1bf4fa26ccbf") },
    ],
  },
  {
    id: "misterio",
    name: "Estilo Mistério",
    vibe: "Intrigante, elegante",
    exampleBusiness: "Caixa Preta",
    description: "Preto, dourado, embalagem que dá vontade de abrir. Pra loja de presentes, curadoria, box surpresa.",
    colors: [
      { hex: "#141414", role: "Fundo" },
      { hex: "#D4AF6A", role: "Detalhe" },
      { hex: "#3A1E1E", role: "Contraste" },
      { hex: "#2A2A2A", role: "Suave" },
    ],
    items: [
      { title: "Box Surpresa", price: "R$ 129", photo: unsplash("photo-1607614564906-234871d9608f") },
      { title: "Edição Limitada", price: "R$ 189", photo: unsplash("photo-1671749999622-4087a86868cc") },
    ],
  },
  {
    id: "vibrante",
    name: "Estilo Vibrante",
    vibe: "Alto-astral, colorido",
    exampleBusiness: "Doce Verão",
    description: "Cores saturadas, energia alta. Pra sorveteria, doceria, festa, marca jovem.",
    colors: [
      { hex: "#FFF6E5", role: "Fundo" },
      { hex: "#FF5A8A", role: "Principal" },
      { hex: "#1FB6A8", role: "Contraste" },
      { hex: "#FFC933", role: "Detalhe" },
    ],
    items: [
      { title: "Sorvete Artesanal", price: "R$ 18", photo: unsplash("photo-1567206563064-6f60f40a2b57") },
      { title: "Gelato da Casa", price: "R$ 22", photo: unsplash("photo-1762857362159-840f0b18dc8e") },
    ],
  },
  {
    id: "discreto",
    name: "Estilo Discreto",
    vibe: "Calmo, sofisticado",
    exampleBusiness: "Estúdio Cinza",
    description: "Tons neutros, luz suave, sem pressa. Pra estética, terapia, wellness, skincare.",
    colors: [
      { hex: "#F2F0EA", role: "Fundo" },
      { hex: "#5C6357", role: "Contraste" },
      { hex: "#A8AD9E", role: "Detalhe" },
      { hex: "#DEDCD3", role: "Suave" },
    ],
    items: [
      { title: "Ritual Facial", price: "R$ 220", photo: unsplash("photo-1760862652442-e8ff7ebdd2f8") },
      { title: "Linha Natural", price: "R$ 95", photo: unsplash("photo-1764581218410-303283f5fd9c") },
    ],
  },
  {
    id: "luxo",
    name: "Estilo Luxo",
    vibe: "Alto padrão, exclusivo",
    exampleBusiness: "Casa Dumont",
    description: "Fundo escuro, luz baixa, detalhe dourado. Pra restaurante fino, joalheria, hotel boutique.",
    colors: [
      { hex: "#12100D", role: "Fundo" },
      { hex: "#C9A24B", role: "Detalhe" },
      { hex: "#3D3324", role: "Contraste" },
      { hex: "#2A2822", role: "Suave" },
    ],
    items: [
      { title: "Menu Degustação", price: "R$ 480", photo: unsplash("photo-1753727471014-efe38840c7c7") },
      { title: "Harmonização", price: "R$ 180", photo: unsplash("photo-1530367086713-83fee2b59d84") },
    ],
  },
  {
    id: "extrovertido",
    name: "Extrovertido",
    vibe: "Divertido, ousado",
    exampleBusiness: "Fogo & Cia",
    description: "Cores fortes, comida com atitude. Pra hamburgueria, food truck, bar, marca com personalidade.",
    colors: [
      { hex: "#1A1A1A", role: "Fundo" },
      { hex: "#E63946", role: "Principal" },
      { hex: "#FFB703", role: "Detalhe" },
      { hex: "#6A0DAD", role: "Contraste" },
    ],
    items: [
      { title: "Burger da Casa", price: "R$ 34", photo: unsplash("photo-1700513970028-d8a630d21c6e") },
      { title: "Combo Duplo", price: "R$ 52", photo: unsplash("photo-1560971017-56ff49e80303") },
    ],
  },
];
