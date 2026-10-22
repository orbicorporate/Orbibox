import type { Metadata } from "next";
import { PaginaLegal, Secao, CONTATO_LEGAL } from "@/components/ui/PaginaLegal";

export const metadata: Metadata = { title: "Política de Privacidade | Orbibox" };

export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de Privacidade" atualizado="22 de outubro de 2026">
      <p>O Orbibox ajuda negócios a terem uma página inteligente, com a Orbi (assistente de IA) e um clube de fãs. Esta política explica quais dados tratamos, para quê e como você controla tudo isso, conforme a Lei Geral de Proteção de Dados (LGPD).</p>

      <Secao titulo="Quais dados coletamos">
        <p>Quando você entra no clube de um Orbibox: nome, foto de perfil, e-mail (se entrar com Google ou e-mail) e o WhatsApp, se você escolher deixar. Também guardamos as avaliações e comentários que você publicar.</p>
        <p>Quando você usa a página de um negócio: dados de uso como visitas, cliques e conversas com a Orbi, para o dono do negócio entender o que funciona.</p>
        <p>Quando você é dono de um Orbibox: e-mail, dados do negócio e o conteúdo que você cadastra.</p>
      </Secao>

      <Secao titulo="Login com Google">
        <p>Se você entrar com Google, recebemos apenas seu nome, e-mail e foto de perfil. Usamos isso para identificar você e validar seu perfil. Não acessamos seus e-mails, contatos, arquivos nem qualquer outro dado da sua conta Google.</p>
      </Secao>

      <Secao titulo="Para que usamos">
        <p>Para criar e manter seu perfil, mostrar suas avaliações, permitir que o negócio fale com você quando você autorizar, evitar fraudes e melhorar o produto. Não vendemos seus dados.</p>
      </Secao>

      <Secao titulo="Quem vê seus dados">
        <p>Seu nome, foto e avaliações aparecem no Orbibox em que você participa, e o perfil de fã pode mostrar as marcas que você segue, se você deixar essa opção ligada. Seu WhatsApp e e-mail só ficam visíveis para o dono do negócio em que você os deixou.</p>
        <p>Usamos prestadores de serviço para operar o produto (hospedagem, banco de dados e IA), que tratam os dados apenas para nos prestar o serviço.</p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p>Você pode pedir acesso, correção ou exclusão dos seus dados, retirar o consentimento de contato por WhatsApp e ocultar suas marcas do seu perfil nas configurações do clube. Para qualquer pedido, escreva para {CONTATO_LEGAL}.</p>
      </Secao>

      <Secao titulo="Por quanto tempo guardamos">
        <p>Enquanto sua conta existir ou for necessário para cumprir obrigações legais. Ao pedir a exclusão, removemos seus dados pessoais, salvo o que a lei nos obrigar a manter.</p>
      </Secao>

      <Secao titulo="Contato">
        <p>Dúvidas sobre esta política: {CONTATO_LEGAL}.</p>
      </Secao>
    </PaginaLegal>
  );
}
