import Link from "next/link";
import { BloqueioGratis } from "@/components/ui/BloqueioGratis";
import { getAccessInfoForBusiness } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { GiftManager } from "./GiftManager";
import { ComoFuncionaGift } from "./ComoFuncionaGift";

export default async function GiftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);

  if (businessId && (await getAccessInfoForBusiness(businessId)).isFree) {
    return <BloqueioGratis recurso="Gift Cards" descricao="Seus clientes presenteiam amigos com um vale-presente do seu negócio." itens={["Vale-presente com a sua arte","Você libera depois de combinar o pagamento","Mais clientes novos chegando por indicação"]} />;
  }
  const [{ data: settings }, { data: gifts }] = await Promise.all([
    supabase.from("gift_settings").select("*").eq("business_id", businessId!).maybeSingle(),
    supabase.from("gift_cards").select("id, code, buyer_whatsapp, value_cents, from_name, to_name, message, status, created_at, used_at, liberado_por, usado_por").eq("business_id", businessId!).order("created_at", { ascending: false }).limit(100),
  ]);

  const { data: neg } = await supabase.from("businesses").select("name").eq("id", businessId!).maybeSingle();
  const negocioNome = neg?.name ?? "o negócio";
  const semGifts = (gifts ?? []).length === 0;

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">Gift Cards</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
        Seus clientes montam um vale-presente, combinam o pagamento com você no WhatsApp, e você libera. A arte fica bloqueada até você confirmar.
      </p>

      {!semGifts && (
        <Link href="/admin/gift/cartoes" className="mt-4 flex min-h-[56px] items-center justify-between rounded-[22px] bg-on-background px-5 text-white active:scale-[.99]">
          <span>
            <span className="block text-[15px] font-semibold">Cartões presente</span>
            <span className="block text-[12.5px] opacity-75">Ver todos e enviar ao presenteado</span>
          </span>
          <span aria-hidden className="text-[20px]">→</span>
        </Link>
      )}

      {semGifts && <ComoFuncionaGift />}

      <GiftManager negocioNome={negocioNome} businessId={businessId!} initialSettings={settings ?? null} initialGifts={gifts ?? []} />
    </div>
  );
}
