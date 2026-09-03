import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/mobile/BottomNav";
import { AppHeader } from "@/components/mobile/AppHeader";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!business) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background-main">
      <AppHeader />
      <main className="flex-1 px-6 pb-28 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
