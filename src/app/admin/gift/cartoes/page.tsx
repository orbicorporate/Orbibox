import Link from "next/link";
import { BloqueioGratis } from "@/components/ui/BloqueioGratis";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { CartoesGift } from "./CartoesGift";

export default async function CartoesGiftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);

  if (businessId && (await getAccessInfoForBusiness(businessId)).isFree) {
    return <BloqueioGratis recurso="Gift Cards" descricao="Seus clientes presenteiam amigos com um vale-presente do seu negócio." itens={["Vale-presente com a sua arte", "Você libera depois de combinar o pagamento", "Mais clientes novos chegando por indicação"]} />;
  }

  const [{ data: settings }, { data: gifts }, { data: neg }] = await Promise.all([
    supabase.from("gift_settings").select("art_url, art_theme").eq("business_id", businessId!).maybeSingle(),
    supabase.from("gift_cards").select("id, code, buyer_whatsapp, value_cents, from_name, to_name, message, status, created_at, used_at, liberado_por, usado_por").eq("business_id", businessId!).order("created_at", { ascending: false }).limit(200),
    supabase.from("businesses").select("name").eq("id", businessId!).maybeSingle(),
  ]);

  return (
    <div className="flex flex-col">
      <Link href="/admin/gift" className="text-[14px] text-text-tertiary hover:underline">← Gift Cards</Link>
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[30px] font-medium tracking-[-0.02em]">Cartões presente</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
        Veja todos os cartões, liberados ou não, e envie o cartão liberado direto para quem ganhou.
      </p>
      <CartoesGift
        negocioNome={neg?.name ?? "o negócio"}
        artUrl={settings?.art_url ?? null}
        artTheme={settings?.art_theme ?? null}
        gifts={gifts ?? []}
      />
    </div>
  );
}
