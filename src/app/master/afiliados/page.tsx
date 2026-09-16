import { createClient } from "@/lib/supabase/server";
import { EmbaixadoresManager } from "./EmbaixadoresManager";

export default async function MasterEmbaixadores() {
  const supabase = await createClient();

  const [{ data: embaixadores }, { data: bonusLinks }] = await Promise.all([
    supabase.rpc("master_list_affiliates"),
    supabase
      .from("bonus_links")
      .select("id, code, label, kind, max_uses, uses, active")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold tracking-[-0.02em]">Embaixadores</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          Parceiros que indicam o Orbibox e ganham comissão, e links que liberam acesso de cortesia.
        </p>
      </div>
      <EmbaixadoresManager embaixadores={embaixadores ?? []} bonusLinks={bonusLinks ?? []} />
    </div>
  );
}
