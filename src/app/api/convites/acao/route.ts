import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { UUID } from "@/lib/convitesServidor";

/** Liberar de novo (celular novo, bloqueio por engano) ou cancelar um convite. Só quem é do negócio. */
export async function POST(req: NextRequest) {
  try {
    const { conviteId, acao } = await req.json();
    if (typeof conviteId !== "string" || !UUID.test(conviteId) || (acao !== "liberar" && acao !== "cancelar")) {
      return NextResponse.json({ ok: false, erro: "pedido" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, erro: "login" }, { status: 401 });
    const { data: c } = await supabase.from("voucher_convites").select("id").eq("id", conviteId).maybeSingle();
    if (!c) return NextResponse.json({ ok: false, erro: "sem_permissao" }, { status: 403 });

    const service = createServiceClient();
    const { data, error } = acao === "liberar"
      ? await service.rpc("convite_liberar", { p_convite_id: conviteId })
      : await service.rpc("convite_cancelar", { p_convite_id: conviteId });
    if (error) return NextResponse.json({ ok: false, erro: "falhou" }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("convites/acao", e);
    return NextResponse.json({ ok: false, erro: "falhou" }, { status: 500 });
  }
}
