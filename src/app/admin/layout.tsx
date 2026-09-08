import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/mobile/BottomNav";
import { AppHeader } from "@/components/mobile/AppHeader";
import { TourOverlay } from "@/components/tour/TourOverlay";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, tour_completed_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!business) redirect("/onboarding");

  // Contagem de conversas não vistas — mostrada como bolinha no sino, ao lado
  // do ícone de configurações, em todas as telas do painel (não só no Today).
  const { count: unseenConversas } = await supabase
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("seen_by_owner", false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background-main">
      <AppHeader unseenConversas={unseenConversas ?? 0} />
      <main className="flex-1 px-6 pb-28 pt-2">{children}</main>
      <BottomNav />
      <Suspense fallback={null}>
        <TourOverlay businessId={business.id} />
      </Suspense>
    </div>
  );
}
