import { createClient } from "@/lib/supabase/server";
import { CampaignsManager } from "./CampaignsManager";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: business } = await supabase.from("businesses").select("id").eq("owner_id", user!.id).limit(1).single();
  const { data: campaigns } = await supabase.from("campaigns").select("*").eq("business_id", business!.id).order("created_at", { ascending: false });
  const { data: content } = await supabase
    .from("content_items")
    .select("id, title, price, image_url, brand_label")
    .eq("business_id", business!.id)
    .eq("status", "published")
    .order("position", { ascending: true })
    .limit(6);

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[28px] font-medium tracking-[-0.02em]">O que vamos movimentar?</h1>
      <p className="mt-1 text-[14px] text-text-secondary">Orbi analisou seu estoque e sugere estes itens.</p>
      <CampaignsManager businessId={business!.id} initialCampaigns={campaigns ?? []} contentOptions={content ?? []} />
    </div>
  );
}
