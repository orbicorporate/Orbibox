"use client";

import { useRouter, usePathname } from "next/navigation";

/**
 * Botão de voltar pra tela anterior, some só na home ("Today"), onde não
 * faz sentido voltar. Usa o histórico do navegador, então funciona em
 * qualquer fluxo (voltar de dentro de um item da Vitrine, de uma conversa
 * aberta, etc.), não só entre as abas principais.
 */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/admin" || pathname === "/admin/";

  if (isHome) return null;

  return (
    <button
      onClick={() => { if (typeof window !== "undefined" && window.history.length > 1) router.back(); else router.push("/admin"); }}
      aria-label="Voltar"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[16px]"
    >
      ←
    </button>
  );
}
