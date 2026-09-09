import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOwnerHasVouchers } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { voucherId, name, whatsapp } = await req.json();

    if (!voucherId) {
      return NextResponse.json({ error: "voucherId é obrigatório." }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: voucher } = await supabase
      .from("vouchers")
      .select("business_id")
      .eq("id", voucherId)
      .maybeSingle();

    if (!voucher) {
      return NextResponse.json({ error: "Cupom não encontrado." }, { status: 404 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", voucher.business_id)
      .maybeSingle();

    if (!business || !(await getOwnerHasVouchers(business.owner_id))) {
      return NextResponse.json({ error: "Cupons não disponíveis pra esse negócio." }, { status: 403 });
    }

    const { data, error } = await supabase.rpc("claim_voucher", {
      p_voucher_id: voucherId,
      p_visitor_name: name || null,
      p_visitor_whatsapp: whatsapp || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const result = data?.[0];
    if (!result) {
      return NextResponse.json({ error: "Não foi possível resgatar o cupom." }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao resgatar cupom:", error);
    return NextResponse.json({ error: "Erro ao resgatar cupom." }, { status: 500 });
  }
}
