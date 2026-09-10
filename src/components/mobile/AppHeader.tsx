import Link from "next/link";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { BackButton } from "./BackButton";
import { ProgressBadge } from "@/components/ProgressWidgets";

export function AppHeader({ unseenConversas = 0, progressPct = 100 }: { unseenConversas?: number; progressPct?: number }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-background-main/90 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <BackButton />
        <OrbiOrb size={28} />
        <span className="font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">
          Orbibox
        </span>
      </div>
      <div className="flex items-center gap-2">
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
        <Link
          href="/admin/config"
          title="Configurações"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-on-background text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
