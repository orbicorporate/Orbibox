import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Link de bônus: /b/CODIGO. Guarda o código e manda pro cadastro. O
// resgate só acontece depois que a conta existe, porque o plano é
// concedido a um usuário.
export default async function BonusLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = (code ?? "").trim().toUpperCase().slice(0, 12);
  if (clean) {
    const jar = await cookies();
    jar.set("orbi_bonus", clean, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });
  }
  redirect("/signup");
}
