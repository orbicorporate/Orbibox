"use client";

import Link from "next/link";
import { ShareOrbiboxButton } from "@/components/mobile/ShareOrbiboxButton";
import type { Oportunidade } from "@/lib/copiloto";

/**
 * O card principal da home: uma oportunidade por vez, no formato
 * dado → leitura → ação. O botão resolve ali mesmo (divulgar) ou leva
 * direto pra tela certa.
 */
export function OportunidadeCard({ o, shareUrl, shareTitle, shareReady }: { o: Oportunidade; shareUrl: string; shareTitle: string; shareReady: boolean }) {
  const escuro = o.tom === "oportunidade";
  const botao = `inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full px-5 text-[14px] font-medium transition-transform active:scale-[0.98] ${escuro ? "bg-white text-on-background" : "bg-on-background text-white"}`;

  return (
    <section
      className={`relative mt-6 overflow-hidden rounded-[24px] p-5 ${
        escuro ? "bg-[#111318] text-white" : o.tom === "alerta" ? "bg-[#FFF4F2] ring-1 ring-[#F6D3CC]" : "bg-surface-white ring-1 ring-black/[0.06]"
      }`}
    >
      {escuro && <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full orbi-gradient opacity-25 blur-3xl" aria-hidden />}
      <p className={`relative text-[12px] font-medium uppercase tracking-[0.1em] ${escuro ? "text-white/55" : o.tom === "alerta" ? "text-[#B4321F]" : "text-text-tertiary"}`}>
        {o.selo} {o.tom === "oportunidade" && <span className="orbi-gradient-text">✦</span>}
      </p>
      <h2 className="relative mt-1.5 font-[family-name:var(--font-manrope)] text-[19px] font-medium leading-[1.2] tracking-[-0.01em]">{o.titulo}</h2>
      <div className="relative mt-2 flex flex-col gap-0.5">
        {o.dados.slice(0, 1).map((d, i) => (
          <p key={i} className={`text-[14px] leading-snug ${escuro ? (i === 0 ? "text-white/90" : "text-white/60") : i === 0 ? "text-on-background" : "text-text-secondary"}`}>
            {d}
          </p>
        ))}
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        {o.cta.share ? (
          <ShareOrbiboxButton url={shareUrl} title={shareTitle} shareReady={shareReady} className={botao}>
            {o.cta.rotulo} <span aria-hidden>→</span>
          </ShareOrbiboxButton>
        ) : o.cta.externo ? (
          <a href={o.cta.href} target="_blank" rel="noreferrer" className={botao}>
            {o.cta.rotulo} <span aria-hidden>→</span>
          </a>
        ) : (
          <Link href={o.cta.href} className={botao}>
            {o.cta.rotulo} <span aria-hidden>→</span>
          </Link>
        )}
        {o.secundario && (
          <Link href={o.secundario.href} className={`text-[13.5px] underline underline-offset-2 ${escuro ? "text-white/70" : "text-text-secondary"}`}>
            {o.secundario.rotulo}
          </Link>
        )}
      </div>
    </section>
  );
}
