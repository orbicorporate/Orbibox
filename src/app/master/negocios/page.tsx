import { createClient } from "@/lib/supabase/server";
import { NegociosManager } from "./NegociosManager";

export default async function MasterNegocios() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("master_list_businesses");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold tracking-[-0.02em]">Negócios</h1>
        <p className="mt-1 text-[14px] text-text-secondary">{(data ?? []).length} cadastrados. Gerencie planos, veja o uso e fale com os donos.</p>
      </div>
      <NegociosManager businesses={data ?? []} />
    </div>
  );
}
