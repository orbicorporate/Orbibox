import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId, ehDonoOuAdmin } from "@/lib/business";
import { ProductPageEditor } from "./ProductPageEditor";

/** Edição da página própria do produto, direto nela: toca e edita. */
export default async function EditarPaginaProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, contact_whatsapp, contact_phone, contact_email, owner_id, logo_url, home_destaques")
    .eq("id", businessId!)
    .maybeSingle();
  if (!business || !(await ehDonoOuAdmin(user!.id, business.id))) notFound();

  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!item) notFound();

  const guardados = (Array.isArray(business.home_destaques) ? business.home_destaques : []) as { t?: string; id?: string; logo?: string | null }[];
  const bolinha = guardados.find((d) => d?.t === "item_bolinha" && d.id === item.id);
  return <ProductPageEditor business={business} item={item} bolinha={bolinha ? { logo: bolinha.logo ?? null, logoMarca: business.logo_url ?? null } : null} />;
}
