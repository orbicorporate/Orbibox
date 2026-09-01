import { createClient } from "@/lib/supabase/server";
import { ContentManager } from "./ContentManager";

export default async function ContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();

  const { data: items } = await supabase
    .from("content_items")
    .select("*")
    .eq("business_id", business!.id)
    .order("position", { ascending: true });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Conteúdo</p>
        <h1 className="font-[family-name:var(--font-manrope)] text-[32px] font-medium tracking-[-0.01em]">
          Tudo é conteúdo
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Produtos, serviços e links que a Orbi organiza e recomenda aos visitantes.
        </p>
      </div>
      <ContentManager businessId={business!.id} initialItems={items ?? []} />
    </div>
  );
}
