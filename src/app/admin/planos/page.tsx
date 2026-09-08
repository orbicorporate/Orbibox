import { createClient } from "@/lib/supabase/server";
import { getAccessInfo, getAllPlans } from "@/lib/plans";
import { PlanosClient } from "./PlanosClient";

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string }>;
}) {
  const { blocked } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [access, plans] = await Promise.all([getAccessInfo(user!.id), getAllPlans()]);

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">
        Plano e cobrança
      </h1>
      {blocked === "1" ? (
        <p className="mt-1 rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-red-700">
          Sua assinatura está com pendência. Reative um plano abaixo pra voltar a usar o painel.
        </p>
      ) : (
        <p className="mt-1 text-[14px] text-text-secondary">Escolha o plano que faz sentido pro seu negócio.</p>
      )}
      <PlanosClient plans={plans} access={access} />
    </div>
  );
}
