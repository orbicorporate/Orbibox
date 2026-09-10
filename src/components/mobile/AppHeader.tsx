"use client";

import { useState } from "react";
import Link from "next/link";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { BackButton } from "./BackButton";
import { ProgressBadge } from "@/components/ProgressWidgets";

const MENU_ITEMS = [
  {
    href: "/admin/agent",
    label: "Configurar sua IA",
    desc: "Personalidade, tom de voz e o que a Orbi sabe.",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/config",
    label: "Configurar sua marca",
    desc: "Logotipo, contatos e o que aparece pro visitante.",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
        <path d="M9 20v-5a1 1 0 011-1h4a1 1 0 011 1v5" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
] as const;

export function AppHeader({ unseenConversas = 0, progressPct = 100 }: { unseenConversas?: number; progressPct?: number }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-background-main/90 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <BackButton />
        <OrbiOrb size={28} />
        <span className="font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">
          Orbibox
        </span>
      </div>
      <div className="relative flex items-center gap-2">
        <ProgressBadge pct={progressPct} />
        {/* Sino de notificação — pisca quando tem conversa que ainda não foi
            vista. Ao lado do ícone de configurações, sempre alinhado. */}
        <Link href="/admin/conversas" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft" aria-label="Conversas">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3a5 5 0 0 0-5 5v3.2c0 .7-.25 1.36-.7 1.9L5 15h14l-1.3-1.9a3 3 0 0 1-.7-1.9V8a5 5 0 0 0-5-5Z" />
            <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
          </svg>
          {unseenConversas > 0 && (
            <span className="notif-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unseenConversas > 9 ? "9+" : unseenConversas}
            </span>
          )}
        </Link>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          title="Configurações"
          aria-label="Configurações"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-on-background text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </button>

        {menuOpen && (
          <>
            {/* Backdrop — clique fora fecha o menu. */}
            <button
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <div className="absolute right-0 top-11 z-30 w-[280px] overflow-hidden rounded-[22px] bg-surface-white p-2 shadow-[0_12px_40px_rgba(17,19,24,0.18)]">
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-start gap-3 rounded-2xl px-3 py-3 text-left active:bg-surface-soft"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary">
                    {item.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold">{item.label}</span>
                    <span className="block text-[12px] leading-snug text-text-tertiary">{item.desc}</span>
                  </span>
                </Link>
              ))}

              {/* Vouchers ganha destaque de propósito — é a ferramenta com
                  maior impacto comercial direto (fecha venda na hora), então
                  merece parecer diferente das configurações comuns acima. */}
              <Link
                href="/admin/vouchers"
                onClick={() => setMenuOpen(false)}
                className="orbi-gradient mt-1 flex items-start gap-3 rounded-2xl px-3 py-3 text-left"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-background/10 text-[16px]">
                  🎟️
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-on-background">Vouchers <span className="font-normal">· super ferramenta comercial</span></span>
                  <span className="block text-[12px] leading-snug text-on-background/70">Cupons que fazem o visitante decidir na hora — a forma mais direta de vender mais com o Orbibox.</span>
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
