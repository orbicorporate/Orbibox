import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "Nenhuma assinatura encontrada." }, { status: 404 });
    }

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://orbibox-orbi-app.vercel.app";

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/admin/planos`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Erro ao abrir portal de cobrança:", error);
    return NextResponse.json({ error: "Erro ao abrir o portal de cobrança." }, { status: 500 });
  }
}
