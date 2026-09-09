import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessInfo } from "@/lib/plans";
import { VouchersManager } from "./VouchersManager";

export default async function VouchersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = await getAccessInfo(user!.id);

  if (!access.hasVouchers) {
    return (
      <div className="flex flex-col">
        <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Cupons</h1>
        <div className="mt-6 rounded-2xl border border-divider bg-surface-white p-6">
          <p className="text-[15px] font-medium">Isso é exclusivo do plano Nióbio 💎</p>
          <p className="mt-1 text-[14px] text-text-secondary">
            Crie cupons com estoque limitado, gere um código único por resgate e confira na hora do atendimento —
            sem risco de alguém usar o mesmo cupom duas vezes.
          </p>
          <Link
            href="/admin/planos"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-button-primary px-5 py-2.5 text-[14px] font-medium text-white"
          >
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();

  const { data: vouchers } = await supabase
    .from("vouchers")
    .select("*")
    .eq("business_id", business!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Cupons</h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        Crie cupons com estoque limitado. Cada resgate gera um código único, sem risco de uso duplicado.
      </p>
      <VouchersManager businessId={business!.id} initialVouchers={vouchers ?? []} />
    </div>
  );
}
