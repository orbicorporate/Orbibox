"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

function inscrever(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function lerDispensado(chave: string): boolean {
  try {
    return window.localStorage.getItem(chave) === "1";
  } catch {
    return false;
  }
}

/**
 * Pergunta curta para quem pode ter uma rede de negócios ou franquia.
 * Quem tem vai direto para o painel da rede; quem não tem dispensa e não vê de novo.
 * A resposta fica só neste aparelho (é uma conveniência, não um dado da conta).
 */
export function PerguntaRede({ chave, href, aoTenho, className = "" }: { chave: string; href?: string; aoTenho?: () => void; className?: string }) {
  // No servidor começa escondido, para não piscar para quem já dispensou.
  const dispensadoSalvo = useSyncExternalStore(inscrever, () => lerDispensado(chave), () => true);
  const [dispensadoAgora, setDispensadoAgora] = useState(false);
  if (dispensadoSalvo || dispensadoAgora) return null;

  function dispensar() {
    try { window.localStorage.setItem(chave, "1"); } catch { /* sem armazenamento: some só nesta visita */ }
    setDispensadoAgora(true);
  }

  return (
    <section className={`rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06] ${className}`} aria-label="Rede de negócios">
      <p className="text-[15px] font-medium">Você tem mais de um negócio ou uma franquia?</p>
      <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">
        Cada negócio tem o seu Orbibox, e você acompanha todos num painel só: visitas, vouchers e os produtos que mais saem. Cada negócio gera um código e você adiciona.
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {href ? (
          <Link href={href} className="flex min-h-[44px] items-center rounded-full bg-on-background px-5 text-[14px] font-medium text-white active:scale-[0.98]">
            Sim, tenho uma rede
          </Link>
        ) : (
          <button type="button" onClick={aoTenho} className="min-h-[44px] rounded-full bg-on-background px-5 text-[14px] font-medium text-white active:scale-[0.98]">
            Sim, tenho uma rede
          </button>
        )}
        <button type="button" onClick={dispensar} className="min-h-[44px] rounded-full border border-divider px-5 text-[14px] text-text-secondary active:scale-[0.98]">
          Só um negócio
        </button>
      </div>
    </section>
  );
}
