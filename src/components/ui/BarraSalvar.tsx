"use client";

import { usePathname } from "next/navigation";

// Telas sem nada pra salvar (só leitura ou cobrança) ficam sem a barra do topo.
const SEM_BARRA = ["/admin/planos"];

export function BarraSalvar({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  if (SEM_BARRA.some((p) => caminho === p || caminho.startsWith(`${p}/`))) return null;
  return (
    <div className="embed-save pointer-events-none sticky top-[84px] z-20 mb-3 h-10">
      <div className="pointer-events-none relative flex h-full items-center justify-end gap-2">{children}</div>
    </div>
  );
}
