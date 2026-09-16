import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Link de embaixador: /a/CODIGO. Guarda o código num cookie (60 dias, mais
// folgado que o de indicação porque o ciclo de venda de parceiro é maior)
// e manda pro cadastro. Depois da conta criada, o código vira uma linha
// em affiliate_referrals.
export default async function AffiliateLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = (code ?? "").trim().toUpperCase().slice(0, 12);
  if (clean) {
    const jar = await cookies();
    jar.set("orbi_aff", clean, { maxAge: 60 * 60 * 24 * 60, path: "/", sameSite: "lax" });
    // Conta o acesso pro painel do parceiro. Falha aqui nunca pode
    // impedir a pessoa de chegar no cadastro.
    try {
      const supabase = await createClient();
      await supabase.rpc("register_affiliate_click", { p_code: clean });
    } catch { /* silencioso */ }
  }
  redirect("/signup");
}
