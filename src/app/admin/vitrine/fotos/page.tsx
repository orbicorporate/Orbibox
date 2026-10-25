import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { FotosEmLote } from "./FotosEmLote";
import { sizeOf } from "@/lib/showcase";

export default async function FotosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const { data: items } = await supabase
    .from("content_items")
    .select("id, title, brand_label, image_url, gallery_urls, position, layout_size")
    .eq("business_id", businessId!)
    .order("position", { ascending: true });

  const lista = (items ?? []).map((i) => ({
    id: i.id,
    title: i.title,
    categoria: i.brand_label?.trim() || "Sem categoria",
    formato: sizeOf(i.layout_size),
    temFoto: !!i.image_url || (Array.isArray(i.gallery_urls) && i.gallery_urls.length > 0),
  }));

  return (
    <div className="flex flex-col">
      <Link href="/admin/vitrine" className="mt-2 self-start text-[13px] text-text-secondary underline underline-offset-4">Voltar ao catálogo</Link>
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[30px] font-medium tracking-[-0.02em]">Fotos dos itens</h1>
      <p className="mt-1 text-[14px] text-text-secondary">Escolha a foto, enquadre no formato do card e o próximo abre sozinho.</p>
      <FotosEmLote businessId={businessId!} itens={lista} />
    </div>
  );
}
