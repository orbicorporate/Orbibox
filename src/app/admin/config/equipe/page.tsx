import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadConfigData } from "../loadConfigData";
import { AdminsManager } from "../AdminsManager";

export default async function ConfigEquipePage() {
  const { businessId, isOwner } = await loadConfigData();
  const supabase = await createClient();
  const { data: admins } = await supabase
    .from("business_admins")
    .select("*")
    .eq("business_id", businessId)
    .order("invited_at", { ascending: true });

  return (
    <div className="flex flex-col">
      <Link href="/admin/config" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Configurações</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[30px] font-medium tracking-[-0.02em]">Equipe</h1>
      <AdminsManager businessId={businessId} initialAdmins={admins ?? []} isOwner={isOwner} />
    </div>
  );
}
