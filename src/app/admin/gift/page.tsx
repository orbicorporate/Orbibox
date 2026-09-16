import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { GiftManager } from "./GiftManager";

export default async function GiftPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);

  const [{ data: settings }, { data: gifts }] = await Promise.all([
    supabase.from("gift_settings").select("*").eq("business_id", businessId!).maybeSingle(),
    supabase.from("gift_cards").select("id, code, value_cents, from_name, to_name, message, status, created_at").eq("business_id", businessId!).order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">Gift Cards</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
        Seus clientes montam um vale-presente, combinam o pagamento com você no WhatsApp, e você libera. A arte fica bloqueada até você confirmar.
      </p>
      <GiftManager businessId={businessId!} initialSettings={settings ?? null} initialGifts={gifts ?? []} />
    </div>
  );
}
