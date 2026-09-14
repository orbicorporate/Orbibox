import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Chamada logo após entrar/cadastrar. Lê o código do afiliado no cookie e
// registra a indicação (a função ignora código inválido e duplicado).
export async function POST() {
  const jar = await cookies();
  const code = jar.get("orbi_aff")?.value;
  if (!code) return NextResponse.json({ registered: false });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ registered: false });

  await supabase.rpc("register_affiliate_referral", { p_code: code });
  jar.delete("orbi_aff");
  return NextResponse.json({ registered: true });
}
