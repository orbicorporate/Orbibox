"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Balãozinho de mensagem minimalista, só o contorno, pra combinar com o
// resto dos ícones geométricos vazados da barra.
function TalkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5h16a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9.5L5 19.5V16H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function Ico({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
const IconeInicio = () => <Ico><path d="M4 11l8-7 8 7" /><path d="M6 10v9a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1v-9" /></Ico>;
const IconeBotoes = () => <Ico><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></Ico>;
const IconeCatalogo = () => <Ico><path d="M5 8h14l-1 11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Ico>;
const IconeNumeros = () => <Ico><path d="M5 20V11" /><path d="M12 20V5" /><path d="M19 20v-6" /></Ico>;

export const TABS: { href: string; label: string; icon: ReactNode; glow?: boolean }[] = [
  { href: "/admin", label: "Início", icon: <IconeInicio /> },
  { href: "/admin/boxes", label: "Botões", icon: <IconeBotoes /> },
  { href: "/admin/vitrine", label: "Catálogo", icon: <IconeCatalogo />, glow: true },
  { href: "/admin/conversas", label: "Conversas", icon: <TalkIcon /> },
  { href: "/admin/pulse", label: "Números", icon: <IconeNumeros /> },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[440px] lg:hidden">
      <div className="m-4 flex items-center justify-around rounded-[28px] border border-divider bg-surface-white/75 px-2 py-3 shadow-[0_8px_30px_rgba(17,19,24,0.10)] backdrop-blur-xl">
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
                } ${tab.glow ? "nav-glow-ring" : ""}`}
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
