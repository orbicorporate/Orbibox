import { createClient } from "@/lib/supabase/server";
import { ContentManager } from "./ContentManager";

export default async function ContentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, brand_voice_summary")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();
  const { data: items } = await supabase
    .from("content_items")
    .select("*")
    .eq("business_id", business!.id)
    .order("position", { ascending: true });

  return <ContentManager businessId={business!.id} initialItems={items ?? []} />;
}
