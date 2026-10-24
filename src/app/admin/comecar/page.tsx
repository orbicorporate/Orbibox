import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { APP_HOST } from "@/lib/appUrl";
import { Comecar } from "./Comecar";

export const metadata = { title: "Passo a passo" };

export default async function ComecarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const { data: b } = await supabase.from("businesses").select("id, name, slug, vitrine_categories, contact_whatsapp, address").eq("id", businessId!).single();
  const [{ data: itens }, { count: boxes }, { count: visitas }] = await Promise.all([
    supabase.from("content_items").select("id, title, brand_label, type, image_url").eq("business_id", b!.id).eq("status", "published"),
    supabase.from("smart_boxes").select("id", { count: "exact", head: true }).eq("business_id", b!.id).eq("is_active", true),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", b!.id),
  ]);
  const cats = (b!.vitrine_categories as string[] | null) ?? [];
  const reais = (itens ?? []).filter((i) => i.type !== "link");
  const porCategoria = cats.map((c) => {
    const daCat = reais.filter((i) => i.brand_label?.trim() === c);
    return { nome: c, n: daCat.length, itens: daCat.slice(0, 6).map((i) => ({ titulo: i.title, foto: i.image_url })) };
  });
  const proto = APP_HOST.includes("localhost") ? "http" : "https";
  return (
    <Comecar
      nome={b!.name}
      slug={b!.slug}
      link={`${proto}://${APP_HOST}/${b!.slug}`}
      categorias={cats}
      porCategoria={porCategoria}
      totalItens={reais.length}
      semCategoria={reais.filter((i) => !i.brand_label?.trim()).length}
      boxes={boxes ?? 0}
      temWhatsapp={!!b!.contact_whatsapp}
      temEndereco={!!b!.address?.trim()}
      visitas={visitas ?? 0}
    />
  );
}
