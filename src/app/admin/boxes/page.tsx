import { createClient } from "@/lib/supabase/server";
import { BoxesManager } from "./BoxesManager";

export default async function BoxesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, story_photos, story_photo_format, about_business, differentials, differentials_cards, hero_question, logo_url, brand_colors")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();
  const { data: boxes } = await supabase.from("smart_boxes").select("*").eq("business_id", business!.id).order("position", { ascending: true });

  const raw = business!.brand_colors;
  const brandColors = Array.isArray(raw)
    ? raw.filter((c): c is { hex: string; role?: string } => !!c && typeof c === "object" && typeof (c as { hex?: unknown }).hex === "string")
    : [];

  const rawCards = business!.differentials_cards;
  const differentialsCards = Array.isArray(rawCards)
    ? rawCards.filter((c): c is { icon?: string; title: string; description?: string } => !!c && typeof c === "object" && typeof (c as { title?: unknown }).title === "string")
    : [];

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
        Smart Boxes
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
        Cada box é um caminho que o visitante pode seguir quando abre seu link. Ligue os que fazem
        sentido para o seu negócio e escolha a ordem em que aparecem.
      </p>
      <BoxesManager
        businessId={business!.id}
        businessName={business!.name}
        initialBoxes={boxes ?? []}
        slug={business!.slug}
        initialStoryPhotos={business!.story_photos ?? []}
        initialAboutBusiness={business!.about_business ?? ""}
        initialDifferentialsCards={differentialsCards}
        initialHeroQuestion={business!.hero_question}
        initialLogoUrl={business!.logo_url}
        brandColors={brandColors}
      />
    </div>
  );
}
