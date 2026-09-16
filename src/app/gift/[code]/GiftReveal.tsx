"use client";

import { GiftArt } from "@/components/mobile/GiftArt";

/** Página que mostra o gift ao cliente: bloqueado (a liberar) ou pronto. */
export function GiftReveal({ gift }: { gift: { code: string; value_cents: number; from_name: string | null; to_name: string | null; message: string | null; status: string; business_name: string; art_url: string | null; art_theme: string | null } }) {
  const liberado = gift.status === "paid" || gift.status === "used";

  return (
    <main className="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center px-5 py-10">
      <p className="mb-4 text-center text-[13px] uppercase tracking-wide text-text-tertiary">
        {liberado ? "Seu presente está pronto" : "Gift card reservado"}
      </p>
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
      {liberado ? (
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
