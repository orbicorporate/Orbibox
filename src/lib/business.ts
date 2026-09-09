import { createClient } from "@/lib/supabase/server";

/**
 * Resolve o negócio do usuário logado — seja porque ele é dono, seja porque
 * foi convidado como administrador de um negócio de outra pessoa. Usado no
 * lugar de `.eq("owner_id", user.id)` em toda página do admin, pra
 * administradores convidados também conseguirem acessar.
 */
export async function getCurrentBusinessId(userId: string): Promise<string | null> {
  const supabase = await createClient();

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
