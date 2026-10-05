// Base de ajuda da Orbi dentro do painel. Respostas curtas, em passos, e
// sempre com um botão que leva direto pra onde a coisa se faz. A busca é
// local (rápida e grátis); o que não estiver aqui vai pra IA.
export type Ajuda = {
  id: string;
  pergunta: string;
  palavras: string[];
  passos: string[];
  acao?: { rotulo: string; href: string };
  /** Telas em que essa pergunta aparece como sugestão. */
  telas?: string[];
};

export const AJUDAS: Ajuda[] = [
  { id: "preco", pergunta: "Como coloco o preço de um produto?", palavras: ["preço", "preco", "valor", "quanto custa", "r$"], telas: ["/admin/vitrine"],
    passos: ["Abra o Catálogo e toque no item.", "Em Preço, escolha Preço exato, A partir de, Faixa de preço ou Sob consulta.", "Digite o valor com vírgula, tipo 49,90, e toque fora do campo pra salvar."],
    acao: { rotulo: "Abrir Catálogo", href: "/admin/vitrine" } },
  { id: "novo-item", pergunta: "Como adiciono um produto ou serviço?", palavras: ["adicionar", "novo item", "produto", "serviço", "servico", "cadastrar"], telas: ["/admin/vitrine", "/admin"],
    passos: ["No Catálogo, toque em + Novo item.", "Coloque nome, foto e preço.", "Toque em Publicar no catálogo. Pronto, já aparece no seu link."],
    acao: { rotulo: "Adicionar item agora", href: "/admin/vitrine?novo=1" } },
  { id: "importar", pergunta: "Dá pra puxar meus produtos do meu site?", palavras: ["importar", "site", "puxar", "trazer produtos", "automático", "automatico"], telas: ["/admin/vitrine"],
    passos: ["No Catálogo, toque em Importar do site.", "Cole o endereço do seu site.", "A Orbi lê tudo e monta os cards sozinha. Depois é só revisar."],
    acao: { rotulo: "Abrir Catálogo", href: "/admin/vitrine" } },
  { id: "publicar", pergunta: "Por que meu item não aparece no link?", palavras: ["não aparece", "nao aparece", "rascunho", "publicar", "sumiu", "invisível"], telas: ["/admin/vitrine"],
    passos: ["Item em Rascunho ninguém vê.", "Abra o item e toque em Publicar no catálogo.", "Se tiver agendamento, ele só aparece nas datas escolhidas."],
    acao: { rotulo: "Abrir Catálogo", href: "/admin/vitrine" } },
  { id: "foto", pergunta: "Como troco a foto de um item?", palavras: ["foto", "imagem", "trocar foto", "capa"], telas: ["/admin/vitrine"],
    passos: ["Toque no item no Catálogo.", "Em Foto, envie uma do celular ou use Buscar foto pronta.", "A foto segue o formato do card. Pra mudar o recorte, troque o formato."],
    acao: { rotulo: "Abrir Catálogo", href: "/admin/vitrine" } },
  { id: "whatsapp", pergunta: "Como coloco meu WhatsApp na página?", palavras: ["whatsapp", "zap", "telefone", "número", "numero", "contato"], telas: ["/admin/boxes", "/admin"],
    passos: ["Em Sua marca, abra Contatos e coloque seu WhatsApp com DDD.", "Em Botões, crie o botão Fale no WhatsApp pra ele aparecer em destaque.", "Mesmo sem o botão, a página mostra um atalho de WhatsApp embaixo."],
    acao: { rotulo: "Abrir Contatos", href: "/admin/config/marca#contatos" } },
  { id: "endereco", pergunta: "Como mostro meu endereço com mapa?", palavras: ["endereço", "endereco", "mapa", "waze", "como chegar", "localização"], telas: ["/admin/boxes"],
    passos: ["Em Botões, toque em Botão de endereço.", "Cole seu endereço.", "O botão já abre no Waze e no Google Maps."],
    acao: { rotulo: "Abrir Botões", href: "/admin/boxes" } },
  { id: "ordem", pergunta: "Como mudo a ordem dos botões?", palavras: ["ordem", "mover", "primeiro", "subir", "posição", "organizar"], telas: ["/admin/boxes"],
    passos: ["Em Botões, use as setinhas ↑ ↓ de cada botão.", "O primeiro da lista é o mais visto, deixe ali o que mais importa.", "A prévia ao vivo no canto mostra o resultado na hora."],
    acao: { rotulo: "Abrir Botões", href: "/admin/boxes" } },
  { id: "desligar", pergunta: "Como escondo um botão sem apagar?", palavras: ["esconder", "desligar", "ocultar", "tirar", "desativar"], telas: ["/admin/boxes"],
    passos: ["Em Botões, use a chave liga e desliga do botão.", "Desligado, some da página mas fica guardado pra quando quiser."],
    acao: { rotulo: "Abrir Botões", href: "/admin/boxes" } },
  { id: "voucher", pergunta: "Como crio um voucher de desconto?", palavras: ["voucher", "cupom", "desconto", "promoção", "promocao", "oferta"], telas: ["/admin", "/admin/vouchers"],
    passos: ["Em Vouchers, toque em + Novo voucher.", "Escolha o desconto, quantos vão existir e o prazo pra usar.", "Ligue o botão Vouchers na sua página pra ele aparecer."],
    acao: { rotulo: "Criar voucher agora", href: "/admin/vouchers?novo=1" } },
  { id: "resgate", pergunta: "Como confiro o código de um voucher?", palavras: ["validar", "conferir código", "codigo", "resgate", "qr"], telas: ["/admin/vouchers"],
    passos: ["O cliente mostra o código ou o QR no balcão.", "Em Vouchers, use Resgatar código: digite ou escaneie o QR.", "Cada código vale uma vez só, então não tem risco de usar duas vezes."],
    acao: { rotulo: "Abrir Vouchers", href: "/admin/vouchers" } },
  { id: "gift", pergunta: "Como funciona o vale-presente?", palavras: ["gift", "presente", "vale-presente", "vale presente", "presentear"], telas: ["/admin/gift"],
    passos: ["Em Gift Cards, ligue o vale-presente e escolha a arte.", "O cliente monta o presente na sua página e fala com você no WhatsApp pra pagar.", "Quando receber, marque como pago e a arte é liberada."],
    acao: { rotulo: "Abrir Gift Cards", href: "/admin/gift" } },
  { id: "compartilhar", pergunta: "Como divulgo meu link?", palavras: ["divulgar", "compartilhar", "link", "bio", "instagram", "qr code", "mandar"], telas: ["/admin"],
    passos: ["No Início, toque em Compartilhar Orbibox.", "Cole o link na bio do Instagram e nos stories.", "Mande no WhatsApp e em grupos do bairro. O QR Code serve pro balcão."],
    acao: { rotulo: "Ir pro Início", href: "/admin" } },
  { id: "logo", pergunta: "Como coloco meu logo e minhas cores?", palavras: ["logo", "logotipo", "cor", "cores", "marca", "identidade"], telas: ["/admin/config"],
    passos: ["Em Sua marca, envie o logotipo.", "Em Cores, escolha as cores da página e da esfera da Orbi.", "Tudo muda na hora na sua página."],
    acao: { rotulo: "Abrir Sua marca", href: "/admin/config/marca" } },
  { id: "ensinar", pergunta: "Como ensino a Orbi sobre meu negócio?", palavras: ["ensinar", "orbi", "ia", "responder", "sabe", "atendimento", "tom"], telas: ["/admin/agent", "/admin"],
    passos: ["Em Sua IA, toque em Deixa a Orbi preencher sozinha.", "Ela lê seu site ou faz 5 perguntas rápidas.", "Revise o texto e ajuste o jeito dela falar."],
    acao: { rotulo: "Abrir Sua IA", href: "/admin/agent" } },
  { id: "resultados", pergunta: "O que significam os números de Resultados?", palavras: ["números", "numeros", "visitas", "interesses", "resultado", "pulse", "métricas", "metricas", "conversão"], telas: ["/admin/pulse", "/admin"],
    passos: ["Visitas: quantas vezes abriram seu link.", "Interesses: quantos escolheram um botão na tela inicial.", "Ações: cliques em produto, WhatsApp e links. É o número que mais importa."],
    acao: { rotulo: "Abrir Resultados", href: "/admin/pulse" } },
  { id: "conversas", pergunta: "Onde vejo quem falou com a Orbi?", palavras: ["conversas", "mensagens", "clientes", "leads", "contatos", "quem falou"], telas: ["/admin/conversas"],
    passos: ["Em Conversas você vê cada pessoa que conversou ou deixou o WhatsApp.", "A Orbi sugere a mensagem pronta pra você mandar.", "Use as listas pra falar com vários de uma vez."],
    acao: { rotulo: "Abrir Conversas", href: "/admin/conversas" } },
  { id: "plano", pergunta: "Qual a diferença entre os planos?", palavras: ["plano", "assinar", "preço do plano", "nióbio", "niobio", "titânio", "titanio", "pagar"], telas: [],
    passos: ["Titânio: página, catálogo e botões.", "Nióbio: tudo isso mais a Orbi conversando com seus clientes e os vouchers.", "Dá pra trocar quando quiser."],
    acao: { rotulo: "Ver planos", href: "/admin/planos" } },
];

function normalizar(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Melhor resposta local pra uma pergunta, ou null se nada bater bem. */
export function buscarAjuda(texto: string): Ajuda | null {
  const q = normalizar(texto);
  if (q.trim().length < 3) return null;
  let melhor: { a: Ajuda; nota: number } | null = null;
  for (const a of AJUDAS) {
    let nota = 0;
    for (const p of a.palavras) if (q.includes(normalizar(p))) nota += p.length > 6 ? 2 : 1;
    if (normalizar(a.pergunta) === q) nota += 5;
    if (nota > 0 && (!melhor || nota > melhor.nota)) melhor = { a, nota };
  }
  return melhor?.a ?? null;
}

/** Sugestões pra tela atual (até 3). */
export function sugestoesDaTela(pathname: string): Ajuda[] {
  const exatas = AJUDAS.filter((a) => a.telas?.some((t) => (t === "/admin" ? pathname === "/admin" : pathname.startsWith(t))));
  return (exatas.length ? exatas : AJUDAS.filter((a) => a.telas?.includes("/admin"))).slice(0, 3);
}
