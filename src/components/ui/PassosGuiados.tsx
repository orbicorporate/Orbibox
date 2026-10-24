"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type Passo = {
  t: string;
  d: string;
  feito: boolean;
  /** href leva a outra tela ou âncora; api chama /api/comecar com essa ação. */
  acao?: { rotulo: string; href?: string; api?: string };
};

const pilula = "inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-on-background px-6 text-[15px] font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-50";

/**
 * Passo a passo curto para telas que começam vazias: um passo aberto por vez,
 * barra de progresso e uma ação clara. Some sozinho quando tudo está feito.
 */
export function PassosGuiados({ titulo, passos }: { titulo: string; passos: Passo[] }) {
  const router = useRouter();
  const atual = passos.findIndex((p) => !p.feito);
  const [aberto, setAberto] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (atual === -1) return null;
  const aqui = aberto ?? atual;

  async function chamar(api: string) {
    setErro(null);
    setOcupado(true);
    try {
      const r = await fetch("/api/comecar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: api }) });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      setErro("Não consegui agora. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <div>
        <p className="text-[15px] font-semibold">{titulo}</p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {passos.map((p, i) => <span key={p.t} className={`h-1.5 flex-1 rounded-full ${p.feito ? "bg-[#1F9E4C]" : i === atual ? "bg-on-background" : "bg-black/10"}`} />)}
        </div>
      </div>
      {passos.map((p, i) => {
        const abre = aqui === i;
        return (
          <section key={p.t} className={`rounded-[22px] bg-white p-3.5 ring-1 ring-black/[0.06] ${abre ? "shadow-[0_14px_30px_-18px_rgba(17,19,24,0.3)]" : ""}`}>
            <button type="button" onClick={() => setAberto(abre ? -1 : i)} className="flex w-full items-center gap-3 text-left">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white ${p.feito ? "bg-[#1F9E4C]" : "bg-on-background"}`}>{p.feito ? "✓" : i + 1}</span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold leading-tight">{p.t}</span>
              <span className={`text-text-tertiary transition-transform ${abre ? "rotate-90" : ""}`} aria-hidden>›</span>
            </button>
            {abre && (
              <div className="mt-3">
                <p className="text-[14px] text-text-secondary">{p.d}</p>
                {p.acao && !p.feito && (
                  p.acao.api ? (
                    <button type="button" disabled={ocupado} onClick={() => void chamar(p.acao!.api!)} className={`${pilula} mt-3`}>{ocupado ? "Criando…" : p.acao.rotulo}</button>
                  ) : (
                    <Link href={p.acao.href ?? "#"} className={`${pilula} mt-3`}>{p.acao.rotulo}</Link>
                  )
                )}
                {erro && <p className="mt-2 text-[12.5px] text-[#C4122F]">{erro}</p>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
