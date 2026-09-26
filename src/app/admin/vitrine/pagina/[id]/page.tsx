import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { ProductPageEditor } from "./ProductPageEditor";

/** Edição da página própria do produto, direto nela: toca e edita. */
export default async function EditarPaginaProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, contact_whatsapp, contact_phone, contact_email, owner_id")
    .eq("id", businessId!)
    .maybeSingle();
  if (!business || business.owner_id !== user!.id) notFound();

  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!item) notFound();

  return <ProductPageEditor business={business} item={item} />;
}
