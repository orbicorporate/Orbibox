import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Link de indicação: /r/CODIGO, guarda o código num cookie (30 dias) e manda
// pro cadastro. Depois que a pessoa cria a conta, o código é usado uma vez
// pra registrar a indicação.
export default async function ReferralLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = (code ?? "").trim().toUpperCase().slice(0, 12);
  if (clean) {
    const jar = await cookies();
    jar.set("orbi_ref", clean, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });
  }
  redirect("/signup");
}
