"use client";

import Link from "next/link";
import { useState } from "react";

const BENEFICIOS = [
  "Bolinhas e boxes sem limite",
  "Vouchers e Gift card para vender mais",
  "A Orbi, a IA da sua marca, atendendo seus clientes",
  "Números e conversas dos visitantes",
  "PDFs, cardápio e materiais da marca",
  "Banco de imagens sem limite",
  "Sem o selo Feito com Orbibox",
];

const SUGESTOES = [
  "Crie um voucher de boas-vindas e deixe a Orbi divulgar para quem entrar na sua página.",
  "Peça para a Orbi responder as dúvidas dos seus clientes enquanto você trabalha.",
  "Monte um cardápio ou catálogo em PDF e deixe tudo a um toque do cliente.",
  "Veja quantas pessoas visitaram sua página e quem chamou no WhatsApp.",
  "Venda Gift card e receba antes de atender.",
  "Use a IA da sua marca para criar textos e ideias de divulgação.",
];

/** Anúncio constante para quem está no plano grátis: um benefício e uma sugestão por dia. */
export function UpgradeGratis({ nome }: { nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [dia] = useState(() => Math.floor(Date.now() / 86400000));
  const sugestao = SUGESTOES[dia % SUGESTOES.length];
  return (
    <div className="mx-4 mt-3 rounded-3xl border border-divider bg-surface-white p-4 shadow-[0_6px_18px_rgba(17,19,24,0.08)]">
      <p className="text-[13px] font-semibold text-text-secondary">Plano grátis</p>
      <p className="mt-1 text-[16px] font-semibold leading-snug">{nome} pode fazer muito mais no Nióbio</p>
      <p className="mt-1.5 text-[14px] leading-snug text-text-secondary">{sugestao}</p>
      {aberto && (
        <ul className="mt-3 space-y-1.5 text-[14px]">
          {BENEFICIOS.map((b) => <li key={b} className="flex gap-2"><span aria-hidden>✓</span><span>{b}</span></li>)}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/admin/planos" className="inline-flex min-h-[44px] items-center rounded-full bg-on-background px-5 text-[14px] font-semibold text-white">Ver planos</Link>
        <button type="button" onClick={() => setAberto((v) => !v)} className="min-h-[44px] rounded-full bg-surface-soft px-5 text-[14px] font-medium">{aberto ? "Fechar" : "Tudo que você ganha"}</button>
      </div>
    </div>
  );
}
