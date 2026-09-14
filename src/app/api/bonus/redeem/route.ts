import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Resgata o link de bônus guardado no cookie, liberando o Nióbio.
// Só consome o cookie quando dá certo, pra não perder o bônus se a
// chamada acontecer antes da sessão estar de pé.
export async function POST() {
  const jar = await cookies();
  const code = jar.get("orbi_bonus")?.value;
  if (!code) return NextResponse.json({ redeemed: false });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ redeemed: false });

  const { data } = await supabase.rpc("redeem_bonus_link", { p_code: code });
  const result = (data ?? {}) as { ok?: boolean; kind?: string; until?: string };
  if (result.ok) jar.delete("orbi_bonus");

  return NextResponse.json({ redeemed: !!result.ok, kind: result.kind, until: result.until });
}
