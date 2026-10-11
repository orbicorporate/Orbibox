"use client";

import { LogoApp } from "@/components/delivery/LogoApp";
import { appPorId, linkDoApp, type DeliveryApp } from "@/lib/delivery";
import { trackClick } from "@/lib/track";

/** Tela "Peça por delivery": um botão grande por app, cada um leva à loja naquele app. */
export function DeliveryFlow({ businessId, businessName, apps, sessionId, onBack }: { businessId: string; businessName: string; apps: DeliveryApp[]; sessionId: string | null; onBack: () => void }) {
  function abrir(a: DeliveryApp) {
    const link = linkDoApp(a);
    if (!link) return;
    trackClick({ businessId, kind: `delivery_${a.id}`, sessionId, targetUrl: link });
    window.open(link, "_blank", "noopener");
  }

  return (
    <div className="w-full">
      <button onClick={onBack} className="mb-3 text-[14px] text-text-tertiary hover:underline">← voltar</button>
      <h2 className="font-[family-name:var(--font-manrope)] text-[24px] font-medium tracking-[-0.01em]">Peça por delivery</h2>
      <p className="mt-1 text-[14px] text-text-secondary">Escolha o app que você mais usa para pedir de {businessName}.</p>

      <div className="mt-6 flex flex-col gap-3">
        {apps.map((a) => {
          const app = appPorId(a.id)!;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => abrir(a)}
              className="flex min-h-[72px] items-center gap-3.5 rounded-[24px] border border-divider bg-surface-white p-3.5 text-left transition-transform active:scale-[0.98]"
            >
              <LogoApp id={a.id} tamanho={52} />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{a.id === "whatsapp" ? "Pedir pelo WhatsApp" : a.id === "proprio" ? "Pedir no site da loja" : `Pedir no ${app.nome}`}</span>
                <span className="mt-0.5 block text-[12.5px] text-text-tertiary">{a.id === "whatsapp" ? "Conversa direto com a loja" : "Abre o app ou o site"}</span>
              </span>
              <span className="flex h-10 shrink-0 items-center rounded-full bg-on-background px-4 text-[13px] font-semibold text-white">Pedir ↗</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
