import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { VouchersOverviewPanel } from "./VouchersOverviewPanel";

export default async function VouchersOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  if (!businessId) notFound();

  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || (await headers()).get("host") || "orbibox-orbi-app.vercel.app";
  const [{ data: business }, { data: vouchers }, { data: redemptions }] = await Promise.all([
    supabase.from("businesses").select("slug").eq("id", businessId).maybeSingle(),
    supabase.from("vouchers").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    supabase.from("voucher_redemptions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
  ]);

  const linkBase = business?.slug ? `${host.includes("localhost") ? "http" : "https"}://${host}/${business.slug}` : null;

  return <VouchersOverviewPanel linkBase={linkBase} businessId={businessId} initialVouchers={vouchers ?? []} initialRedemptions={redemptions ?? []} />;
}
