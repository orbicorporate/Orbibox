import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductView } from "./ProductView";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, contact_whatsapp, contact_phone, contact_email")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) notFound();

  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .eq("status", "published")
    .maybeSingle();
  if (!item) notFound();

  return <ProductView business={business} item={item} />;
}
