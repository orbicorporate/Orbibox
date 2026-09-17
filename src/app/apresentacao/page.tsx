import type { Metadata } from "next";
import { ApresentacaoOrbibox } from "@/components/apresentacao/ApresentacaoOrbibox";
import { inspireParaApresentacao } from "@/lib/inspireApresentacao";

export const metadata: Metadata = {
  title: "Como funciona o Orbibox",
  description: "Vitrine, IA pessoal, Pulse, Vouchers, Gift e Conversas. Veja o Orbibox funcionando em 1 minuto.",
};

/** Versão pública da apresentação, pra quem ainda não assinou. */
export default async function ApresentacaoPublicaPage() {
  const inspire = await inspireParaApresentacao();
  return <ApresentacaoOrbibox inspire={inspire} finalHref="/signup" finalLabel="Criar meu Orbibox" skipHref="/" skipLabel="Fechar" />;
}
