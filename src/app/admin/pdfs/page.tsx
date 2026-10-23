import { BloqueioGratis } from "@/components/ui/BloqueioGratis";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { lerPdfs } from "@/lib/cardapio";
import { CentralPdfs, type BotaoPdf } from "./CentralPdfs";

export const metadata = { title: "PDFs da marca" };

const MARCA = "/object/public/cardapios-pdf/";

export default async function PdfsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);

  if (businessId && (await getAccessInfoForBusiness(businessId)).isFree) {
    return <BloqueioGratis recurso="PDFs da marca" descricao="Cardápio de Natal, tabela de preços e catálogos em PDF, direto na sua página." itens={["Botão que abre o PDF na Home","Reduz o arquivo sozinho para abrir rápido","Troque o arquivo sempre que precisar"]} />;
  }  const { data: boxes } = await supabase
    .from("smart_boxes")
    .select("id, title, config, is_active")
    .eq("business_id", businessId!)
    .eq("box_type", "custom")
    .order("position", { ascending: true });

  const lista = boxes ?? [];
  const cardapio = lista.find((b) => (b.config as { action?: string } | null)?.action === "cardapio") ?? null;
  // Botões de PDF da Home: botões personalizados que abrem um arquivo guardado aqui.
  const botoes: BotaoPdf[] = lista
    .filter((b) => {
      const c = (b.config ?? {}) as { action?: string; url?: string };
      return c.action === "link" && typeof c.url === "string" && c.url.includes(MARCA);
    })
    .map((b) => ({ id: b.id, titulo: ((b.config as { label?: string } | null)?.label ?? b.title) || "PDF", url: (b.config as { url: string }).url, ativo: b.is_active }));

  return (
    <CentralPdfs
      businessId={businessId!}
      botoes={botoes}
      cardapio={cardapio ? { boxId: cardapio.id, config: (cardapio.config ?? {}) as Record<string, unknown>, pdfs: lerPdfs(cardapio.config) } : null}
    />
  );
}
