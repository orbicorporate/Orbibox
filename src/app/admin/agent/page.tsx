import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessInfo } from "@/lib/plans";
import { AgentConfigForm } from "./AgentConfigForm";

export default async function AgentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const access = await getAccessInfo(user!.id);

  if (!access.hasAiChat) {
    return (
      <div className="flex flex-col">
        <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Personalidade da Marca (AgentBox)</h1>
        <div className="mt-6 rounded-2xl border border-divider bg-surface-white p-6">
          <p className="text-[15px] font-medium">Isso é exclusivo do plano Nióbio 💎</p>
          <p className="mt-1 text-[14px] text-text-secondary">
            No plano Nióbio a Orbi conversa de verdade com seus visitantes: tira dúvidas, captura contato e tem um
            agente treinado especialmente pro seu negócio.
          </p>
          <Link
            href="/admin/planos"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-button-primary px-5 py-2.5 text-[14px] font-medium text-white"
          >
            Ver planos
          </Link>
        </div>
      </div>
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, about_business, differentials, policies")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();
  const { data: config } = await supabase.from("agent_configs").select("*").eq("business_id", business!.id).maybeSingle();
  const orbiColors = Array.isArray(config?.orbi_colors) && config.orbi_colors.length >= 2
    ? (config.orbi_colors as string[])
    : null;
  const { count: catalogCount } = await supabase
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business!.id)
    .eq("status", "published");

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Personalidade da Marca (AgentBox)</h1>
      <p className="mt-1 text-[14px] text-text-secondary">Defina como a Orbi interage com seus visitantes.</p>
      {config && (
        <AgentConfigForm
          config={{ ...config, orbi_colors: orbiColors }}
          businessId={business!.id}
          businessName={business!.name}
          slug={business!.slug}
          knowledge={{
            catalogo: (catalogCount ?? 0) > 0,
            historia: !!business!.about_business?.trim(),
            politicas: !!business!.policies?.trim(),
            diferenciais: !!business!.differentials?.trim(),
          }}
        />
      )}
    </div>
  );
}
