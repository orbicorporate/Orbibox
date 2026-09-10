import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Só super admin passa. Qualquer outro é mandado embora (nem vê que existe).
  const { data: isSuper } = await supabase.rpc("is_super_admin");
  if (!isSuper) redirect("/admin");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col bg-background-main">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-divider bg-background-main/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-on-background text-[13px] font-bold text-white">O</span>
          <div>
            <p className="text-[15px] font-semibold leading-none">Orbibox · Master</p>
            <p className="mt-0.5 text-[11px] text-text-tertiary">Painel de gestão</p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/master" className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-surface-soft">Visão geral</Link>
          <Link href="/master/negocios" className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-surface-soft">Negócios</Link>
          <Link href="/master/inspire" className="rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-surface-soft">Inspire-se</Link>
          <Link href="/admin" className="ml-2 rounded-full bg-surface-soft px-3.5 py-1.5 text-[13px] font-medium">Meu painel</Link>
        </nav>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
