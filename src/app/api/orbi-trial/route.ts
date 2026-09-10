import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessInfoForBusiness } from "@/lib/plans";

const FREE_TRIALS = 2;

// Retorna quantos testes restam e, se solicitado (consume=true), gasta um.
// Nióbio tem acesso ilimitado (não gasta teste).
export async function POST(req: NextRequest) {
  try {
    const { businessId, consume } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId obrigatório." }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const access = await getAccessInfoForBusiness(businessId);
    if (access.hasAiChat) {
      // Nióbio (ou trial completo): ilimitado.
      return NextResponse.json({ unlimited: true, remaining: 999 });
    }

    const { data: biz } = await supabase
      .from("businesses")
      .select("orbi_trial_count, owner_id")
      .eq("id", businessId)
      .maybeSingle();

    if (!biz || biz.owner_id !== user.id) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const used = biz.orbi_trial_count ?? 0;
    const remaining = Math.max(0, FREE_TRIALS - used);

    if (consume) {
      if (remaining <= 0) {
        return NextResponse.json({ unlimited: false, remaining: 0, blocked: true });
      }
      await supabase.from("businesses").update({ orbi_trial_count: used + 1 }).eq("id", businessId);
      return NextResponse.json({ unlimited: false, remaining: remaining - 1, blocked: false });
    }

    return NextResponse.json({ unlimited: false, remaining, blocked: remaining <= 0 });
  } catch (error) {
    console.error("Erro no trial da Orbi:", error);
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}
