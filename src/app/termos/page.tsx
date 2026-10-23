import type { Metadata } from "next";
import { PaginaLegal, Secao, CONTATO_LEGAL } from "@/components/ui/PaginaLegal";

export const metadata: Metadata = { title: "Termos de Uso | Orbibox" };

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de Uso" atualizado="22 de outubro de 2026">
      <p>Ao usar o Orbibox, você concorda com estes termos. Se não concordar, não use o serviço.</p>

      <Secao titulo="O que é o Orbibox">
        <p>Uma plataforma para negócios criarem uma página inteligente com a Orbi, vitrine de produtos, voucher e um radar de fãs.</p>
      </Secao>

      <Secao titulo="Sua conta">
        <p>Você é responsável pelas informações que cadastra e por manter o acesso à sua conta seguro. Donos de negócio respondem pelo conteúdo que publicam e pelo contato que fazem com clientes, que deve respeitar a lei e a autorização dada por cada pessoa.</p>
      </Secao>

      <Secao titulo="Uso permitido">
        <p>Não é permitido usar o Orbibox para fraude, spam, conteúdo ilegal, ofensivo ou que viole direitos de terceiros. Avaliações e comentários devem ser verdadeiros e baseados na sua experiência.</p>
      </Secao>

      <Secao titulo="Conteúdo gerado pela Orbi">
        <p>A Orbi usa inteligência artificial e pode errar. O dono do negócio deve revisar o que for publicado em nome dele.</p>
      </Secao>

      <Secao titulo="Disponibilidade e mudanças">
        <p>Trabalhamos para manter o serviço no ar, mas não garantimos que ele nunca terá falhas. Podemos atualizar o produto e estes termos, e avisaremos sobre mudanças relevantes.</p>
      </Secao>

      <Secao titulo="Privacidade">
        <p>O tratamento de dados pessoais está descrito na Política de Privacidade, em /privacidade.</p>
      </Secao>

      <Secao titulo="Contato">
        <p>Dúvidas: {CONTATO_LEGAL}.</p>
      </Secao>
    </PaginaLegal>
  );
}
