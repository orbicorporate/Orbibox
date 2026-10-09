"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

/**
 * Comemora as primeiras conquistas (primeira visita, primeiro toque,
 * primeira conversa, primeiro voucher resgatado...) e já ensina o que aquilo
 * significa e o próximo passo. Um marco por vez; quem já viu não vê de novo
 * neste aparelho.
 */
export type ContagemMarcos = { visitas: number; acoes: number; conversas: number; resgates: number };

const MARCOS: { id: string; atingiu: (c: ContagemMarcos) => boolean; titulo: string; significa: string; proximo: string; href: string; rotulo: string }[] = [
  { id: "primeira_visita", atingiu: (c) => c.visitas >= 1, titulo: "Alguém abriu seu link!", significa: "Sua página já está sendo vista por clientes de verdade.", proximo: "Deixe o WhatsApp como primeiro botão, pra quem chegar falar com você num toque.", href: "/admin/boxes", rotulo: "Organizar botões" },
  { id: "primeira_acao", atingiu: (c) => c.acoes >= 1, titulo: "Primeiro toque num botão", significa: "Alguém se interessou e tocou em algo da sua página. Isso é o começo de uma venda.", proximo: "Veja em Resultados o que mais chamou atenção.", href: "/admin/pulse", rotulo: "Ver Resultados" },
  { id: "primeira_conversa", atingiu: (c) => c.conversas >= 1, titulo: "A Orbi teve a primeira conversa", significa: "Um visitante perguntou e a Orbi respondeu por você.", proximo: "Veja o que perguntaram. A Orbi deixa a mensagem pronta pra você continuar no WhatsApp.", href: "/admin/conversas", rotulo: "Abrir Conversas" },
  { id: "primeiro_resgate", atingiu: (c) => c.resgates >= 1, titulo: "Primeiro voucher resgatado", significa: "Um cliente pegou seu desconto e vai aparecer com o código.", proximo: "Quando ele vier, confira o código em Vouchers, em Resgatar código.", href: "/admin/vouchers", rotulo: "Abrir Vouchers" },
  { id: "dez_visitas", atingiu: (c) => c.visitas >= 10, titulo: "10 visitas no seu link", significa: "Já tem gente voltando e indicando. A divulgação está funcionando.", proximo: "Um voucher de primeira compra transforma visita em cliente.", href: "/admin/vouchers?novo=1", rotulo: "Criar voucher" },
  { id: "cem_visitas", atingiu: (c) => c.visitas >= 100, titulo: "100 visitas!", significa: "Seu link virou um canal de verdade do seu negócio.", proximo: "Olhe em Resultados de onde vem mais gente e reforce ali.", href: "/admin/pulse", rotulo: "Ver Resultados" },
];

const chave = (b: string) => `orbi_marcos_${b}`;
function lerVistos(b: string): string {
  try {
    return localStorage.getItem(chave(b)) ?? "";
  } catch {
    return "__sem__";
  }
}

export function Marcos({ businessId, contagem }: { businessId: string; contagem: ContagemMarcos }) {
  const vistosBruto = useSyncExternalStore(() => () => {}, () => lerVistos(businessId), () => "__sem__");
  const [fechados, setFechados] = useState<string[]>([]);
  if (vistosBruto === "__sem__") return null;
  const vistos = new Set([...vistosBruto.split(",").filter(Boolean), ...fechados]);
  const marco = MARCOS.find((m) => m.atingiu(contagem) && !vistos.has(m.id));
  if (!marco) return null;

  function fechar() {
    const prox = [...vistos, marco!.id];
    try {
      localStorage.setItem(chave(businessId), prox.join(","));
    } catch {}
    setFechados((f) => [...f, marco!.id]);
  }

  return (
    <div className="apr-pop relative mt-3 overflow-hidden rounded-[22px] bg-surface-white p-4 shadow-[0_14px_30px_-16px_rgba(17,19,24,0.35)] ring-1 ring-black/[0.06]">
      <span className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full orbi-gradient opacity-30 blur-2xl" aria-hidden />
      <button type="button" onClick={fechar} aria-label="Fechar" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Conquista</p>
      <p className="relative mt-0.5 pr-8 font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight">{marco.titulo} 🎉</p>
      <p className="relative mt-1 text-[13.5px] leading-snug text-text-secondary">{marco.significa}</p>
      <Link href={marco.href} onClick={fechar} className="relative mt-3 inline-flex rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white">
        {marco.rotulo} →
      </Link>
    </div>
  );
}
