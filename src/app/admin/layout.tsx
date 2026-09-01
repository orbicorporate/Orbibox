import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/admin", label: "Hoje", icon: "auto_awesome" },
  { href: "/admin/pulse", label: "Orbi Pulse", icon: "insights" },
  { href: "/admin/content", label: "Conteúdo", icon: "grid_view" },
  { href: "/admin/boxes", label: "Smart Boxes", icon: "inventory_2" },
  { href: "/admin/campaigns", label: "Campanhas", icon: "campaign" },
  { href: "/admin/agent", label: "Zara", icon: "forum" },
];

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
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-divider bg-surface-white p-6 md:flex">
        <div className="mb-8">
          <p className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">
            {business.name}
          </p>
          <a
            href={`/${business.slug}`}
            target="_blank"
            className="text-[12px] text-text-tertiary hover:underline"
          >
            orbibox.app/{business.slug} ↗
          </a>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl px-4 py-2.5 text-[15px] text-text-secondary transition-colors hover:bg-surface-soft hover:text-on-background"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        {/* Barra mobile */}
        <nav className="flex items-center gap-1 overflow-x-auto border-b border-divider bg-surface-white px-4 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full bg-surface-soft px-4 py-1.5 text-[13px]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </div>
    </div>
  );
}
