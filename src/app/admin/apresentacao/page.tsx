import { ApresentacaoOrbibox } from "@/components/apresentacao/ApresentacaoOrbibox";
import { inspireParaApresentacao } from "@/lib/inspireApresentacao";

/** Versão dentro do app: aparece logo depois do cadastro, antes do tour
 * guiado. O botão final leva pro tour; Pular vai direto pro painel. */
export default async function ApresentacaoAppPage() {
  const inspire = await inspireParaApresentacao();
  return (
    <ApresentacaoOrbibox
      inspire={inspire}
      finalHref="/admin/agent?tour=0"
      finalLabel="Começar o tour rápido"
      skipHref="/admin"
      skipLabel="Pular"
    />
  );
}
