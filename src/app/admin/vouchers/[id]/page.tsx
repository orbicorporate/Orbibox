import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { VoucherDetailPanel } from "./VoucherDetailPanel";

export default async function VoucherDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ editar?: string }> }) {
  const { id } = await params;
  const { editar } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  if (!businessId) notFound();

  const { data: voucher } = await supabase
    .from("vouchers")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!voucher) notFound();

  const { data: agentConfig } = await supabase
    .from("agent_configs")
    .select("orbi_colors")
    .eq("business_id", businessId)
    .maybeSingle();

  const { data: redemptions } = await supabase
    .from("voucher_redemptions")
    .select("*")
    .eq("voucher_id", id)
    .order("created_at", { ascending: false });

  const { data: todos } = await supabase
    .from("vouchers")
    .select("id, title, color, image_url, discount_type, discount_value, is_active, show_discount")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return <VoucherDetailPanel abrirEdicao={editar === "1"} todos={todos ?? []} voucher={voucher} initialRedemptions={redemptions ?? []} orbiColors={(agentConfig?.orbi_colors as string[] | null) ?? null} />;
}
