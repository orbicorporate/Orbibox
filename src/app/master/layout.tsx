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
      <header className="sticky top-0 z-20 border-b border-divider bg-background-main/90 backdrop-blur">
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-on-background text-[13px] font-bold text-white">O</span>
            <p className="text-[15px] font-semibold leading-none">Orbibox</p>
            {/* Tag dourada de Master, só aqui no painel master */}
            <span className="rounded-full bg-gradient-to-r from-[#C9962E] to-[#F0CB6A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_1px_4px_rgba(201,150,46,0.4)]">
              ★ Master
            </span>
          </div>
          <Link href="/admin" className="shrink-0 rounded-full bg-surface-soft px-3.5 py-1.5 text-[13px] font-medium">Meu painel</Link>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-5 pb-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/master" className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-surface-soft">Visão geral</Link>
          <Link href="/master/negocios" className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-surface-soft">Negócios</Link>
          <Link href="/master/afiliados" className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-surface-soft">Afiliados</Link>
          <Link href="/master/inspire" className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-text-secondary hover:bg-surface-soft">Inspire-se</Link>
        </nav>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
