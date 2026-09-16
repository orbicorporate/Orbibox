import type { Metadata } from "next";
import { ApresentacaoOrbibox } from "@/components/apresentacao/ApresentacaoOrbibox";

export const metadata: Metadata = {
  title: "Como funciona o Orbibox",
  description: "Vitrine, IA pessoal, Pulse, Vouchers, Gift e Conversas. Veja o Orbibox funcionando em 1 minuto.",
};

/** Versão pública da apresentação, pra quem ainda não assinou. */
export default function ApresentacaoPublicaPage() {
  return <ApresentacaoOrbibox finalHref="/signup" finalLabel="Criar meu Orbibox" skipHref="/" skipLabel="Fechar" />;
}
