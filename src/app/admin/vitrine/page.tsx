import { createClient } from "@/lib/supabase/server";
import { ShowcaseBuilder } from "./ShowcaseBuilder";

type BrandColor = { hex: string; role?: string };

export default async function VitrinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug, name, brand_colors, vitrine_categories, vitrine_cover_urls")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();
  const { data: items } = await supabase
    .from("content_items")
    .select("*")
    .eq("business_id", business!.id)
    .order("position", { ascending: true });

  // As cores que a Orbi definiu no DNA da marca — mesma paleta do onboarding.
  const raw = business?.brand_colors;
  const brandColors: BrandColor[] = Array.isArray(raw)
    ? raw.filter((c): c is BrandColor => !!c && typeof c === "object" && typeof (c as BrandColor).hex === "string")
    : [];

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
        Vitrine
      </h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        Toque num item pra editar — nome, foto, formato, cor e mais. Crie como rascunho e publique quando estiver pronto.
      </p>
      <ShowcaseBuilder
        items={items ?? []}
        slug={business!.slug}
        businessId={business!.id}
        brandColors={brandColors}
        initialCategories={business!.vitrine_categories ?? []}
        initialCoverUrl={business!.vitrine_cover_urls}
      />
    </div>
  );
}
