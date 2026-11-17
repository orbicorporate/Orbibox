import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { UUID } from "@/lib/convitesServidor";
import { MAX_CONVITES } from "@/lib/convites";

/** O dono (ou admin do negócio) cria convites: uma lista com nome e WhatsApp e/ou códigos sem lista. */
export async function POST(req: NextRequest) {
  try {
    const { voucherId, itens, gerar } = await req.json();
    if (typeof voucherId !== "string" || !UUID.test(voucherId)) return NextResponse.json({ ok: false, erro: "voucher" }, { status: 400 });
    const lista = Array.isArray(itens) ? itens.slice(0, MAX_CONVITES) : [];
    const n = Math.min(Math.max(Number.isFinite(Number(gerar)) ? Math.floor(Number(gerar)) : 0, 0), MAX_CONVITES);
    if (lista.length === 0 && n === 0) return NextResponse.json({ ok: false, erro: "vazio" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, erro: "login" }, { status: 401 });
    // A política de acesso só deixa o membro do negócio enxergar o voucher: é a conferência de permissão.
    const { data: v } = await supabase.from("vouchers").select("id, privado").eq("id", voucherId).maybeSingle();
    if (!v) return NextResponse.json({ ok: false, erro: "sem_permissao" }, { status: 403 });
    if (!v.privado) return NextResponse.json({ ok: false, erro: "voucher_nao_privado" }, { status: 400 });

    const itensLimpos = lista.map((i: { nome?: unknown; whatsapp?: unknown }) => ({
      nome: typeof i?.nome === "string" ? i.nome.slice(0, 80) : null,
      whatsapp: typeof i?.whatsapp === "string" ? i.whatsapp.slice(0, 30) : null,
    }));
    const service = createServiceClient();
    const { data, error } = await service.rpc("convite_criar", { p_voucher_id: voucherId, p_itens: itensLimpos, p_gerar: n });
    if (error) {
      console.error("convite_criar", error);
      return NextResponse.json({ ok: false, erro: "falhou" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("convites/criar", e);
    return NextResponse.json({ ok: false, erro: "falhou" }, { status: 500 });
  }
}
