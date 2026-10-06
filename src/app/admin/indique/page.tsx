import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReferralPanel } from "./ReferralPanel";

export default async function IndiquePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: code }, { data: indicacoes }, { data: banco }, { data: sub }] = await Promise.all([
    supabase.rpc("get_or_create_referral_code"),
    supabase.rpc("minhas_indicacoes"),
    supabase.from("referral_bonus_bank").select("meses").eq("user_id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("status").eq("owner_id", user.id).maybeSingle(),
  ]);

  const amigos = (indicacoes ?? []).map((i) => ({
    nome: i.nome,
    estado:
      i.status === "credited" ? ("assinou" as const)
      : i.status === "reversed" ? ("parou" as const)
      : i.assinatura === "trialing" ? ("testando" as const)
      : i.assinatura === "canceled" ? ("parou" as const)
      : ("conta" as const),
  }));

  return (
    <ReferralPanel
      code={(code as string) ?? ""}
      amigos={amigos}
      mesesGuardados={banco?.meses ?? 0}
      statusPlano={sub?.status ?? null}
    />
  );
}
