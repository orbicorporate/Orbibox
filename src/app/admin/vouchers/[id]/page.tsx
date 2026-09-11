import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { VoucherDetailPanel } from "./VoucherDetailPanel";

export default async function VoucherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: redemptions } = await supabase
    .from("voucher_redemptions")
    .select("*")
    .eq("voucher_id", id)
    .order("created_at", { ascending: false });

  return <VoucherDetailPanel voucher={voucher} initialRedemptions={redemptions ?? []} />;
}
