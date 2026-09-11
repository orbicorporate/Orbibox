import Link from "next/link";

// Selo fino de progresso — vai no topo de todas as telas (no header).
// Fica num arquivo separado de ProgressWidgets.tsx de propósito: esse
// aqui não pode depender de nada que puxe "@/lib/progress" (que usa
// next/headers, só roda no servidor), porque o AppHeader que o usa é
// um Client Component (precisa ser, pro menu da engrenagem funcionar).
export function ProgressBadge({ pct }: { pct: number }) {
  if (pct >= 100) return null;
  return (
    <Link href="/admin" className="flex items-center gap-2 rounded-full bg-surface-soft px-2.5 py-1">
      <span className="relative flex h-3.5 w-14 overflow-hidden rounded-full bg-surface-white">
        <span className="h-full rounded-full orbi-gradient" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[11px] font-semibold text-text-secondary">{pct}%</span>
    </Link>
  );
}
