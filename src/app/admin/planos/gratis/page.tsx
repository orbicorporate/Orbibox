import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessInfo, LIMITES_GRATIS } from "@/lib/plans";
import { classificarHome, type DestaqueGuardado } from "@/lib/planoGratis";
import { EscolhaGratis, type FotoGratis } from "./EscolhaGratis";

export const metadata = { title: "Escolha o que fica" };

export default async function PlanoGratisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const acesso = await getAccessInfo(user.id);
  if (!acesso.isFree) redirect("/admin");

  const { data: negocio } = await supabase.from("businesses").select("id, name, home_destaques").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!negocio) redirect("/admin");

  const [{ data: caixas }, { data: itens }, { data: imagens }] = await Promise.all([
    supabase.from("smart_boxes").select("id, box_type, title, is_active, position, config").eq("business_id", negocio.id),
    supabase.from("content_items").select("id, title, image_url").eq("business_id", negocio.id),
    supabase.from("image_library" as never).select("id, path").eq("business_id", negocio.id).order("created_at", { ascending: false }).limit(300),
  ]);
  const salvos = (Array.isArray(negocio.home_destaques) ? negocio.home_destaques : []) as DestaqueGuardado[];
  const home = classificarHome(caixas ?? [], salvos, itens ?? []);
  const fotos: FotoGratis[] = ((imagens as { id: string; path: string }[] | null) ?? []).map((i) => ({
    id: i.id,
    url: supabase.storage.from("box-images").getPublicUrl(i.path).data.publicUrl,
  }));

  return (
    <EscolhaGratis
      businessId={negocio.id}
      nome={negocio.name}
      bolinhas={home.bolinhas}
      destaques={home.destaques}
      fotos={fotos}
      limites={LIMITES_GRATIS}
      testeAcabou={acesso.testeAcabou}
    />
  );
}
