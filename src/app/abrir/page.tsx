import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";

// Porta de entrada do app: o dono abre direto na própria página (como visitante),
// e vai para o painel só se tocar em "Painel".
export default async function AbrirPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const businessId = await getCurrentBusinessId(user.id);
  if (!businessId) redirect("/admin");
  const { data: negocio } = await supabase.from("businesses").select("slug").eq("id", businessId).maybeSingle();
  redirect(negocio?.slug ? `/${negocio.slug}` : "/admin");
}
