import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";

/**
 * Cobra 1 real do dono do Orbibox por voucher resgatado (não do cliente
 * final). Não é uma cobrança avulsa na hora: cria um item de fatura
 * pendente no Stripe, que se acumula e entra automaticamente na próxima
 * fatura da assinatura, junto com o plano. Só cobra quando a assinatura já
 * está paga (status "active"), nunca durante o período de trial.
 *
 * Roda depois de confirmar o resgate e nunca derruba a confirmação pro
 * operador da loja: se a parte de cobrança falhar, o voucher continua
 * validado, só fica sem cobrança e registrado com o erro pra investigar.
 */
async function cobrarVoucherResgatado(redemptionId: string, businessId: string) {
  const service = createServiceClient();

  const { data: business } = await service
    .from("businesses")
    .select("owner_id, name")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) return;

  const { data: subscription } = await service
    .from("subscriptions")
    .select("status, stripe_customer_id")
    .eq("owner_id", business.owner_id)
    .maybeSingle();
  if (!subscription || subscription.status !== "active" || !subscription.stripe_customer_id) return;

  const billingPeriod = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // Insere primeiro com onConflict ignorado pela constraint única de
  // voucher_redemption_id: se já existe (reentrega, corrida), não cobra de novo.
  const { error: insertError } = await service.from("voucher_billing_events").insert({
    business_id: businessId,
    owner_id: business.owner_id,
    voucher_redemption_id: redemptionId,
    amount_cents: 100,
    billing_period: billingPeriod,
  });
  if (insertError) return; // já cobrado antes (unique constraint) ou outro erro, não tenta de novo

  try {
    const invoiceItem = await stripe.invoiceItems.create({
      customer: subscription.stripe_customer_id,
      currency: "brl",
      amount: 100,
      description: `Voucher resgatado — ${business.name}`,
    });
    await service
      .from("voucher_billing_events")
      .update({ stripe_invoice_item_id: invoiceItem.id })
      .eq("voucher_redemption_id", redemptionId);
  } catch (err) {
    console.error("Erro ao criar item de cobrança de voucher no Stripe:", err);
    await service
      .from("voucher_billing_events")
      .update({ charge_error: err instanceof Error ? err.message : "erro desconhecido" })
      .eq("voucher_redemption_id", redemptionId);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, code, expectedVoucherId } = await req.json();

    if (!businessId || !code) {
      return NextResponse.json({ error: "businessId e code são obrigatórios." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const { data: redemption } = await supabase
      .from("voucher_redemptions")
      .select("id, status, expires_at, voucher_id, vouchers(title, discount_type, discount_value)")
      .eq("business_id", businessId)
      .eq("code", normalizedCode)
      .maybeSingle();

    if (!redemption) {
      return NextResponse.json({ error: "Código não encontrado." }, { status: 404 });
    }

    // Quando o operador filtrou por um voucher específico, um código de OUTRO
    // voucher é recusado com aviso claro, evita confirmar o voucher errado.
    if (expectedVoucherId && redemption.voucher_id !== expectedVoucherId) {
      const wrong = Array.isArray(redemption.vouchers) ? redemption.vouchers[0] : redemption.vouchers;
      return NextResponse.json(
        { error: `Esse código é de outro voucher${wrong?.title ? ` ("${wrong.title}")` : ""}, não do que você selecionou.` },
        { status: 409 },
      );
    }

    if (redemption.status === "redeemed") {
      return NextResponse.json({ error: "Esse código já foi usado." }, { status: 409 });
    }

    const expired = redemption.expires_at && new Date(redemption.expires_at) < new Date();
    if (redemption.status !== "claimed" || expired) {
      return NextResponse.json({ error: "Esse código não é mais válido." }, { status: 409 });
    }

    const { error: updateError } = await supabase
      .from("voucher_redemptions")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
      .eq("id", redemption.id);

    if (updateError) {
      return NextResponse.json({ error: "Erro ao confirmar o resgate." }, { status: 500 });
    }

    // Roda depois de confirmado o resgate: cobrança do dono do Orbibox é
    // assunto à parte do atendimento, então um erro aqui nunca desfaz nem
    // atrapalha a confirmação já dada pro operador da loja. Usamos await
    // (em vez de disparar e esquecer) porque em serverless a função pode
    // ser encerrada assim que a resposta é enviada, o que derrubaria uma
    // cobrança em andamento no meio do caminho.
    try {
      await cobrarVoucherResgatado(redemption.id, businessId);
    } catch (err) {
      console.error("Erro ao processar cobrança de voucher:", err);
    }

    const voucher = Array.isArray(redemption.vouchers) ? redemption.vouchers[0] : redemption.vouchers;

    return NextResponse.json({ ok: true, voucher });
  } catch (error) {
    console.error("Erro ao confirmar cupom:", error);
    return NextResponse.json({ error: "Erro ao confirmar voucher." }, { status: 500 });
  }
}
