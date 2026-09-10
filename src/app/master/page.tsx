import { createClient } from "@/lib/supabase/server";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

export default async function MasterOverview() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("master_metrics");
  const m = (data ?? {}) as Record<string, number>;

  const cards = [
    { label: "Negócios cadastrados", value: m.total_businesses ?? 0, sub: `${m.new_this_month ?? 0} novos este mês` },
    { label: "Receita recorrente (MRR)", value: brl(m.mrr_cents ?? 0), sub: "assinaturas ativas pagantes", highlight: true },
    { label: "Pagantes ativos", value: m.active_paying ?? 0, sub: `${m.trialing ?? 0} em teste · ${m.comped ?? 0} cortesia` },
    { label: "Pagamento pendente", value: m.past_due ?? 0, sub: "precisam de atenção", warn: (m.past_due ?? 0) > 0 },
    { label: "Plano Nióbio", value: m.total_niobio ?? 0, sub: "com IA e cupons" },
    { label: "Plano Titânio", value: m.total_titanio ?? 0, sub: "plano de entrada" },
    { label: "Usando a Vitrine", value: m.using_vitrine ?? 0, sub: "têm itens publicados" },
  ];

  // Previsão simples: MRR anualizado.
  const arr = (m.mrr_cents ?? 0) * 12;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold tracking-[-0.02em]">Visão geral</h1>
        <p className="mt-1 text-[14px] text-text-secondary">O retrato do Orbibox agora.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-[20px] border p-5 ${c.highlight ? "orbi-gradient border-transparent" : c.warn ? "border-red-200 bg-red-50" : "border-divider bg-surface-white"}`}>
            <div className={c.highlight ? "rounded-[16px] bg-surface-white p-4" : ""}>
              <p className="text-[12px] font-medium text-text-tertiary">{c.label}</p>
              <p className="mt-1.5 font-[family-name:var(--font-manrope)] text-[26px] font-bold tracking-tight">{c.value}</p>
              <p className="mt-1 text-[11.5px] text-text-secondary">{c.sub}</p>
            </div>
          </div>
        ))}
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
