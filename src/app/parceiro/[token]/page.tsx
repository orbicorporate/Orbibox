import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Resumo = {
  ok: boolean;
  name?: string;
  code?: string;
  active?: boolean;
  commission_rate?: number;
  commission_months?: number;
  pix_key?: string | null;
  cliques?: number;
  cadastros?: number;
  assinantes?: number;
  na_carencia_cents?: number;
  a_receber_cents?: number;
  recebido_cents?: number;
};

const PLANO_LABEL: Record<string, string> = { niobio: "Nióbio", titanio: "Titânio" };
const CICLO_LABEL: Record<string, string> = { monthly: "mensal", yearly: "anual", bonus: "cortesia" };

function brl(cents: number) {
  return (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function mesLongo(iso: string) {
  const d = new Date(iso);
  const texto = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function PainelAfiliado({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: resumoRaw } = await supabase.rpc("affiliate_panel_summary", { p_token: token });
  const resumo = (resumoRaw ?? { ok: false }) as Resumo;

  if (!resumo.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[440px] flex-col items-center justify-center px-6 text-center">
        <p className="font-[family-name:var(--font-manrope)] text-[22px] font-semibold">Link inválido</p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-text-secondary">
          Esse painel não existe ou o link está incompleto. Peça o link novo pra quem te cadastrou.
        </p>
      </main>
    );
  }

  const [{ data: vendas }, { data: meses }] = await Promise.all([
    supabase.rpc("affiliate_panel_sales", { p_token: token }),
    supabase.rpc("affiliate_panel_monthly", { p_token: token }),
  ]);

  const taxa = Math.round((resumo.commission_rate ?? 0.3) * 100);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col bg-background-main px-4 pb-12 pt-6">
      <div>
        <p className="text-[12.5px] font-semibold uppercase tracking-wide text-text-tertiary">Painel do parceiro</p>
        <h1 className="mt-1 font-[family-name:var(--font-manrope)] text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          {resumo.name}
        </h1>
        <p className="mt-1.5 text-[14px] text-text-secondary">
          {taxa}% de comissão por {resumo.commission_months} meses de cada cliente que você trouxer.
          {resumo.active ? "" : " Sua participação está pausada no momento."}
        </p>
      </div>

      {/* Dinheiro primeiro, é o que o parceiro abre o painel pra ver */}
      <div className="mt-5 rounded-[26px] border border-divider bg-surface-white px-6 py-6">
        <p className="text-[13px] text-text-tertiary">Disponível pra receber</p>
        <p className="mt-1 font-[family-name:var(--font-manrope)] text-[34px] font-bold leading-none tracking-[-0.02em]">
          {brl(resumo.a_receber_cents ?? 0)}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-divider pt-4">
          <div>
            <p className="text-[12.5px] text-text-tertiary">Em garantia (7 dias)</p>
            <p className="mt-0.5 text-[17px] font-semibold">{brl(resumo.na_carencia_cents ?? 0)}</p>
          </div>
          <div>
            <p className="text-[12.5px] text-text-tertiary">Já recebido</p>
            <p className="mt-0.5 text-[17px] font-semibold">{brl(resumo.recebido_cents ?? 0)}</p>
          </div>
        </div>
        {resumo.pix_key && (
          <p className="mt-4 text-[12.5px] text-text-tertiary">Pagamos no Pix: {resumo.pix_key}</p>
        )}
      </div>

      {/* Funil */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Acessos", resumo.cliques ?? 0],
          ["Cadastros", resumo.cadastros ?? 0],
          ["Assinaram", resumo.assinantes ?? 0],
        ].map(([label, valor]) => (
          <div key={String(label)} className="rounded-[20px] border border-divider bg-surface-white px-4 py-4 text-center">
            <p className="text-[24px] font-bold leading-none">{valor}</p>
            <p className="mt-1.5 text-[12px] text-text-tertiary">{label}</p>
          </div>
        ))}
      </div>

      {/* Comissão por mês */}
      <div className="mt-4 rounded-[26px] border border-divider bg-surface-white px-6 py-6">
        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold">Por mês</p>
        {(meses ?? []).length === 0 ? (
          <p className="mt-3 text-[14px] text-text-tertiary">Nenhuma comissão gerada ainda.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3.5">
            {(meses ?? []).map((m) => (
              <div key={m.mes} className="flex items-center justify-between gap-3 border-b border-divider pb-3.5 last:border-b-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium">{mesLongo(m.mes)}</p>
                  <p className="text-[12.5px] text-text-tertiary">{m.lancamentos} cobrança(s)</p>
                </div>
                <p className="shrink-0 text-[16px] font-semibold">{brl(m.total_cents)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vendas */}
      <div className="mt-4 rounded-[26px] border border-divider bg-surface-white px-6 py-6">
        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold">Suas indicações</p>
        {(vendas ?? []).length === 0 ? (
          <p className="mt-3 text-[14px] text-text-tertiary">
            Ninguém se cadastrou pelo seu link ainda. Compartilhe e acompanhe por aqui.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {(vendas ?? []).map((v, i) => {
              const assinou = v.status === "subscribed";
              return (
                <div key={v.referral_id} className="flex items-start justify-between gap-3 border-b border-divider pb-4 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[15.5px] font-semibold">
                      Cliente {String(i + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-0.5 text-[13px] text-text-secondary">
                      {assinou
                        ? `${PLANO_LABEL[v.plano] ?? v.plano} ${CICLO_LABEL[v.ciclo] ?? v.ciclo} · comprou em ${dataCurta(v.comprou_em)}`
                        : v.status === "canceled"
                          ? "Cancelou a assinatura"
                          : "Cadastrou, ainda não assinou"}
                    </p>
                    {assinou && v.comissao_ate && (
                      <p className="mt-0.5 text-[12.5px] text-text-tertiary">
                        Comissiona até {dataCurta(v.comissao_ate)} · {v.cobrancas} cobrança(s)
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-[15px] font-semibold">{brl(v.comissao_total_cents)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-6 px-2 text-center text-[12px] leading-relaxed text-text-tertiary">
        Cada comissão fica 7 dias em garantia antes de virar disponível. Se o cliente cancelar nesse período,
        ela não é paga. Não mostramos dados pessoais de quem assinou.
      </p>
    </main>
  );
}
