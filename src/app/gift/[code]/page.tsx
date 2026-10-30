import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GiftReveal } from "./GiftReveal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_gift_card", { p_code: code });
  const g = data as { business_name?: string; to_name?: string | null } | null;
  const negocio = g?.business_name ?? "Orbibox";
  const title = `Gift card ${negocio}`;
  const description = g?.to_name ? `Um presente para ${g.to_name}. Toque para abrir.` : "Um presente para você. Toque para abrir.";
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default async function GiftPublicPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ de?: string }> }) {
  const { code } = await params;
  const { de } = await searchParams;
  const voltar = de && de.startsWith("/") && !de.startsWith("//") && !de.includes("\\") ? de : null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_gift_card", { p_code: code });

  const gift = data as {
    code: string; value_cents: number; from_name: string | null; to_name: string | null;
    message: string | null; status: string; used_at?: string | null; business_name: string; art_url: string | null; art_theme: string | null; whatsapp?: string | null;
  } | null;

  if (!gift) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[440px] flex-col items-center justify-center px-6 text-center">
        <p className="font-[family-name:var(--font-manrope)] text-[22px] font-semibold">Gift não encontrado</p>
        <p className="mt-2 text-[14.5px] text-text-secondary">Confira o código com quem te enviou.</p>
      </main>
    );
  }

  return <GiftReveal gift={gift} voltar={voltar} />;
}
