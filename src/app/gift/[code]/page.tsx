import { createClient } from "@/lib/supabase/server";
import { GiftReveal } from "./GiftReveal";

export const dynamic = "force-dynamic";

export default async function GiftPublicPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_gift_card", { p_code: code });

  const gift = data as {
    code: string; value_cents: number; from_name: string | null; to_name: string | null;
    message: string | null; status: string; business_name: string; art_url: string | null; art_theme: string | null;
  } | null;

  if (!gift) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[440px] flex-col items-center justify-center px-6 text-center">
        <p className="font-[family-name:var(--font-manrope)] text-[22px] font-semibold">Gift não encontrado</p>
        <p className="mt-2 text-[14.5px] text-text-secondary">Confira o código com quem te enviou.</p>
      </main>
    );
  }

  return <GiftReveal gift={gift} />;
}
