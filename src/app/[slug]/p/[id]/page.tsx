import Link from "next/link";
import { ehDonoOuAdmin } from "@/lib/business";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductView } from "./ProductView";
import type { Metadata } from "next";

/** Capinha do link do item no WhatsApp: a foto do item, o nome e a marca. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const supabase = await createClient();
  const { data: b } = await supabase.from("businesses").select("id, name, logo_url").eq("slug", slug).maybeSingle();
  if (!b) return { title: "Orbibox" };
  const { data: i } = await supabase
    .from("content_items")
    .select("title, description, image_url, gallery_urls, status")
    .eq("id", id)
    .eq("business_id", b.id)
    .maybeSingle();
  if (!i || i.status !== "published") return { title: b.name };
  const capa = i.image_url || (Array.isArray(i.gallery_urls) && i.gallery_urls[0]) || b.logo_url || `/${slug}/opengraph-image`;
  const titulo = `${i.title} · ${b.name}`;
  const bruta = (i.description ?? "").replace(/\s+/g, " ").trim() || `Veja em ${b.name}.`;
  const desc = bruta.length > 90 ? `${bruta.slice(0, 90).replace(/\s+\S*$/, "")}…` : bruta;
  return {
    title: titulo,
    description: desc,
    openGraph: { title: titulo, description: desc, type: "website", images: [{ url: capa }] },
    twitter: { card: "summary_large_image", title: titulo, description: desc, images: [capa] },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, contact_whatsapp, contact_phone, contact_email, logo_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!business) notFound();

  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!item) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = await ehDonoOuAdmin(user?.id, business.id);

  // Rascunho só o dono vê. Antes o botão Ver de um item em rascunho abria um 404 até para ele.
  const rascunho = item.status !== "published";
  if (rascunho && !isOwner) notFound();

  return (
    <>
      {rascunho && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-on-background px-4 py-2.5 text-[13px] text-white">
          <span>Rascunho: só você está vendo. Seus clientes ainda não veem este item.</span>
          <Link href={`/admin/vitrine/pagina/${item.id}`} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium text-on-background">
            Publicar
          </Link>
        </div>
      )}
      <ProductView business={business} item={item} isOwner={isOwner} />
    </>
  );
}
