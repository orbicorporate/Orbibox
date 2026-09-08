import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ConfigForm } from "./ConfigForm";

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, site_type, contact_whatsapp, contact_phone, contact_email, contact_site, address, about_business, differentials, policies, logo_url, logo_gallery, hero_gradient, share_image_url, share_description, vitrine_cover_url, vitrine_cover_urls")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();
  const { data: agentConfig } = await supabase.from("agent_configs").select("orbi_colors").eq("business_id", business!.id).maybeSingle();
  const orbiColors = Array.isArray(agentConfig?.orbi_colors) && agentConfig.orbi_colors.length >= 2
    ? (agentConfig.orbi_colors as string[])
    : null;
  const heroGradient = Array.isArray(business!.hero_gradient) && business!.hero_gradient.length >= 2
    ? (business!.hero_gradient as string[])
    : null;

  return (
    <div className="flex flex-col">
      <h1 data-tour="config" className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
        Configurações
      </h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        Contatos que aparecem para o visitante e o que a Orbi sabe sobre o seu negócio.
      </p>
      <Link
        href="/admin/planos"
        className="mt-4 flex items-center justify-between rounded-2xl border border-divider bg-surface-white px-4 py-3.5 text-[14px] font-medium"
      >
        Plano e cobrança
        <span className="text-text-tertiary">→</span>
      </Link>
      <ConfigForm business={business!} orbiColors={orbiColors} heroGradient={heroGradient} />
    </div>
  );
}
