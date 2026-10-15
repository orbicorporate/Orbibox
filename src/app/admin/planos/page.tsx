import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessInfo, getAllPlans } from "@/lib/plans";
import { getCurrentBusinessId } from "@/lib/business";
import { PlanosClient } from "./PlanosClient";
import { ConfirmandoPagamento } from "./ConfirmandoPagamento";
import { ValorEntregueCard } from "./ValorEntregueCard";
import { calcularValorEntregue, linhasDoValor } from "@/lib/valorEntregue";

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string; checkout?: string; fim?: string }>;
}) {
  const { blocked, checkout, fim } = await searchParams;
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

  // Paywall por valor: durante e depois do teste sem cartão, a tela começa
  // pelo que o Orbibox fez de verdade, não pela tabela de preços.
  const mostrarValor = access.testeSemCartao || fim === "1";
  const valor = mostrarValor && businessId ? await calcularValorEntregue(supabase, businessId) : null;
  const linhas = valor ? linhasDoValor(valor) : [];
  const { data: negocio } = mostrarValor && businessId ? await supabase.from("businesses").select("name").eq("id", businessId).maybeSingle() : { data: null };

  return (
    <div className="flex flex-col">
      {mostrarValor && (
        <ValorEntregueCard
          rotulo={access.testeAcabou || fim === "1" ? "Seu teste terminou" : access.diasRestantes != null ? (access.diasRestantes === 0 ? "Último dia de teste" : `Faltam ${access.diasRestantes} ${access.diasRestantes === 1 ? "dia" : "dias"} de teste`) : "Teste grátis"}
          titulo={linhas.length > 0 ? "Seu Orbibox trabalhou por você" : "Seu Orbibox está pronto pra trabalhar"}
          linhas={linhas}
          vazio={`${negocio?.name ?? "Sua página"} já tem vitrine, IA e link prontos. Assim que você divulgar, cada visita, conversa e contato aparece aqui.`}
          fecho={access.testeAcabou || fim === "1" ? "Continue com seu Orbibox ativo: a IA volta a atender e as ofertas voltam pro ar." : "Assine quando quiser. Os dias de teste que faltam continuam grátis."}
        />
      )}
      <h1 id="planos" className={`scroll-mt-24 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em] ${mostrarValor ? "" : "mt-2"}`}>
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
          <p className="font-[family-name:var(--font-manrope)] text-[17px] font-semibold">Sua Orbi neste mês</p>
          <p className="mt-0.5 text-[12.5px] text-text-tertiary">O que ainda dá pra usar no seu plano. Zera no dia 1º de cada mês.</p>
          {[
            u.conteudo_limite > 0 && { chave: "textos", titulo: "Textos que a Orbi escreve", sub: "Legendas, stories e mensagens de WhatsApp", usado: u.conteudo_usado, limite: u.conteudo_limite },
            u.chat_limite > 0 && { chave: "chat", titulo: "Conversas com seus visitantes", sub: "Quando alguém fala com a Orbi no seu link", usado: u.chat_usado, limite: u.chat_limite },
          ].map((l) => {
            if (!l) return null;
            const restam = Math.max(0, l.limite - l.usado);
            const pct = Math.min(100, (l.usado / l.limite) * 100);
            const quase = pct >= 80;
            return (
              <div key={l.chave} className="mt-5">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium leading-tight">{l.titulo}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-text-tertiary">{l.sub}</p>
                  </div>
                  <p className="shrink-0 text-right leading-none">
                    <span className={`block font-[family-name:var(--font-manrope)] text-[26px] font-semibold tabular-nums ${quase ? "text-[#B45309]" : ""}`}>{restam}</span>
                    <span className="mt-1 block text-[11.5px] text-text-tertiary">{restam === 1 ? "disponível" : "disponíveis"}</span>
                  </p>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.07]">
                  <div className={`h-full rounded-full ${quase ? "bg-[#F59E0B]" : "orbi-gradient"}`} style={{ width: `${l.usado > 0 ? Math.max(4, pct) : 0}%` }} />
                </div>
                <p className="mt-1.5 text-[12px] text-text-tertiary">{l.usado} de {l.limite} usados</p>
              </div>
            );
          })}
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
