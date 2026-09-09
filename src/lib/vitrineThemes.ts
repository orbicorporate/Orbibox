export type ThemeColor = { hex: string; role: string };

// Um box do mockup: ou tem foto (photo) ou é cor sólida (usa a cor do tema
// pelo índice colorIdx). size segue o mesmo sistema da vitrine real.
export type ThemeBox = {
  title: string;
  price?: string;
  size: "destaque" | "largo" | "medio" | "alto";
  photo?: string;
  colorIdx?: number; // índice em colors[], usado quando não tem foto
  label?: string;
};

export type VitrineTheme = {
  id: string;
  name: string;
  vibe: string;
  exampleBusiness: string;
  description: string;
  bg: string; // fundo da vitrine de exemplo (nunca preto/vermelho)
  colors: ThemeColor[];
  boxes: ThemeBox[];
};

const px = (id: string) => `https://cdn.pixabay.com/get/${id}_1920.jpg`;

// Vitrines de EXEMPLO — fotos reais (Pixabay, licença livre, sem atribuição)
// de um negócio fictício, só pra mostrar o potencial visual. "Usar esse
// estilo" aplica só a paleta de cor na conta; as fotos nunca entram na
// vitrine real do usuário.
export const VITRINE_THEMES: VitrineTheme[] = [
  {
    id: "moda",
    name: "Estilo Moda",
    vibe: "Editorial, atemporal",
    exampleBusiness: "Ateliê Norte",
    description:
      "Grade elegante misturando fotos de peças e boxes em tons terrosos. Pra boutique, brechó, ateliê, loja de roupa.",
    bg: "#F5F1EA",
    colors: [
      { hex: "#EFE8DC", role: "Fundo" },
      { hex: "#2E2A26", role: "Contraste" },
      { hex: "#A8927A", role: "Detalhe" },
      { hex: "#C9BBA8", role: "Suave" },
    ],
    boxes: [
      { title: "Coleção Inverno", price: "a partir de R$ 289", size: "destaque", photo: px("gf9f1e817cd50d4a396c57b14d3b996767bfd373842bfeea81db817e2f523d76c85e42a24f0ea6f539d9beb59307dcf5f") },
      { title: "Vestidos", size: "medio", colorIdx: 1, label: "18 peças" },
      { title: "Alfaiataria", price: "R$ 349", size: "alto", photo: px("gdc3360edb0f99c59b45f2b3eb7327bae9ae7d9135084ae722236433579b7674bc704ba7539640668a6dc062a5d1fdf65") },
      { title: "Acessórios", size: "medio", colorIdx: 2 },
      { title: "Novidades da semana", size: "largo", colorIdx: 3 },
      { title: "Bolsas de couro", price: "R$ 259", size: "medio", photo: px("g8bb87b9d352a09a1c0d5554918545eb91a483f8dd76989065a14054c8b48aefda982fea48242be6cb6050dded1ab0438") },
      { title: "Sapatos", size: "medio", colorIdx: 1 },
      { title: "Óculos", price: "R$ 180", size: "medio", photo: px("g6d98512c6bb335114be679d78496bcad1efa4e0096a5ebea22f58d0e0621fb9cee62850cda00a7c9f9316ab66f5652ab") },
      { title: "Sob medida", size: "largo", colorIdx: 2, label: "fale com a gente" },
      { title: "Outlet", price: "até 50% off", size: "medio", colorIdx: 3 },
      { title: "Lookbook", size: "medio", photo: px("g4c249b35ff790a7adece0d1ff404634097e26126c716596b8ed07db84c42c182f58a33568db025444b59f4eb0c7dae8b") },
    ],
  },
];
