import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Chamada logo após o usuário entrar/cadastrar. Lê o código do cookie e
// registra a indicação (a função no banco ignora auto-indicação e duplicados).
export async function POST() {
  const jar = await cookies();
  const code = jar.get("orbi_ref")?.value;
  if (!code) return NextResponse.json({ registered: false });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ registered: false });

  await supabase.rpc("register_referral", { p_code: code });
  // Consome o cookie pra não registrar de novo.
  jar.delete("orbi_ref");
  return NextResponse.json({ registered: true });
}
