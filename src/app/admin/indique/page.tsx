import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReferralPanel } from "./ReferralPanel";

export default async function IndiquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: code } = await supabase.rpc("get_or_create_referral_code");
  const { data: referrals } = await supabase
    .from("referrals")
    .select("status, created_at, credited_at")
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false });

  const list = referrals ?? [];
  const assinaram = list.filter((r) => r.status === "pending" || r.status === "credited").length;
  const mesesGanhos = list.filter((r) => r.status === "credited").length;
  const naCarencia = list.filter((r) => r.status === "pending").length;

  return (
    <ReferralPanel
      code={(code as string) ?? ""}
      assinaram={assinaram}
      mesesGanhos={mesesGanhos}
      naCarencia={naCarencia}
    />
  );
}
