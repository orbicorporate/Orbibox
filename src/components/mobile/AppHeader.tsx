import Link from "next/link";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-background-main/90 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <OrbiOrb size={28} />
        <span className="font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">
          Orbibox
        </span>
      </div>
      <Link
        href="/admin/config"
        title="Configurações"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[15px]"
      >
        ⚙
      </Link>
    </header>
  );
}
