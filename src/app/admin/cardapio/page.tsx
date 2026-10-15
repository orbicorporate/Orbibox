import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { lerApps } from "@/lib/delivery";
import { CardapioEditor } from "./CardapioEditor";

export const metadata = { title: "Cardápio" };

export default async function CardapioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const [{ data: boxes }, { count: totalBoxes }, { data: negocio }] = await Promise.all([
    supabase.from("smart_boxes").select("id, config, is_active").eq("business_id", businessId!).eq("box_type", "custom"),
    supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
    supabase.from("businesses").select("slug").eq("id", businessId!).maybeSingle(),
  ]);
  const box = (boxes ?? []).find((b) => (b.config as { action?: string } | null)?.action === "cardapio") ?? null;
  const delivery = (boxes ?? []).find((b) => (b.config as { action?: string } | null)?.action === "delivery") ?? null;
  const cfgDelivery = (delivery?.config ?? {}) as Record<string, unknown>;
  return (
    <CardapioEditor
      businessId={businessId!}
      boxId={box?.id ?? null}
      config={(box?.config ?? {}) as Record<string, unknown>}
      ativo={box?.is_active ?? true}
      totalBoxes={totalBoxes ?? 0}
      slug={negocio?.slug ?? ""}
      delivery={{ boxId: delivery?.id ?? null, config: cfgDelivery, apps: lerApps(cfgDelivery.apps), ativo: delivery?.is_active ?? true }}
    />
  );
}
