import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VisitorExperience } from "./VisitorExperience";

export default async function VisitorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) notFound();

  // As três dependem só do business — vão juntas em vez de em fila.
  const [contentRes, boxesRes, agentRes] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, description, price, image_url, brand_label, type, position, layout_size, box_color, box_style, target_url, link_kind")
      .eq("business_id", business.id)
      .eq("status", "published")
      .order("position", { ascending: true }),
    supabase
      .from("smart_boxes")
      .select("box_type, is_active, position")
      .eq("business_id", business.id)
      .order("position", { ascending: true }),
    supabase.from("agent_configs").select("agent_name").eq("business_id", business.id).maybeSingle(),
  ]);
  const content = contentRes.data;
  const boxes = boxesRes.data;
  const agentConfig = agentRes.data;

  return (
    <VisitorExperience
      business={business}
      content={content ?? []}
      boxes={boxes ?? []}
      agentName={agentConfig?.agent_name ?? "Zara"}
    />
  );
}
