"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { OrbiTrial } from "@/app/admin/agent/OrbiTrial";
import { AjudaOrbi } from "@/components/orbi/AjudaOrbi";

type Product = { id: string; title: string; price: number | null; price_type: string; price_max: number | null; image_url: string | null; link_kind: string | null; target_url: string | null };

/**
 * A Orbi flutuante do painel virou a ajuda: toca nela e pergunta como fazer
 * qualquer coisa. Embaixo da ajuda fica o atalho de sempre: ajustar a Orbi
 * (quem tem o plano com IA) ou testá-la grátis (quem ainda não tem).
 */
export function AdminOrbiFloating({
  businessId,
  hasAiChat,
  agentName,
  orbiColors,
  address,
  products,
}: {
  businessId: string;
  hasAiChat: boolean;
  agentName: string;
  orbiColors: string[] | null;
  address: string | null;
  products: Product[];
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  // Na própria tela da Orbi a flutuante seria redundante.
  if (pathname?.startsWith("/admin/agent")) return null;

  const extra = hasAiChat ? (
    <Link href="/admin/agent" onClick={() => setAberto(false)} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-[14px] ring-1 ring-black/[0.05]">
      <span>Ajustar o jeito da {agentName} falar com seus clientes</span>
      <span className="text-text-tertiary">›</span>
    </Link>
  ) : (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-black/[0.05]">
      <OrbiTrial businessId={businessId} agentName={agentName} orbiColors={orbiColors} address={address} products={products} />
    </div>
  );

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        aria-label={`Ajuda da ${agentName}`}
        className="fixed bottom-28 right-4 z-40 flex h-14 w-14 items-center justify-center transition-transform active:scale-95"
        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.22))" }}
      >
        <OrbiParticleSphere size={56} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-on-background text-[11px] font-bold text-white ring-2 ring-white">?</span>
      </button>
      <AjudaOrbi aberto={aberto} onFechar={() => setAberto(false)} orbiColors={orbiColors} extra={extra} />
    </>
  );
}
