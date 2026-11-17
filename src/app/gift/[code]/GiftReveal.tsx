"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { GiftArt } from "@/components/mobile/GiftArt";
import { BotaoCompartilhar, IconeCompartilhar } from "@/components/compartilhar/Compartilhar";
import { numeroWa } from "@/lib/whatsapp";

/** Página que mostra o gift ao cliente: bloqueado (a liberar) ou pronto. */
export function GiftReveal({ gift, voltar, compradorPeloLink = false }: { voltar?: string | null; compradorPeloLink?: boolean; gift: { code: string; value_cents: number; from_name: string | null; to_name: string | null; message: string | null; status: string; used_at?: string | null; business_name: string; art_url: string | null; art_theme: string | null; whatsapp?: string | null } }) {
  const curto = gift.code.replace(/^GIFT-/i, "");
  const comprouAqui = useSyncExternalStore(
    () => () => {},
    () => { try { return window.localStorage.getItem(`orbi_gift_comprador_${gift.code}`) === "1"; } catch { return false; } },
    () => false,
  );
  const comprador = compradorPeloLink || comprouAqui;
  const [copiado, setCopiado] = useState(false);
  const zap = numeroWa(gift.whatsapp);
  const valorTxt = (gift.value_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  async function copiar() {
    try { await navigator.clipboard.writeText(curto); setCopiado(true); window.setTimeout(() => setCopiado(false), 1600); } catch { /* sem clipboard */ }
  }
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
        {usado ? "Gift já utilizado" : comprador ? (liberado ? "Seu presente está pronto" : "Gift card reservado") : liberado ? "Você ganhou um presente" : "Presente a caminho"}
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
          <button type="button" onClick={copiar} aria-label={`Código ${curto}. Toque para copiar`} className="mt-5 flex w-full flex-col items-center rounded-[22px] bg-surface-white py-4 ring-1 ring-divider active:scale-[0.99]">
            <span className="text-[11.5px] uppercase tracking-[0.16em] text-text-tertiary">Código do presente</span>
            <span className="mt-1 font-mono text-[40px] font-semibold leading-none tracking-[0.22em] text-on-background">{curto}</span>
            <span className="mt-2 text-[12px] text-text-secondary">{copiado ? "Copiado" : "Toque para copiar"}</span>
          </button>
          {comprador ? (
            <Passos
              titulo="Como usar este presente"
              passos={[
                `Toque em Compartilhar e envie este link para ${gift.to_name || "quem vai ganhar"}.`,
                `${gift.to_name || "Quem ganhou"} abre o link e mostra a tela, com o código ${curto}, ao garçom ou ao atendimento de ${gift.business_name}.`,
                `${gift.business_name} confere o código e dá baixa no valor.`,
              ]}
            />
          ) : (
            <Passos
              titulo="Como usar seu presente"
              passos={[
                `Vá até ${gift.business_name} quando quiser usar.`,
                `Mostre esta tela, com o código ${curto}, ao garçom ou ao atendimento.`,
                `${gift.business_name} confere o código e dá baixa no valor do presente.`,
              ]}
            />
          )}
          {comprador && <BotaoCompartilhar
            alvo={{ url: `/gift/${gift.code}`, titulo: "Gift card", rotulo: "Gift card", marca: gift.business_name, imagem: gift.art_url, capa: `/gift/${gift.code}/capa`, texto: `${gift.from_name ? gift.from_name + " te enviou" : "Você ganhou"} um presente de ${gift.business_name}:` }}
            className="mx-auto mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-button-primary px-7 text-[15px] font-medium text-white transition-transform active:scale-95"
          >
            <span>Compartilhar</span>
          </BotaoCompartilhar>}
          {zap && (
            <a
              href={`https://wa.me/${zap}?text=${encodeURIComponent(`Olá! ${comprador ? "Quero validar meu gift card" : "Ganhei um gift card e quero usar. Código"} ${curto} de ${valorTxt}. Pode conferir e dar baixa?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto mt-3 flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 text-[15px] font-medium text-white transition-transform active:scale-95"
            >
              {comprador ? "Validar por WhatsApp" : "Falar com o atendimento"}
            </a>
          )}
        </>
      ) : !comprador ? (
        <p className="mt-5 text-center text-[14px] leading-relaxed text-text-secondary">
          {gift.from_name ? `${gift.from_name} preparou` : "Alguém preparou"} este presente para você. Assim que {gift.business_name} confirmar, o código aparece aqui. Volte a abrir este link em alguns instantes.
        </p>
      ) : (
        <>
          <Passos
            titulo="Como funciona"
            passos={[
              `Combine o pagamento com ${gift.business_name} pelo WhatsApp.`,
              `Quando ${gift.business_name} confirmar, o botão de compartilhar é liberado aqui.`,
              `Você envia o link para ${gift.to_name || "quem vai ganhar"}, que mostra a tela ao garçom na hora de usar.`,
            ]}
          />
          <button type="button" disabled className="mx-auto mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-surface-soft px-7 text-[15px] font-medium text-text-tertiary opacity-70">
            <IconeCompartilhar tam={18} />
            <span>Compartilhar</span>
          </button>
        </>
      )}
    </main>
  );
}

function Passos({ titulo, passos }: { titulo: string; passos: string[] }) {
  return (
    <div className="mt-5 rounded-[22px] bg-surface-white p-4 ring-1 ring-divider">
      <p className="text-[14px] font-medium text-on-background">{titulo}</p>
      <ol className="mt-2.5 space-y-2.5">
        {passos.map((p, i) => (
          <li key={i} className="flex items-start gap-3 text-[13.5px] leading-snug text-text-secondary">
            <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-soft text-[12px] font-medium text-on-background">{i + 1}</span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
