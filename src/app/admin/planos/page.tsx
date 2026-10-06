import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessInfo, getAllPlans } from "@/lib/plans";
import { getCurrentBusinessId } from "@/lib/business";
import { PlanosClient } from "./PlanosClient";
import { ConfirmandoPagamento } from "./ConfirmandoPagamento";

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string; checkout?: string }>;
}) {
  const { blocked, checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [access, plans] = await Promise.all([getAccessInfo(user!.id), getAllPlans()]);

  // Uso de IA do mês, pra mostrar o medidor.
  const businessId = await getCurrentBusinessId(user!.id);
  const { data: uso } = businessId ? await supabase.rpc("uso_ia", { p_business_id: businessId }) : { data: null };
  const u = uso as { conteudo_usado: number; conteudo_limite: number; chat_usado: number; chat_limite: number } | null;

  // Vouchers resgatados no ciclo atual, 1 real cada, cobrado junto da
  // próxima fatura da assinatura (não é cobrança avulsa na hora).
  const billingPeriod = new Date().toISOString().slice(0, 7);
  const { count: vouchersCobrados } = await supabase
    .from("voucher_billing_events")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user!.id)
    .eq("billing_period", billingPeriod);

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

      {checkout === "success" && (() => {
        const st = access.subscription?.status;
        if (st === "active" || st === "trialing") {
          const fimTeste = st === "trialing" && access.subscription?.trial_ends_at
            ? new Date(access.subscription.trial_ends_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
            : null;
          return (
            <div className="mt-4 rounded-2xl bg-[#E7F6EC] px-4 py-3.5 ring-1 ring-[#BFE6CC]">
              <p className="text-[15px] font-semibold text-[#14632F]">Assinatura confirmada 🎉</p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-[#1F7A3D]">
                {fimTeste ? `Seu teste grátis vai até ${fimTeste}. A primeira cobrança só acontece depois disso, e dá pra cancelar antes.` : "Tudo liberado. Obrigado por assinar o Orbibox."}
              </p>
            </div>
          );
        }
        return <ConfirmandoPagamento />;
      })()}
      {checkout === "canceled" && (
        <p className="mt-4 rounded-2xl bg-surface-soft px-4 py-3 text-[14px] text-text-secondary">
          Você saiu do pagamento antes de terminar. Nada foi cobrado. Quando quiser, é só escolher o plano de novo.
        </p>
      )}

      <Link href="/admin/indique" className="mt-4 flex items-center justify-between rounded-2xl bg-[#111318] px-4 py-3.5 text-white">
        <span className="text-[14px] font-medium">Indique amigos e ganhe 1 mês grátis por amigo</span>
        <span className="text-white/60" aria-hidden>→</span>
      </Link>

      {/* Medidor de uso da IA no mês */}
      {u && (u.conteudo_limite > 0 || u.chat_limite > 0) && (
        <div className="mt-5 rounded-[22px] border border-divider bg-surface-white p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Uso da Orbi este mês</p>
          <p className="mt-1 text-[12px] text-text-tertiary">Renova todo dia 1º.</p>
          {u.conteudo_limite > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium">Textos gerados (legenda, story, WhatsApp)</span>
                <span className="text-text-secondary">{u.conteudo_usado} de {u.conteudo_limite}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-soft">
                <div className="h-full rounded-full orbi-gradient" style={{ width: `${Math.min(100, (u.conteudo_usado / u.conteudo_limite) * 100)}%` }} />
              </div>
            </div>
          )}
          {u.chat_limite > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium">Conversas da Orbi com visitantes</span>
                <span className="text-text-secondary">{u.chat_usado} de {u.chat_limite}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-soft">
                <div className="h-full rounded-full orbi-gradient" style={{ width: `${Math.min(100, (u.chat_usado / u.chat_limite) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {!!vouchersCobrados && vouchersCobrados > 0 && (
        <div className="mt-5 rounded-[22px] border border-divider bg-surface-white p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Vouchers resgatados este ciclo</p>
          <p className="mt-1 text-[12px] text-text-tertiary">R$ 1,00 por voucher resgatado por um cliente, somado e cobrado junto da sua próxima fatura.</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold">{vouchersCobrados}</span>
            <span className="text-[13px] text-text-secondary">{vouchersCobrados === 1 ? "voucher" : "vouchers"}</span>
            <span className="ml-auto text-[15px] font-medium text-text-secondary">R$ {(vouchersCobrados * 1).toFixed(2).replace(".", ",")}</span>
          </div>
        </div>
      )}

      <PlanosClient plans={plans} access={access} />
    </div>
  );
}
