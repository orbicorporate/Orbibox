import { createClient } from "@/lib/supabase/server";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { getCurrentBusinessId } from "@/lib/business";
import { VouchersManager } from "./VouchersManager";

export default async function VouchersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const access = businessId ? await getAccessInfoForBusiness(businessId) : null;
  const canSave = !!access?.hasVouchers;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId!)
    .single();

  // Titânio pode montar o cupom pra ver como é, mas não tem cupons salvos.
  const { data: vouchers } = canSave
    ? await supabase.from("vouchers").select("*").eq("business_id", business!.id).order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Cupons</h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        Crie cupons com estoque limitado. Cada resgate gera um código único, sem risco de uso duplicado.
      </p>

      {!canSave && (
        <div className="mt-4 rounded-2xl border border-orbi-gradient-start/40 bg-surface-white p-5">
          <p className="text-[14px] font-semibold">✦ Como funcionam os cupons</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
            Você cria uma oferta (ex: 10% off, 50 unidades). Cada cliente resgata na sua página e recebe um código
            único. Na hora do atendimento, você digita o código e ele é validado na hora, sem risco de alguém usar
            duas vezes. É controle de promoção com tecnologia de verdade, exclusivo do Nióbio.
          </p>
          <p className="mt-2 text-[12.5px] text-text-tertiary">
            Monte seu cupom abaixo pra ver como é. Na hora de salvar, você ativa o Nióbio.
          </p>
        </div>
      )}

      <VouchersManager businessId={business!.id} initialVouchers={vouchers ?? []} canSave={canSave} />
    </div>
  );
}
