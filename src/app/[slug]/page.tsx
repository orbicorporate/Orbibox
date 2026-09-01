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

  const { data: content } = await supabase
    .from("content_items")
    .select("id, title, description, price, images, type")
    .eq("business_id", business.id)
    .eq("status", "published")
    .order("position", { ascending: true });

  const { data: agentConfig } = await supabase
    .from("agent_configs")
    .select("agent_name")
    .eq("business_id", business.id)
    .maybeSingle();

  return (
    <VisitorExperience
      business={business}
      content={content ?? []}
      agentName={agentConfig?.agent_name ?? "Zara"}
    />
  );
}
