import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listMyBusinesses, NEGOCIO_COOKIE } from "@/lib/business";

// Troca o negócio aberto no painel (só pra um que a pessoa tem acesso).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { id } = await req.json().catch(() => ({ id: null }));
  const lista = await listMyBusinesses(user.id);
  if (!id || !lista.some((b) => b.id === id)) return NextResponse.json({ error: "Negócio não encontrado." }, { status: 404 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(NEGOCIO_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
