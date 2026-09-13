"use client";

import { useState } from "react";
import Link from "next/link";

export function ReferralPanel({ code, assinaram, mesesGanhos, naCarencia }: { code: string; assinaram: number; mesesGanhos: number; naCarencia: number }) {
  const [copied, setCopied] = useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${base}/r/${code}`;
  const mensagem = `Tô usando o Orbibox pra vender mais e queria te indicar. Assinando pelo meu link, nós dois ganhamos 1 mês grátis: ${link}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* sem clipboard */ }
  }

  async function compartilhar() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: "Orbibox", text: mensagem }); return; } catch { /* cancelou */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  return (
    <div className="flex flex-col pb-4">
      <Link href="/admin" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Painel</Link>

      {/* Herói */}
      <div className="relative mt-4 overflow-hidden rounded-[28px] p-7 text-center text-on-background orbi-gradient">
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
        <span className="relative text-[30px]">🎁</span>
        <p className="relative mt-2 font-[family-name:var(--font-manrope)] text-[24px] font-bold leading-tight">Indique e ganhe 1 mês grátis</p>
        <p className="relative mt-2 text-[14px] leading-relaxed text-on-background/80">
          Cada amigo que assinar o plano anual pelo seu link dá <span className="font-semibold">1 mês grátis pra você</span>, e pra ele também. Sem limite de indicações.
        </p>
      </div>

      {/* Link + ações */}
      <div className="mt-4 rounded-[24px] border border-divider bg-surface-white p-5">
        <p className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Seu link de indicação</p>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface-soft px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{link}</span>
          <button onClick={copiar} className="shrink-0 rounded-full bg-on-background px-3.5 py-1.5 text-[12.5px] font-semibold text-white">
            {copied ? "Copiado ✓" : "Copiar"}
          </button>
        </div>
        <button onClick={compartilhar} className="orbi-gradient mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-bold text-on-background">
          Compartilhar com amigos
        </button>
      </div>

      {/* Estatísticas */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-[20px] p-3.5" style={{ backgroundColor: "#E7EAFC" }}>
          <p className="text-[24px] font-bold" style={{ color: "#4453D6" }}>{assinaram}</p>
          <p className="mt-0.5 text-[12px] font-medium leading-tight" style={{ color: "#4453D6" }}>amigos assinaram</p>
        </div>
        <div className="rounded-[20px] p-3.5" style={{ backgroundColor: "#FDEEDF" }}>
          <p className="text-[24px] font-bold" style={{ color: "#C2650A" }}>{naCarencia}</p>
          <p className="mt-0.5 text-[12px] font-medium leading-tight" style={{ color: "#C2650A" }}>a confirmar</p>
        </div>
        <div className="rounded-[20px] p-3.5" style={{ backgroundColor: "#DEF3E3" }}>
          <p className="text-[24px] font-bold" style={{ color: "#1F9E4C" }}>{mesesGanhos}</p>
          <p className="mt-0.5 text-[12px] font-medium leading-tight" style={{ color: "#1F9E4C" }}>meses ganhos</p>
        </div>
      </div>

      <div className="mt-5 rounded-[20px] bg-surface-soft p-4">
        <p className="text-[13px] font-semibold">Como funciona</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          Você compartilha seu link. Quando um amigo cria a conta por ele e assina o plano anual, o mês grátis entra
          pros dois 7 dias depois, o tempo de garantir que a assinatura ficou de pé. O mês é somado à sua próxima
          renovação, automaticamente.
        </p>
      </div>
    </div>
  );
}
