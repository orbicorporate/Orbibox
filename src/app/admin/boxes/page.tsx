import { createClient } from "@/lib/supabase/server";
import { BoxesManager } from "./BoxesManager";

export default async function BoxesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();

  const { data: boxes } = await supabase
    .from("smart_boxes")
    .select("*")
    .eq("business_id", business!.id)
    .order("position", { ascending: true });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Smart Boxes</p>
          <h1 className="font-[family-name:var(--font-manrope)] text-[32px] font-medium tracking-[-0.01em]">
            Sua experiência
          </h1>
          <p className="mt-1 text-[15px] text-text-secondary">
            Configure os blocos que montam a página do seu Orbibox.
          </p>
        </div>
      </div>
      <BoxesManager businessId={business!.id} initialBoxes={boxes ?? []} />
    </div>
  );
}
