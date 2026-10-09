import type { ThemePhoto } from "@/lib/vitrineThemes";

export type InspireLanding = Record<string, { photos: ThemePhoto[]; titleStyle: "faixa" | "sobre" }>;

/** Negócios de exemplo da landing. Nomes fictícios; fotos reais do Inspire-se. */
export type TemaLanding = {
  id: string; // id do tema no Inspire-se
  chip: string;
  nome: string;
  frase: string;
  pergunta: string;
  cor: string;
  principal: string;
  fotos: string; // rótulo da seção de produtos
};

export const TEMAS_LANDING: TemaLanding[] = [
  { id: "restaurante", chip: "Restaurante", nome: "Trattoria Sol", frase: "Cozinha italiana de forno a lenha, no coração da cidade.", pergunta: "Com fome de quê hoje?", cor: "#9A3B2E", principal: "Cardápio", fotos: "Mais pedidos" },
  { id: "moda", chip: "Moda", nome: "Ateliê Linha", frase: "Peças atemporais, feitas em pequenas séries.", pergunta: "O que você procura?", cor: "#2E3A4A", principal: "Nova coleção", fotos: "Destaques" },
  { id: "doceria", chip: "Doceria", nome: "Casa Açúcar", frase: "Doces artesanais para adoçar o seu dia.", pergunta: "Qual é o doce de hoje?", cor: "#B76E79", principal: "Cardápio de doces", fotos: "Queridinhos" },
  { id: "joalheria", chip: "Joalheria", nome: "Maison Aurora", frase: "Joias exclusivas para momentos que ficam.", pergunta: "Para quem é o presente?", cor: "#B8860B", principal: "Coleções", fotos: "Em destaque" },
  { id: "fitness", chip: "Fitness", nome: "Move Studio", frase: "Roupas para treinar com conforto e estilo.", pergunta: "Pronto para o treino?", cor: "#3F6B52", principal: "Lançamentos", fotos: "Mais vendidos" },
  { id: "arquitetura", chip: "Arquitetura", nome: "Estúdio Prisma", frase: "Projetos que unem luz, espaço e pessoas.", pergunta: "Qual projeto você imagina?", cor: "#4A4F57", principal: "Portfólio", fotos: "Projetos recentes" },
];
