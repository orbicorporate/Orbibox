import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { getCurrentBusinessId } from "@/lib/business";
import { AgentConfigForm } from "./AgentConfigForm";
import { OrbiTrial } from "./OrbiTrial";

export default async function AgentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const access = businessId ? await getAccessInfoForBusiness(businessId) : null;

  if (!access?.hasAiChat) {
    // Titânio: em vez de bloquear, deixa experimentar a Orbi (2 grátis) pra
    // sentir o valor, com o convite pra assinar.
    const { data: cfg } = businessId
      ? await supabase.from("agent_configs").select("agent_name, orbi_colors").eq("business_id", businessId).maybeSingle()
      : { data: null };
    const { data: bizData } = businessId
      ? await supabase.from("businesses").select("slug, address").eq("id", businessId).maybeSingle()
      : { data: null };
    const { data: trialProducts } = businessId
      ? await supabase.from("content_items").select("id, title, price, price_type, price_max, image_url, link_kind, target_url").eq("business_id", businessId).eq("status", "published").limit(20)
      : { data: [] };
    const trialColors = Array.isArray(cfg?.orbi_colors) && cfg.orbi_colors.length >= 2 ? (cfg.orbi_colors as string[]) : null;

    return (
      <div className="flex flex-col">
        <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Personalidade da Marca (AgentBox)</h1>
        <div className="mt-6 rounded-2xl border border-divider bg-surface-white p-6">
          <p className="text-[15px] font-medium">✦ A Orbi é uma IA que conversa com seus clientes</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
            Ela atende 24h na sua página, tira dúvidas, recomenda produtos e captura contatos automaticamente — como
            uma vendedora que nunca dorme. É o recurso mais avançado do Orbibox, exclusivo do plano Nióbio.
          </p>
          <p className="mt-3 text-[13px] font-medium text-text-secondary">Experimente agora, de graça:</p>
          {businessId && <OrbiTrial businessId={businessId} address={bizData?.address ?? null} products={trialProducts ?? []} agentName={cfg?.agent_name ?? "Orbi"} orbiColors={trialColors} />}
          <Link
            href="/admin/planos"
            className="mt-3 inline-flex items-center justify-center text-[13px] font-medium underline"
          >
            Ver planos e ativar de vez
          </Link>
        </div>
      </div>
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, about_business, differentials, policies")
    .eq("id", businessId!)
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
      <h1 data-tour="orbi-ai" className="mt-2 font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Personalidade da Marca (AgentBox)</h1>
      <p className="mt-1 text-[14px] text-text-secondary">Defina como a Orbi interage com seus visitantes.</p>
      {config && (
        <AgentConfigForm
          config={{ ...config, orbi_colors: orbiColors, suggested_questions: Array.isArray(config!.suggested_questions) ? (config!.suggested_questions as string[]) : [], curation_options: Array.isArray(config!.curation_options) ? (config!.curation_options as string[]) : [] }}
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
