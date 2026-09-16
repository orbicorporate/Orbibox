import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

export default async function MasterOverview() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("master_metrics");
  const m = (data ?? {}) as Record<string, number>;

  // Status da IA: se está sem crédito, alerta vermelho no topo (só o master vê).
  const { data: aiStatus } = await supabase.from("ai_status").select("sem_credito_desde, ultima_falha_em").eq("id", 1).maybeSingle();
  const semCredito = !!aiStatus?.sem_credito_desde;

  const cards = [
    { label: "Negócios cadastrados", value: m.total_businesses ?? 0, sub: `${m.new_this_month ?? 0} novos este mês` },
    { label: "Receita recorrente (MRR)", value: brl(m.mrr_cents ?? 0), sub: "assinaturas ativas pagantes", highlight: true },
    { label: "Pagantes ativos", value: m.active_paying ?? 0, sub: `${m.trialing ?? 0} em teste · ${m.comped ?? 0} cortesia` },
    { label: "Pagamento pendente", value: m.past_due ?? 0, sub: "precisam de atenção", warn: (m.past_due ?? 0) > 0 },
    { label: "Plano Nióbio", value: m.total_niobio ?? 0, sub: "com IA e vouchers" },
    { label: "Plano Titânio", value: m.total_titanio ?? 0, sub: "plano de entrada" },
    { label: "Usando a Vitrine", value: m.using_vitrine ?? 0, sub: "têm itens publicados" },
  ];

  // Saúde da base: o que impede de crescer sem perceber.
  const saude = [
    { label: "Cancelaram este mês", value: m.canceled_this_month ?? 0, sub: "saíram da base", warn: (m.canceled_this_month ?? 0) > 0 },
    { label: "Testes parados", value: m.trial_stale ?? 0, sub: "passaram de 14 dias sem virar pagante", warn: (m.trial_stale ?? 0) > 0 },
    { label: "Travados no início", value: m.travados_onboarding ?? 0, sub: "cadastraram mas não configuraram", warn: (m.travados_onboarding ?? 0) > 0 },
    { label: "Sem nenhuma visita", value: m.sem_visitas ?? 0, sub: "link provavelmente nunca divulgado" },
  ];

  // Embaixadores: de onde vem o crescimento.
  const embaixadores = [
    { label: "Embaixadores ativos", value: m.ambassadors_active ?? 0, sub: `${m.ambassadors_total ?? 0} no total` },
    { label: "Assinaturas por indicação", value: m.subs_from_ambassadors ?? 0, sub: "vieram de embaixadores" },
    { label: "Comissão a pagar", value: brl(m.commission_to_pay_cents ?? 0), sub: "acumulada até agora" },
    { label: "Negócios ativos (7d)", value: m.ativos_7d ?? 0, sub: "tiveram visita esta semana" },
  ];

  // Previsão simples: MRR anualizado.
  const arr = (m.mrr_cents ?? 0) * 12;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold tracking-[-0.02em]">Visão geral</h1>
        <p className="mt-1 text-[14px] text-text-secondary">O retrato do Orbibox agora.</p>
      </div>

      {/* Alerta de crédito da IA, só o master vê. Os clientes usam a Orbi, você paga a API. */}
      {semCredito && (
        <div className="rounded-[20px] border-2 border-red-300 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-[22px]">🚨</span>
            <div>
              <p className="text-[15px] font-bold text-red-700">A Orbi super inteligente está DESATIVADA (créditos da IA esgotados)</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-red-700/90">
                Os clientes do Orbibox estão recebendo textos de cobertura genéricos no lugar da IA de verdade. Adicione créditos na Anthropic pra reativar na hora:
                {" "}
                <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer" className="font-semibold underline">console.anthropic.com, Billing</a>.
                {aiStatus?.sem_credito_desde && (
                  <span className="mt-1 block text-[12px] text-red-600/80">
                    Sem crédito desde {new Date(aiStatus.sem_credito_desde).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-[20px] p-5 ${c.highlight ? "orbi-gradient p-[2px]" : c.warn ? "border border-red-200 bg-red-50" : "border border-divider bg-surface-white"}`}>
            <div className={c.highlight ? "h-full rounded-[18px] bg-surface-white p-5" : ""}>
              <p className="text-[12px] font-medium text-text-tertiary">{c.label}</p>
              <p className="mt-1.5 font-[family-name:var(--font-manrope)] text-[26px] font-bold tracking-tight">{c.value}</p>
              <p className="mt-1 text-[11.5px] text-text-secondary">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* SAÚDE DA BASE — o que impede de crescer sem perceber */}
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Saúde da base</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {saude.map((c) => (
            <div key={c.label} className={`rounded-[20px] p-5 ${c.warn ? "border border-red-200 bg-red-50" : "border border-divider bg-surface-white"}`}>
              <p className="text-[12px] font-medium text-text-tertiary">{c.label}</p>
              <p className={`mt-1.5 font-[family-name:var(--font-manrope)] text-[26px] font-bold tracking-tight ${c.warn ? "text-red-600" : ""}`}>{c.value}</p>
              <p className="mt-1 text-[11.5px] text-text-secondary">{c.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* EMBAIXADORES — de onde vem o crescimento */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Embaixadores</p>
          <Link href="/master/afiliados" className="text-[12.5px] font-medium text-text-secondary underline">Ver todos</Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {embaixadores.map((c) => (
            <div key={c.label} className="rounded-[20px] border border-divider bg-surface-white p-5">
              <p className="text-[12px] font-medium text-text-tertiary">{c.label}</p>
              <p className="mt-1.5 font-[family-name:var(--font-manrope)] text-[26px] font-bold tracking-tight">{c.value}</p>
              <p className="mt-1 text-[11.5px] text-text-secondary">{c.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[20px] border border-divider bg-surface-white p-6">
        <p className="text-[13px] font-medium text-text-tertiary">Previsão financeira (anualizada)</p>
        <p className="mt-1.5 font-[family-name:var(--font-manrope)] text-[32px] font-bold tracking-tight">{brl(arr)}<span className="ml-2 text-[15px] font-medium text-text-secondary">/ano</span></p>
        <p className="mt-1 text-[12.5px] text-text-secondary">
          Projeção com base na receita recorrente atual ({brl(m.mrr_cents ?? 0)}/mês × 12). Cresce conforme novos assinantes entram.
        </p>
      </div>
    </div>
  );
}
