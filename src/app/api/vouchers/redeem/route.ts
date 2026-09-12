import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Quando o operador filtrou por um cupom específico, um código de OUTRO
    // cupom é recusado com aviso claro — evita confirmar o cupom errado.
    if (expectedVoucherId && redemption.voucher_id !== expectedVoucherId) {
      const wrong = Array.isArray(redemption.vouchers) ? redemption.vouchers[0] : redemption.vouchers;
      return NextResponse.json(
        { error: `Esse código é de outro cupom${wrong?.title ? ` ("${wrong.title}")` : ""}, não do que você selecionou.` },
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

    const voucher = Array.isArray(redemption.vouchers) ? redemption.vouchers[0] : redemption.vouchers;

    return NextResponse.json({ ok: true, voucher });
  } catch (error) {
    console.error("Erro ao confirmar cupom:", error);
    return NextResponse.json({ error: "Erro ao confirmar cupom." }, { status: 500 });
  }
}
