"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "./BottomNav";

/** Menu lateral do painel em tela larga (a barra de baixo só aparece no celular). */
export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu do painel" className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col gap-1 border-r border-divider bg-surface-white/55 px-4 pb-6 pt-24 backdrop-blur-xl lg:flex">
      {TABS.map((tab) => {
        const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[48px] items-center gap-3 rounded-full px-3 text-[15px] transition-colors ${active ? "bg-surface-white font-medium text-on-background shadow-[0_2px_10px_rgba(17,19,24,0.08)]" : "text-text-secondary hover:bg-surface-white/60"}`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px] ${active ? "orbi-gradient text-on-background" : "text-text-tertiary"} ${tab.glow ? "nav-glow-ring" : ""}`}>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
