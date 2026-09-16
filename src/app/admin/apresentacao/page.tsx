import { ApresentacaoOrbibox } from "@/components/apresentacao/ApresentacaoOrbibox";

/** Versão dentro do app: aparece logo depois do cadastro, antes do tour
 * guiado. O botão final leva pro tour; Pular vai direto pro painel. */
export default function ApresentacaoAppPage() {
  return (
    <ApresentacaoOrbibox
      finalHref="/admin/agent?tour=0"
      finalLabel="Começar o tour rápido"
      skipHref="/admin"
      skipLabel="Pular"
    />
  );
}
