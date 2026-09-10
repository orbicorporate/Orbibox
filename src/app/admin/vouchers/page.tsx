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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                🎟️ Recurso Nióbio
              </span>
              <p className="mt-3 font-[family-name:var(--font-manrope)] text-[19px] font-semibold leading-tight">
                Transforme visitantes em clientes com cupons inteligentes
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-text-secondary">
                Não é um cupomzinho comum. É um sistema completo de promoção com controle total, que atrai gente nova e
                faz ela vir até você.
              </p>

              <div className="mt-4 flex flex-col gap-3">
                {[
                  { icon: "🧲", t: "Atrai cliente novo", d: "A oferta aparece na sua página e no chat da Orbi, dando aquele empurrãozinho pra pessoa decidir comprar." },
                  { icon: "🔐", t: "Código único por pessoa", d: "Cada cliente recebe um código exclusivo. Ninguém usa o cupom de outro, nem repete o mesmo duas vezes." },
                  { icon: "📦", t: "Estoque sob controle", d: "Você define quantos cupons existem (ex: 50). Quando acabam, a oferta fecha sozinha. Sem prejuízo, sem surpresa." },
                  { icon: "📱", t: "Validação na hora, no seu celular", d: "No atendimento, você digita o código do cliente e confirma na hora. O sistema avisa se é válido ou já foi usado." },
                  { icon: "📇", t: "Cada resgate vira um contato", d: "Quem pega o cupom deixa nome e WhatsApp. Você monta uma lista de clientes interessados, pronta pra vender de novo." },
                ].map((b) => (
                  <div key={b.t} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-[17px]">{b.icon}</span>
                    <div>
                      <p className="text-[14px] font-semibold">{b.t}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-secondary">{b.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-soft p-4 text-center">
            <p className="text-[13px] font-medium">✨ Monte seu primeiro cupom abaixo pra ver como é fácil</p>
            <p className="mt-0.5 text-[12px] text-text-tertiary">Você configura tudo agora. Na hora de salvar e ativar, é só assinar o Nióbio.</p>
          </div>
        </div>
      )}

      <VouchersManager businessId={business!.id} initialVouchers={vouchers ?? []} canSave={canSave} />
    </div>
  );
}
