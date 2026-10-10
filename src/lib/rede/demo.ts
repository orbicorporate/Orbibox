/** Dados de exemplo da prévia do painel de rede. Nada aqui vem de clientes reais. */
export type LojaDemo = {
  id: string;
  nome: string;
  /** @ do Instagram, usado como nome do Orbibox na rede */
  insta: string;
  cidade: string;
  uf: string;
  cor: string;
  visitas: number;
  toques: number;
  conversas: number;
  resgates: number;
  /** variação de visitas contra a semana anterior, em % */
  delta: number;
  /** visitas por dia nos últimos 7 dias */
  serie: number[];
};

export const REDE_DEMO = { nome: "Sua rede", codigo: "AURORA-24", slug: "rede-aurora" };

export const LOJAS_DEMO: LojaDemo[] = [
  { id: "1", nome: "Aurora Centro", insta: "@aurora.centro", cidade: "Sorocaba", uf: "SP", cor: "#B7F34A", visitas: 1840, toques: 612, conversas: 143, resgates: 58, delta: 24, serie: [180, 210, 240, 260, 290, 330, 330] },
  { id: "2", nome: "Aurora Paulista", insta: "@aurora.paulista", cidade: "São Paulo", uf: "SP", cor: "#6EE7D8", visitas: 2310, toques: 705, conversas: 171, resgates: 77, delta: 11, serie: [290, 310, 330, 320, 340, 360, 360] },
  { id: "3", nome: "Aurora Batel", insta: "@aurora.batel", cidade: "Curitiba", uf: "PR", cor: "#FFB86B", visitas: 1190, toques: 388, conversas: 82, resgates: 31, delta: 38, serie: [110, 130, 150, 180, 210, 250, 160] },
  { id: "4", nome: "Aurora Savassi", insta: "@aurora.savassi", cidade: "Belo Horizonte", uf: "MG", cor: "#C3A6FF", visitas: 980, toques: 301, conversas: 64, resgates: 22, delta: -7, serie: [160, 150, 150, 140, 130, 130, 120] },
  { id: "5", nome: "Aurora Moinhos", insta: "@aurora.moinhos", cidade: "Porto Alegre", uf: "RS", cor: "#FF8FA3", visitas: 760, toques: 214, conversas: 41, resgates: 15, delta: -19, serie: [150, 130, 120, 110, 100, 80, 70] },
  { id: "6", nome: "Aurora Barra", insta: "@aurora.barra", cidade: "Rio de Janeiro", uf: "RJ", cor: "#7FD1FF", visitas: 1530, toques: 466, conversas: 108, resgates: 44, delta: 9, serie: [200, 210, 220, 220, 230, 230, 220] },
  { id: "7", nome: "Aurora Campinas", insta: "@aurora.campinas", cidade: "Campinas", uf: "SP", cor: "#E6E26B", visitas: 870, toques: 252, conversas: 55, resgates: 19, delta: 3, serie: [120, 120, 125, 125, 125, 130, 125] },
  { id: "8", nome: "Aurora Pinheiros", insta: "@aurora.pinheiros", cidade: "São Paulo", uf: "SP", cor: "#8CE99A", visitas: 1420, toques: 441, conversas: 97, resgates: 39, delta: 16, serie: [170, 190, 200, 210, 220, 230, 200] },
  { id: "9", nome: "Aurora Florianópolis", insta: "@aurora.floripa", cidade: "Florianópolis", uf: "SC", cor: "#FFA8D6", visitas: 640, toques: 188, conversas: 36, resgates: 12, delta: 52, serie: [50, 65, 80, 100, 120, 130, 95] },
  { id: "10", nome: "Aurora Brasília", insta: "@aurora.brasilia", cidade: "Brasília", uf: "DF", cor: "#9AA5FF", visitas: 710, toques: 197, conversas: 38, resgates: 13, delta: -3, serie: [105, 105, 100, 100, 100, 100, 100] },
];

export type Metrica = "visitas" | "toques" | "conversas" | "resgates";
export const METRICAS: { id: Metrica; nome: string; cor: string; fundo: string }[] = [
  { id: "visitas", nome: "Visitas", cor: "#2F6B00", fundo: "#EAFBC4" },
  { id: "toques", nome: "Toques", cor: "#00695F", fundo: "#D5F7F2" },
  { id: "conversas", nome: "Conversas", cor: "#6A3FC4", fundo: "#EBE0FF" },
  { id: "resgates", nome: "Vouchers", cor: "#A8481A", fundo: "#FFE6CF" },
];

export const nf = (n: number) => n.toLocaleString("pt-BR");
export const soma = (lojas: LojaDemo[], m: Metrica) => lojas.reduce((a, l) => a + l[m], 0);
