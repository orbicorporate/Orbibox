import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Cookie que guarda qual negócio está aberto no painel (contas com vários). */
export const NEGOCIO_COOKIE = "orbi_negocio";

export type NegocioResumo = { id: string; name: string; slug: string; dono: boolean };

/** Todos os negócios que a pessoa pode abrir: os dela e os que administra. */
export async function listMyBusinesses(userId: string): Promise<NegocioResumo[]> {
  const supabase = await createClient();
  const { data: donos } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });
  const { data: vinculos } = await supabase.from("business_admins").select("business_id").eq("user_id", userId);
  const idsAdmin = (vinculos ?? []).map((v) => v.business_id).filter((id) => !(donos ?? []).some((d) => d.id === id));
  const { data: administrados } = idsAdmin.length
    ? await supabase.from("businesses").select("id, name, slug").in("id", idsAdmin)
    : { data: [] as { id: string; name: string; slug: string }[] };
  return [
    ...(donos ?? []).map((b) => ({ ...b, dono: true })),
    ...(administrados ?? []).map((b) => ({ ...b, dono: false })),
  ];
}

/**
 * Resolve o negócio aberto no painel. Se a pessoa escolheu um (cookie) e
 * ainda tem acesso a ele, é esse. Senão, o mais recente que ela é dona, e
 * por último um em que foi convidada como administradora.
 */
export async function getCurrentBusinessId(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const escolhido = (await cookies()).get(NEGOCIO_COOKIE)?.value;
  if (escolhido) {
    const { data: meu } = await supabase.from("businesses").select("id").eq("id", escolhido).eq("owner_id", userId).maybeSingle();
    if (meu) return meu.id;
    const { data: admin } = await supabase.from("business_admins").select("business_id").eq("business_id", escolhido).eq("user_id", userId).maybeSingle();
    if (admin) return admin.business_id;
  }

  const { data: owned } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (owned) return owned.id;

  const { data: membership } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return membership?.business_id ?? null;
}

/** Pode criar mais um Orbibox? (plano ativo com limite maior que o que já tem) */
export async function podeCriarOutroNegocio(userId: string): Promise<boolean> {
  const { getAccessInfo } = await import("@/lib/plans");
  const acesso = await getAccessInfo(userId);
  if (!acesso.isActive) return false;
  const supabase = await createClient();
  const { count } = await supabase.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", userId);
  return (count ?? 0) < acesso.maxBusinesses;
}
