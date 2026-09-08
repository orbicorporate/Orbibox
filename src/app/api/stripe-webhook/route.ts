import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Necessário pra ler o corpo raw e validar a assinatura do webhook.
export const runtime = "nodejs";

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
      return "incomplete";
    default:
      return "incomplete";
  }
}

function planIdFromPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.metadata?.plan_id ?? null;
}

function billingCycleFromSubscription(subscription: Stripe.Subscription): string {
  return subscription.metadata?.billing_cycle ?? "monthly";
}

async function upsertFromSubscription(subscription: Stripe.Subscription, ownerIdFallback?: string) {
  const supabase = createServiceClient();
  const ownerId = subscription.metadata?.owner_id ?? ownerIdFallback;

  if (!ownerId) {
    console.error("Webhook: subscription sem owner_id em metadata", subscription.id);
    return;
  }

  const planId = planIdFromPriceId(subscription);
  const item = subscription.items.data[0];

  await supabase
    .from("subscriptions")
    .upsert(
      {
        owner_id: ownerId,
        plan_id: planId ?? "titanio",
        billing_cycle: billingCycleFromSubscription(subscription),
        status: mapStripeStatus(subscription.status),
        stripe_customer_id:
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: item?.price.id ?? null,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        current_period_end: item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" }
    );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(subscription, session.client_reference_id ?? undefined);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const supabase = createServiceClient();
        const ownerId = subscription.metadata?.owner_id;
        if (ownerId) {
          await supabase
            .from("subscriptions")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("owner_id", ownerId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details?.subscription;
        if (subscriptionId) {
          const id = typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id;
          const subscription = await stripe.subscriptions.retrieve(id);
          await upsertFromSubscription(subscription);
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error(`Erro processando webhook ${event.type}:`, error);
    return NextResponse.json({ error: "Erro ao processar evento." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
