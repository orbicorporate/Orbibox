import { BloqueioGratis } from "@/components/ui/BloqueioGratis";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { MateriaisEditor } from "./MateriaisEditor";

export const metadata = { title: "Materiais" };

export default async function MateriaisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);

  if (businessId && (await getAccessInfoForBusiness(businessId)).isFree) {
    return <BloqueioGratis recurso="Materiais" descricao="Tabelas de preço, catálogos e outros PDFs para seus clientes baixarem." itens={["Até vários arquivos em um só botão","Opção de pedir o contato antes de baixar"]} />;
  }  const [{ data: boxes }, { count: totalBoxes }] = await Promise.all([
    supabase.from("smart_boxes").select("id, config, is_active").eq("business_id", businessId!).eq("box_type", "custom"),
    supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
  ]);
  const box = (boxes ?? []).find((b) => (b.config as { action?: string } | null)?.action === "materiais") ?? null;
  return (
    <MateriaisEditor
      businessId={businessId!}
      boxId={box?.id ?? null}
      config={(box?.config ?? {}) as Record<string, unknown>}
      ativo={box?.is_active ?? true}
      totalBoxes={totalBoxes ?? 0}
    />
  );
}
