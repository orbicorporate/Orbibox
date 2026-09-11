import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { notFound } from "next/navigation";
import { VouchersOverviewPanel } from "./VouchersOverviewPanel";

export default async function VouchersOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  if (!businessId) notFound();

  const [{ data: vouchers }, { data: redemptions }] = await Promise.all([
    supabase.from("vouchers").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("voucher_redemptions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
  ]);

  return <VouchersOverviewPanel businessId={businessId} initialVouchers={vouchers ?? []} initialRedemptions={redemptions ?? []} />;
}
