"use client";

import Link from "next/link";
import { GiftArt } from "@/components/mobile/GiftArt";
import { BotaoCompartilhar, IconeCompartilhar } from "@/components/compartilhar/Compartilhar";

/** Página que mostra o gift ao cliente: bloqueado (a liberar) ou pronto. */
export function GiftReveal({ gift, voltar }: { voltar?: string | null; gift: { code: string; value_cents: number; from_name: string | null; to_name: string | null; message: string | null; status: string; used_at?: string | null; business_name: string; art_url: string | null; art_theme: string | null } }) {
  const liberado = gift.status === "paid" || gift.status === "used";
  const usado = gift.status === "used";

  return (
    <main className="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center px-5 pb-32 pt-10">
      {voltar && (
        <Link href={voltar} className="fixed left-4 top-4 z-10 flex min-h-[40px] items-center gap-1.5 rounded-full bg-surface-white/90 px-4 text-[14px] text-on-background shadow-lg backdrop-blur">
          <span aria-hidden>←</span> Voltar
        </Link>
      )}
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
        bloqueado={false}
      />
      </div>
      {usado ? (
        <p className="mt-5 text-center text-[14px] leading-relaxed text-text-secondary">
          Esse gift foi usado em {gift.business_name}
          {gift.used_at ? ` no dia ${new Date(gift.used_at).toLocaleDateString("pt-BR")}` : ""}. Esperamos que tenha gostado do presente.
        </p>
      ) : liberado ? (
        <>
          <p className="mt-5 text-center text-[14px] leading-relaxed text-text-secondary">
            Envie esta tela pra quem você quer presentear. É só mostrar no atendimento de {gift.business_name}.
          </p>
          <BotaoCompartilhar
            alvo={{ url: `/gift/${gift.code}`, titulo: "Gift card", rotulo: "Gift card", marca: gift.business_name, imagem: gift.art_url, texto: `${gift.from_name ? gift.from_name + " te enviou" : "Você ganhou"} um presente de ${gift.business_name}:` }}
            className="mx-auto mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-button-primary px-7 text-[15px] font-medium text-white transition-transform active:scale-95"
          >
            <span>Compartilhar</span>
          </BotaoCompartilhar>
        </>
      ) : (
        <>
          <p className="mt-5 text-center text-[14px] leading-relaxed text-text-secondary">
            Assim que {gift.business_name} confirmar o pagamento, libera o botão de compartilhar pra você enviar pra pessoa.
          </p>
          <button type="button" disabled className="mx-auto mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-surface-soft px-7 text-[15px] font-medium text-text-tertiary opacity-70">
            <IconeCompartilhar tam={18} />
            <span>Compartilhar</span>
          </button>
        </>
      )}
    </main>
  );
}
