import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Indicação: cada amigo que paga a primeira mensalidade (plano mensal ou
// anual) dá 1 mês grátis pra quem indicou. Como o mês entra depende de onde
// a pessoa está:
// - testando grátis: o teste ganha mais 30 dias (no Stripe ou, sem cartão, no banco);
// - já assinante: crédito de 1 mês no saldo do Stripe, abatido na próxima fatura;
// - sem assinatura ainda: o mês fica guardado e vira dias extras de teste
//   quando ela assinar.
/** Teste grátis sem cartão, contado da criação do primeiro Orbibox. */
export const DIAS_TESTE = 7;
/** Quem chega por convite testa o dobro. */
export const DIAS_TESTE_INDICADO = 14;
const DIA_S = 24 * 60 * 60;

type Aplicado = "teste_estendido" | "credito_fatura" | "guardado";

async function aplicarMesGratis(userId: string): Promise<Aplicado> {
  const supabase = createServiceClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, stripe_subscription_id, stripe_customer_id, plan_id, billing_cycle, trial_ends_at")
    .eq("owner_id", userId)
    .maybeSingle();

  // Testando sem cartão: o teste ganha 30 dias direto no banco.
  if (sub && !sub.stripe_subscription_id && sub.status === "trialing") {
    const base = Math.max(sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0, Date.now());
    await supabase.from("subscriptions").update({ trial_ends_at: new Date(base + 30 * DIA_S * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("owner_id", userId);
    return "teste_estendido";
  }

  if (sub?.stripe_subscription_id && sub.status === "trialing") {
    const s = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const agora = Math.floor(Date.now() / 1000);
    const base = Math.max(s.trial_end ?? agora, agora);
    await stripe.subscriptions.update(sub.stripe_subscription_id, { trial_end: base + 30 * DIA_S, proration_behavior: "none" });
    return "teste_estendido";
  }

  if (sub?.stripe_subscription_id && sub.stripe_customer_id && (sub.status === "active" || sub.status === "past_due")) {
    const { data: plano } = await supabase.from("plans").select("monthly_price_cents, yearly_price_cents").eq("id", sub.plan_id).maybeSingle();
    const valor = plano ? (sub.billing_cycle === "yearly" ? Math.round(plano.yearly_price_cents / 12) : plano.monthly_price_cents) : 0;
    if (valor > 0) {
      await stripe.customers.createBalanceTransaction(sub.stripe_customer_id, {
        amount: -valor,
        currency: "brl",
        description: "1 mês grátis por indicação",
      });
      return "credito_fatura";
    }
  }

  const { data: banco } = await supabase.from("referral_bonus_bank").select("meses").eq("user_id", userId).maybeSingle();
  await supabase.from("referral_bonus_bank").upsert({ user_id: userId, meses: (banco?.meses ?? 0) + 1, updated_at: new Date().toISOString() });
  return "guardado";
}

/** Chamado quando o indicado paga uma fatura de verdade (valor > 0). */
export async function creditarIndicacao(indicadoId: string) {
  const supabase = createServiceClient();
  const { data: ref } = await supabase
    .from("referrals")
    .select("id, referrer_user_id")
    .eq("referred_user_id", indicadoId)
    .eq("status", "pending")
    .maybeSingle();
  if (!ref) return;

  // Marca antes de aplicar: se o Stripe mandar o mesmo evento duas vezes, o
  // segundo não encontra mais a indicação pendente e não dá mês em dobro.
  const { data: marcado } = await supabase
    .from("referrals")
    .update({ status: "credited", credited_at: new Date().toISOString(), subscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", ref.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (!marcado) return;

  let como: Aplicado;
  try {
    como = await aplicarMesGratis(ref.referrer_user_id);
  } catch (e) {
    console.error("indicação: não consegui aplicar no Stripe, guardando o mês", e);
    const { data: banco } = await supabase.from("referral_bonus_bank").select("meses").eq("user_id", ref.referrer_user_id).maybeSingle();
    await supabase.from("referral_bonus_bank").upsert({ user_id: ref.referrer_user_id, meses: (banco?.meses ?? 0) + 1, updated_at: new Date().toISOString() });
    como = "guardado";
  }
  await supabase.from("referrals").update({ aplicado_como: como }).eq("id", ref.id);

  const { data: amigo } = await supabase.from("businesses").select("name").eq("owner_id", indicadoId).order("created_at").limit(1).maybeSingle();
  const onde =
    como === "teste_estendido" ? "Seu teste grátis ganhou mais 30 dias."
    : como === "credito_fatura" ? "Ele já está descontado na sua próxima fatura."
    : "Ele fica guardado e entra como dias grátis quando você assinar.";
  await supabase.from("notifications").insert({
    user_id: ref.referrer_user_id,
    kind: "referral_reward",
    title: "Você ganhou 1 mês grátis! 🎉",
    body: `${amigo?.name ?? "Seu amigo"} assinou o Orbibox pelo seu link. ${onde} Cada novo amigo vale mais um mês.`,
    celebrate: true,
  });
}

/** Meses guardados viram dias de teste no checkout. Zera depois de usar. */
export async function consumirMesesGuardados(userId: string) {
  const supabase = createServiceClient();
  await supabase.from("referral_bonus_bank").update({ meses: 0, updated_at: new Date().toISOString() }).eq("user_id", userId);
}
