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
        <div className="mt-4 flex flex-col gap-3">
          {/* Card de venda com benefícios visuais */}
          <div className="orbi-gradient rounded-[24px] p-[2px]">
            <div className="rounded-[22px] bg-surface-white p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-text-secondary">
                🎟️ Recurso Nióbio
              </span>
              <p className="mt-3 font-[family-name:var(--font-manrope)] text-[19px] font-semibold leading-tight">
                Transforme visitantes em clientes com cupons inteligentes
              </p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-text-secondary">
                Não é um cupomzinho comum. É um sistema completo de promoção com controle total, que atrai gente nova e
                faz ela vir até você.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                {[
                  { icon: "🧲", t: "Atrai cliente novo", d: "A oferta aparece na página e no chat da Orbi." },
                  { icon: "🔐", t: "Código único por pessoa", d: "Ninguém repete nem usa o cupom de outro." },
                  { icon: "📦", t: "Estoque sob controle", d: "Você define quantos são. Acabou, fecha sozinho." },
                  { icon: "📱", t: "Valida no seu celular", d: "Digita o código do cliente e confirma na hora." },
                  { icon: "📇", t: "Cada resgate vira contato", d: "Monta uma lista de clientes pra vender de novo." },
                ].map((b, bi) => (
                  <div key={b.t} className="flex animate-[fadeInUp_0.5s_ease] items-start gap-3" style={{ animationDelay: `${bi * 90}ms`, animationFillMode: "backwards" }}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-[17px]">{b.icon}</span>
                    <div>
                      <p className="text-[14px] font-semibold">{b.t}</p>
                      <p className="mt-0.5 text-[13.5px] leading-relaxed text-text-secondary">{b.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview: como o cliente vê e resgata o cupom */}
          <div className="rounded-[24px] border border-divider bg-surface-soft p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Como fica pro seu cliente</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 rounded-[18px] bg-gradient-to-br from-[#FF5A4D] to-[#FF3B6E] p-4 text-white shadow-[0_4px_16px_rgba(255,59,110,0.3)]">
                <p className="text-[11px] font-medium uppercase tracking-wide opacity-90">🎟️ Oferta especial</p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-[22px] font-bold leading-none">10% OFF</p>
                <p className="mt-1.5 text-[12px] opacity-90">na primeira compra</p>
                <span className="mt-3 inline-block rounded-full bg-white/25 px-3 py-1.5 text-[12px] font-semibold">Pegar meu cupom →</span>
              </div>
              <span className="text-[20px] text-text-tertiary">→</span>
              <div className="flex-1 rounded-[18px] border border-divider bg-surface-white p-4 text-center">
                <p className="text-[11px] text-text-tertiary">Seu código</p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-[20px] font-bold tracking-wider">A1B2C3</p>
                <p className="mt-1.5 text-[11px] leading-snug text-text-secondary">Mostre no atendimento</p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-text-tertiary">
              O cliente toca no cupom na sua página, deixa o WhatsApp e recebe esse código único. Aí é só levar até você.
            </p>
          </div>

          <div className="rounded-2xl bg-surface-soft p-4 text-center">
            <p className="text-[14px] font-medium">✨ Monte seu primeiro cupom abaixo pra ver como é fácil</p>
            <p className="mt-0.5 text-[13px] text-text-tertiary">Você configura tudo agora. Na hora de salvar e ativar, é só assinar o Nióbio.</p>
          </div>
        </div>
      )}

      <VouchersManager businessId={business!.id} initialVouchers={vouchers ?? []} canSave={canSave} />
    </div>
  );
}
