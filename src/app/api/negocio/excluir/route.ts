import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NEGOCIO_COOKIE } from "@/lib/business";

// Exclui um Orbibox inteiro (só o dono). O banco apaga junto tudo que é dele:
// vitrine, boxes, Orbi, conversas, contatos, vouchers, gift e métricas.
// A assinatura é da conta, não do negócio, então não é afetada.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id, confirmacao } = await req.json().catch(() => ({}));
  const { data: negocio } = await supabase.from("businesses").select("id, name, owner_id").eq("id", id).maybeSingle();
  if (!negocio || negocio.owner_id !== user.id) {
    return NextResponse.json({ error: "Só o dono pode excluir este Orbibox." }, { status: 403 });
  }
  const norm = (t: string) => t.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (typeof confirmacao !== "string" || norm(confirmacao) !== norm(negocio.name)) {
    return NextResponse.json({ error: "O nome digitado não confere." }, { status: 400 });
  }

  const { error } = await supabase.from("businesses").delete().eq("id", negocio.id);
  if (error) {
    console.error("excluir negócio:", error);
    return NextResponse.json({ error: "Não consegui excluir agora. Tenta de novo." }, { status: 500 });
  }

  const { count } = await supabase.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  const res = NextResponse.json({ ok: true, restantes: count ?? 0 });
  // Esquece a escolha: o painel volta pro outro negócio (ou pro onboarding, se não sobrou nenhum).
  res.cookies.set(NEGOCIO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
