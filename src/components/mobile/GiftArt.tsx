"use client";

import { useId } from "react";
import { giftGradient } from "@/lib/giftThemes";

/**
 * A arte do gift card. Quando "liberado" (pago), aparece limpa e colorida,
 * pronta pra presentear. Quando "bloqueado" (ainda não pago), leva uma
 * marca d'água por cima, pra ninguém usar um gift que não foi acertado
 * com a loja.
 *
 * Com foto da loja (art_url): a foto nítida no lado direito e, no
 * esquerdo, um painel de vidro fosco (a própria foto desfocada) com borda
 * curva, onde fica o texto. Sem foto: um dos degradês prontos (art_theme).
 *
 * O véu escuro por cima é sempre aplicado, nunca opcional: garante que o
 * valor e o código fiquem legíveis mesmo se a loja subir uma foto ruim
 * pra isso (contraste baixo, muita informação visual etc). Sobre foto
 * enviada pela loja o véu é mais forte, porque não controlamos o
 * conteúdo; sobre os degradês prontos, mais leve, porque já são
 * desenhados pra ficar legíveis.
 */
export function GiftArt({
  valorCents,
  paraQuem,
  deQuem,
  mensagem,
  negocio,
  codigo,
  artUrl,
  artTheme,
  bloqueado,
}: {
  valorCents: number;
  paraQuem?: string | null;
  deQuem?: string | null;
  mensagem?: string | null;
  negocio: string;
  codigo: string;
  artUrl?: string | null;
  artTheme?: string | null;
  bloqueado: boolean;
}) {
  const clipId = `gift-vidro-${useId().replace(/:/g, "")}`;
  const valor = (valorCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="relative aspect-[1.6/1] w-full overflow-hidden rounded-[22px] text-white shadow-[0_14px_40px_rgba(17,19,24,0.22)]">
      {artUrl ? (
        <>
          {/* Com foto: a própria foto, bem desfocada, vira o fundo do card;
              do lado direito ela aparece nítida; do esquerdo um painel de
              vidro fosco com borda curva segura o texto. */}
          {/* Fundo inteiro: a foto bem desfocada, pra o vidro ter o que refratar. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl" />
          {/* Foto nítida à direita. A borda esquerda dela se dissolve debaixo
              do vidro, então nunca aparece uma linha reta atrás dele. */}
          <div
            className="absolute inset-y-0 right-0 w-[58%]"
            style={{ WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 34%)", maskImage: "linear-gradient(90deg, transparent 0%, #000 34%)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artUrl} alt="" className="h-full w-full object-cover object-right" />
          </div>
          <svg width="0" height="0" className="absolute" aria-hidden>
            <defs>
              <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                <path d="M0,0 H1 C0.87,0.3 0.87,0.7 1,1 H0 Z" />
              </clipPath>
            </defs>
          </svg>
          {/* Painel de vidro na cor escolhida, com reflexo. */}
          <div className="absolute inset-y-0 left-0 w-[66%]" style={{ clipPath: `url(#${clipId})` }}>
            {/* O "fosco": a foto desfocada dentro do próprio painel (backdrop-filter
                vaza num retângulo fora do recorte curvo). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl" />
            {/* Tinta do vidro na cor escolhida, translúcida: dá pra ver a foto
                fosca por trás, como vidro de verdade. */}
            <div className="absolute inset-0 opacity-[.58]" style={{ background: giftGradient(artTheme) }} />
            <div className="absolute inset-0 bg-black/[.10]" />
            {/* Reflexo: luz larga e macia vindo do alto, sem listras. */}
            <div
              className="absolute inset-0"
              style={{
                background: [
                  "radial-gradient(120% 70% at 18% -10%, rgba(255,255,255,.34) 0%, rgba(255,255,255,.10) 38%, rgba(255,255,255,0) 62%)",
                  "linear-gradient(180deg, rgba(255,255,255,.08) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,.12) 100%)",
                ].join(", "),
              }}
            />
            {/* Chanfro: luz por dentro das bordas do vidro. */}
            <div
              className="absolute inset-0"
              style={{
                background: [
                  "linear-gradient(90deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 7%)",
                  "linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 10%)",
                  "linear-gradient(0deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,0) 9%)",
                ].join(", "),
              }}
            />
          </div>
          {/* Borda curva do vidro: fio de luz nítido + brilho macio por dentro. */}
          <svg className="pointer-events-none absolute inset-y-0 left-0 h-full w-[66%]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <filter id={`${clipId}-b`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6" /></filter>
              <linearGradient id={`${clipId}-g`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity=".85" />
                <stop offset=".5" stopColor="#fff" stopOpacity=".45" />
                <stop offset="1" stopColor="#fff" stopOpacity=".75" />
              </linearGradient>
            </defs>
            <path d="M97,0 C84,30 84,70 97,100" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="5" filter={`url(#${clipId}-b)`} />
            <path d="M100,0 C87,30 87,70 100,100" fill="none" stroke={`url(#${clipId}-g)`} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          </svg>
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: giftGradient(artTheme) }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.42) 100%)" }} />
        </>
      )}
      {/* Borda de vidro do card inteiro */}
      <div className="pointer-events-none absolute inset-0 rounded-[22px]" style={{ boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.42), inset 0 1px 0 rgba(255,255,255,.6), inset 0 0 0 4px rgba(255,255,255,.06)" }} />

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-[inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-md">Gift Card</span>
          {!artUrl && <span className="text-[11px] font-medium opacity-90">{negocio}</span>}
        </div>

        <div className={artUrl ? "max-w-[56%]" : undefined}>
          {artUrl && <p className="mb-1 text-[11px] font-medium opacity-90">{negocio}</p>}
          {paraQuem && <p className="text-[12px] opacity-85">Para {paraQuem}</p>}
          <p className="font-[family-name:var(--font-manrope)] text-[38px] font-semibold leading-none tracking-[-0.02em] [text-shadow:0_1px_12px_rgba(0,0,0,.18)]">{valor}</p>
          {mensagem && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug opacity-90">&ldquo;{mensagem}&rdquo;</p>}
          {deQuem && <p className="mt-2 text-[11.5px] opacity-85">de {deQuem}</p>}
        </div>
      </div>
      <p className="absolute bottom-4 right-4 rounded-full border border-white/35 bg-white/15 px-3 py-1 font-mono text-[10.5px] tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-md [text-shadow:0_1px_4px_rgba(0,0,0,.25)]">{codigo}</p>

      {/* Marca d'água de bloqueado: faixas + carimbo. Some quando liberado. */}
      {bloqueado && (
        <>
          {/* Sem listras: o carimbo e o código escondido já deixam claro que ainda não vale. */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="-rotate-[14deg] rounded-xl border-2 border-white/70 bg-black/25 px-4 py-1.5 text-[13px] font-bold uppercase tracking-[0.15em] backdrop-blur-[1px]">
              A liberar
            </span>
          </div>
        </>
      )}
    </div>
  );
}
