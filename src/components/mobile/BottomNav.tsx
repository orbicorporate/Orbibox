"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Today", icon: "◈" },
  { href: "/admin/vitrine", label: "Vitrine", icon: "◫" },
  { href: "/admin/boxes", label: "Boxes", icon: "▣" },
  { href: "/admin/pulse", label: "Pulse", icon: "◔" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[440px]">
      <div className="m-4 flex items-center justify-around rounded-[28px] border border-divider bg-surface-white/95 px-2 py-3 shadow-[0_8px_30px_rgba(17,19,24,0.10)] backdrop-blur">
        {TABS.map((tab) => {
          const active =
            tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[16px] transition-colors ${
                  active ? "orbi-gradient text-on-background" : "text-text-tertiary"
                }`}
              >
                {tab.icon}
              </span>
              <span className={`text-[11px] ${active ? "text-on-background" : "text-text-tertiary"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
