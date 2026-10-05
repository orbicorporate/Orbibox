// Pontos de partida por tipo de negócio. Escolher um no cadastro já deixa a
// página com a cara do ramo: a pergunta da tela inicial, as categorias do
// catálogo e um primeiro voucher sugerido. Tudo editável depois.
export type Segmento = {
  id: string;
  rotulo: string;
  categorias: string[];
  pergunta: string;
  /** Ramo em que o "Conhecer" importa mais que o catálogo. */
  servico?: boolean;
  /** Vitrine de exemplo do Inspire-se mais parecida. */
  tema?: string;
  voucher?: { title: string; discountType: "percent" | "fixed"; discountValue: number; quantity: number; horas: number };
};

export const SEGMENTOS: Segmento[] = [
  { id: "doceria", rotulo: "Doceria e confeitaria", categorias: ["Bolos", "Doces", "Encomendas"], pergunta: "Qual doce vai adoçar seu dia?", tema: "doceria", voucher: { title: "10% na primeira encomenda", discountType: "percent", discountValue: 10, quantity: 30, horas: 168 } },
  { id: "restaurante", rotulo: "Restaurante e café", categorias: ["Pratos", "Bebidas", "Sobremesas"], pergunta: "Com fome de quê hoje?", tema: "restaurante", voucher: { title: "10% no primeiro pedido", discountType: "percent", discountValue: 10, quantity: 30, horas: 48 } },
  { id: "sorveteria", rotulo: "Sorveteria e açaí", categorias: ["Sorvetes", "Açaí", "Picolés"], pergunta: "Qual sabor hoje?", tema: "sorveteria", voucher: { title: "20% no segundo açaí", discountType: "percent", discountValue: 20, quantity: 30, horas: 48 } },
  { id: "moda", rotulo: "Moda e acessórios", categorias: ["Novidades", "Roupas", "Acessórios"], pergunta: "Procurando o look de hoje?", tema: "moda", voucher: { title: "10% na primeira compra", discountType: "percent", discountValue: 10, quantity: 30, horas: 168 } },
  { id: "beleza", rotulo: "Beleza e estética", categorias: ["Cabelo", "Estética", "Pacotes"], pergunta: "Que cuidado você merece hoje?", servico: true, tema: "salao", voucher: { title: "15% no primeiro atendimento", discountType: "percent", discountValue: 15, quantity: 20, horas: 168 } },
  { id: "loja", rotulo: "Loja e presentes", categorias: ["Mais vendidos", "Presentes", "Novidades"], pergunta: "Procurando um presente?", tema: "loja", voucher: { title: "10% na primeira compra", discountType: "percent", discountValue: 10, quantity: 30, horas: 168 } },
  { id: "servicos", rotulo: "Serviços", categorias: ["Serviços", "Como funciona"], pergunta: "Como podemos te ajudar?", servico: true, tema: "servicos", voucher: { title: "10% no primeiro serviço", discountType: "percent", discountValue: 10, quantity: 20, horas: 720 } },
];

export function segmentoPorId(id: string | null | undefined): Segmento | null {
  return SEGMENTOS.find((s) => s.id === id) ?? null;
}
