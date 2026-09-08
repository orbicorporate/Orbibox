import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const TRIAL_DAYS = 3;

export async function POST(req: NextRequest) {
  try {
    const { planId, billingCycle } = await req.json();

    if (!["titanio", "niobio"].includes(planId)) {
      return NextResponse.json({ error: "planId inválido." }, { status: 400 });
    }
    if (!["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json({ error: "billingCycle inválido." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
    }

    const priceId =
      billingCycle === "yearly" ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;

    if (!priceId) {
      return NextResponse.json({ error: "Plano sem preço configurado." }, { status: 500 });
    }

    // Já existe assinatura? Se já teve trial antes, não damos um novo —
    // evita abuso de gente cancelando e reassinando pra testar de novo.
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    const alreadyUsedTrial = !!existing?.trial_ends_at;

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://orbibox-orbi-app.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: existing?.stripe_customer_id ?? undefined,
      customer_email: existing?.stripe_customer_id ? undefined : user.email ?? undefined,
      client_reference_id: user.id,
      subscription_data: {
        trial_period_days: alreadyUsedTrial ? undefined : TRIAL_DAYS,
        metadata: { owner_id: user.id, plan_id: planId, billing_cycle: billingCycle },
      },
      payment_method_collection: "always", // sempre pede cartão, mesmo em trial
      metadata: { owner_id: user.id, plan_id: planId, billing_cycle: billingCycle },
      success_url: `${origin}/admin?checkout=success`,
      cancel_url: `${origin}/admin/configuracoes?checkout=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Erro ao criar checkout:", error);
    return NextResponse.json({ error: "Erro ao criar sessão de checkout." }, { status: 500 });
  }
}
