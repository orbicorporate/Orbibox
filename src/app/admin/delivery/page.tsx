import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { lerApps } from "@/lib/delivery";
import { DeliveryEditor } from "./DeliveryEditor";

export const metadata = { title: "Delivery" };

export default async function DeliveryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const { data: boxes } = await supabase.from("smart_boxes").select("id, config, position, is_active").eq("business_id", businessId!).eq("box_type", "custom");
  const box = (boxes ?? []).find((b) => (b.config as { action?: string } | null)?.action === "delivery") ?? null;
  const { count } = await supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", businessId!);
  const cfg = (box?.config ?? {}) as Record<string, unknown>;
  return <DeliveryEditor businessId={businessId!} boxId={box?.id ?? null} config={cfg} apps={lerApps(cfg.apps)} ativo={box?.is_active ?? true} totalBoxes={count ?? 0} />;
}
