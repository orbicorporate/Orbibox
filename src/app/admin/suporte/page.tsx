import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { linkSuporte } from "@/lib/suporte";
import { SuporteView } from "./SuporteView";

export const metadata = { title: "Suporte" };

export default async function SuportePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = user ? await getCurrentBusinessId(user.id) : null;
  const { data: biz } = businessId ? await supabase.from("businesses").select("name").eq("id", businessId).maybeSingle() : { data: null };
  const { data: cfg } = businessId ? await supabase.from("agent_configs").select("agent_name, orbi_colors").eq("business_id", businessId).maybeSingle() : { data: null };
  const cores = Array.isArray(cfg?.orbi_colors) && cfg.orbi_colors.length >= 2 ? (cfg.orbi_colors as string[]) : null;
  return <SuporteView businessId={businessId ?? null} whatsappHref={linkSuporte(biz?.name)} negocio={biz?.name ?? ""} orbiColors={cores} />;
}
