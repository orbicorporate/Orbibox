import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";

export async function loadConfigData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, site_type, contact_whatsapp, contact_phone, contact_email, contact_site, address, about_business, differentials, policies, logo_url, logo_gallery, hero_gradient, share_image_url, share_description, vitrine_cover_url, vitrine_cover_urls")
    .eq("id", businessId!)
    .single();
  const { data: agentConfig } = await supabase.from("agent_configs").select("orbi_colors").eq("business_id", business!.id).maybeSingle();
  const orbiColors = Array.isArray(agentConfig?.orbi_colors) && agentConfig.orbi_colors.length >= 2
    ? (agentConfig.orbi_colors as string[])
    : null;
  const heroGradient = Array.isArray(business!.hero_gradient) && business!.hero_gradient.length >= 2
    ? (business!.hero_gradient as string[])
    : null;

  const { data: ownerRow } = await supabase.from("businesses").select("owner_id").eq("id", businessId!).maybeSingle();
  const isOwner = ownerRow?.owner_id === user!.id;

  return { businessId: businessId!, business: business!, orbiColors, heroGradient, isOwner };
}
