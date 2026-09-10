"use client";

import { usePathname, useRouter } from "next/navigation";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { OrbiTrial } from "@/app/admin/agent/OrbiTrial";

type Product = { id: string; title: string; price: number | null; price_type: string; price_max: number | null; image_url: string | null; link_kind: string | null; target_url: string | null };

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
  const router = useRouter();
  const pathname = usePathname();

  // Não aparece em telas onde atraparia botões de ação ou seria redundante:
  // a própria config da Orbi, e a de cupons (que tem o "Novo cupom" no rodapé).
  if (pathname?.startsWith("/admin/agent") || pathname?.startsWith("/admin/vouchers")) {
    return null;
  }

  // Nióbio: já tem a Orbi ativa, então a flutuante é um atalho rápido pra
  // configurar/ajustar a personalidade dela (leva pro AgentBox).
  if (hasAiChat) {
    return (
      <button
        onClick={() => router.push("/admin/agent")}
        aria-label={`Configurar a ${agentName}`}
        className="fixed bottom-28 right-4 z-40 flex h-14 w-14 items-center justify-center transition-transform active:scale-95"
        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.22))" }}
      >
        <OrbiParticleSphere size={56} colors={orbiColors ?? undefined} vivid className="rounded-full" />
      </button>
    );
  }

  // Titânio/trial: a flutuante abre o teste grátis. O próprio OrbiTrial já
  // renderiza o botão-gatilho; aqui só o posicionamos flutuante no canto.
  return (
    <div className="fixed bottom-28 right-4 z-40">
      <OrbiTrial
        businessId={businessId}
        agentName={agentName}
        orbiColors={orbiColors}
        address={address}
        products={products}
        floating
      />
    </div>
  );
}
