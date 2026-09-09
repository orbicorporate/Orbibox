import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { ConfigForm } from "./ConfigForm";
import { AdminsManager } from "./AdminsManager";

export default async function ConfigPage() {
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

  // Só o dono vê o gerenciador completo de equipe. Descobrimos comparando o
  // owner_id do negócio com o usuário logado.
  const { data: ownerRow } = await supabase.from("businesses").select("owner_id").eq("id", businessId!).maybeSingle();
  const isOwner = ownerRow?.owner_id === user!.id;
  const { data: admins } = await supabase
    .from("business_admins")
    .select("*")
    .eq("business_id", businessId!)
    .order("invited_at", { ascending: true });

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
      <AdminsManager businessId={businessId!} initialAdmins={admins ?? []} isOwner={isOwner} />
      <ConfigForm business={business!} orbiColors={orbiColors} heroGradient={heroGradient} />
    </div>
  );
}
