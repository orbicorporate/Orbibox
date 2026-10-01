"use client";

import { GiftArt } from "@/components/mobile/GiftArt";

/** Página que mostra o gift ao cliente: bloqueado (a liberar) ou pronto. */
export function GiftReveal({ gift }: { gift: { code: string; value_cents: number; from_name: string | null; to_name: string | null; message: string | null; status: string; used_at?: string | null; business_name: string; art_url: string | null; art_theme: string | null } }) {
  const liberado = gift.status === "paid" || gift.status === "used";
  const usado = gift.status === "used";

  return (
    <main className="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center px-5 py-10">
      <p className="mb-4 text-center text-[13px] uppercase tracking-wide text-text-tertiary">
        {usado ? "Gift já utilizado" : liberado ? "Seu presente está pronto" : "Gift card reservado"}
      </p>
      <div className={usado ? "opacity-60 grayscale-[35%]" : undefined}>
      <GiftArt
        valorCents={gift.value_cents}
        paraQuem={gift.to_name}
        deQuem={gift.from_name}
        mensagem={gift.message}
        negocio={gift.business_name}
        codigo={gift.code}
        artUrl={gift.art_url}
        artTheme={gift.art_theme}
        bloqueado={!liberado}
      />
      </div>
      {usado ? (
        <p className="mt-5 text-center text-[14px] leading-relaxed text-text-secondary">
          Esse gift foi usado em {gift.business_name}
          {gift.used_at ? ` no dia ${new Date(gift.used_at).toLocaleDateString("pt-BR")}` : ""}. Esperamos que tenha gostado do presente.
        </p>
      ) : liberado ? (
        <p className="mt-5 text-center text-[14px] leading-relaxed text-text-secondary">
          Envie esta tela pra quem você quer presentear. É só mostrar no atendimento de {gift.business_name}.
        </p>
      ) : (
        <p className="mt-5 text-center text-[14px] leading-relaxed text-text-secondary">
          Assim que {gift.business_name} confirmar o pagamento, a arte fica colorida e pronta pra enviar.
        </p>
      )}
    </main>
  );
}
