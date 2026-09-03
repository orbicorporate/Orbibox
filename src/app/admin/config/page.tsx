import { createClient } from "@/lib/supabase/server";
import { ConfigForm } from "./ConfigForm";

export default async function ConfigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, site_type, contact_whatsapp, contact_phone, contact_email, contact_site, about_business, differentials, policies")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
        Configurações
      </h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        Contatos que aparecem para o visitante e o que a Zara sabe sobre o seu negócio.
      </p>
      <ConfigForm business={business!} />
    </div>
  );
}
