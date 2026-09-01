import { createClient } from "@/lib/supabase/server";
import { CampaignsManager } from "./CampaignsManager";

export default async function CampaignsPage() {
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

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("business_id", business!.id)
    .order("created_at", { ascending: false });

  const { data: content } = await supabase
    .from("content_items")
    .select("id, title")
    .eq("business_id", business!.id)
    .eq("status", "published");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Campanhas</p>
        <h1 className="font-[family-name:var(--font-manrope)] text-[32px] font-medium tracking-[-0.01em]">
          Campanhas & Ativação
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          A Orbi recomenda o melhor horário e produto para promover em cada canal.
        </p>
      </div>
      <CampaignsManager
        businessId={business!.id}
        initialCampaigns={campaigns ?? []}
        contentOptions={content ?? []}
      />
    </div>
  );
}
