import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { ReservasEditor } from "./ReservasEditor";

export const metadata = { title: "Reservas" };

export default async function ReservasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const [{ data: boxes }, { count }, { data: cfg }, { data: lista }, { data: negocio }] = await Promise.all([
    supabase.from("smart_boxes").select("id, config, is_active").eq("business_id", businessId!).eq("box_type", "custom"),
    supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", businessId!),
    supabase.from("reservas_config").select("*").eq("business_id", businessId!).maybeSingle(),
    supabase.from("reservas").select("*").eq("business_id", businessId!).order("data", { ascending: true }).order("hora", { ascending: true }).limit(300),
    supabase.from("businesses").select("name").eq("id", businessId!).maybeSingle(),
  ]);
  const box = (boxes ?? []).find((b) => (b.config as { action?: string } | null)?.action === "reserva") ?? null;
  return <ReservasEditor businessId={businessId!} nomeNegocio={negocio?.name ?? ""} boxId={box?.id ?? null} ativo={box?.is_active ?? true} totalBoxes={count ?? 0} config={cfg ?? null} reservas={lista ?? []} />;
}
