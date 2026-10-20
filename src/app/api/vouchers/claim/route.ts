import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient as createServerClient } from "@/lib/supabase/server";
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
      .select("business_id, apenas_fas")
      .eq("id", voucherId)
      .maybeSingle();

    if (!voucher) {
      return NextResponse.json({ error: "Voucher não encontrado." }, { status: 404 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", voucher.business_id)
      .maybeSingle();

    if (!business || !(await getOwnerHasVouchers(business.owner_id))) {
      return NextResponse.json({ error: "Vouchers não disponíveis pra esse negócio." }, { status: 403 });
    }

    // Quem está logado como fã fica ligado ao resgate (vale pra avaliar depois).
    const sessao = await createServerClient();
    const { data: { user } } = await sessao.auth.getUser();

    // Voucher exclusivo: só quem é fã da marca pega.
    const exclusivo = (voucher as { apenas_fas?: boolean }).apenas_fas === true;
    if (exclusivo) {
      const { data: fa } = user
        ? await supabase.from("fans").select("customer_id").eq("business_id", voucher.business_id).eq("customer_id", user.id).maybeSingle()
        : { data: null };
      if (!fa) {
        return NextResponse.json({ error: "Esse voucher é exclusivo para fãs. Vire fã da marca para pegar." }, { status: 403 });
      }
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
      return NextResponse.json({ error: "Não foi possível resgatar o voucher." }, { status: 400 });
    }

    if (user && result.code) {
      const { data: cli } = await supabase.from("customers").select("id").eq("id", user.id).maybeSingle();
      if (cli) await supabase.from("voucher_redemptions").update({ customer_id: user.id }).eq("code", result.code).eq("business_id", voucher.business_id);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao resgatar cupom:", error);
    return NextResponse.json({ error: "Erro ao resgatar voucher." }, { status: 500 });
  }
}
