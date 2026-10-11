"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";

type Formato = "horizontal" | "quadrado";

const OPCOES: { v: Formato; titulo: string; texto: string }[] = [
  { v: "horizontal", titulo: "Horizontal", texto: "Um por linha, com a foto na lateral e o texto ao lado." },
  { v: "quadrado", titulo: "Quadrado", texto: "Dois por linha, com a foto em cima e o botão embaixo." },
];

function Mini({ v, ativo }: { v: Formato; ativo: boolean }) {
  const cor = ativo ? "bg-on-background" : "bg-divider";
  const claro = ativo ? "bg-on-background/35" : "bg-divider/60";
  return v === "horizontal" ? (
    <span className="flex h-[46px] w-[84px] overflow-hidden rounded-xl" aria-hidden>
      <span className={`flex flex-1 flex-col justify-center gap-1.5 px-2.5 ${cor}`}><i className="h-1.5 w-8 rounded-full bg-white/80" /><i className="h-1.5 w-5 rounded-full bg-white/50" /></span>
      <span className={`w-9 ${claro}`} />
    </span>
  ) : (
    <span className="flex gap-1.5" aria-hidden>
      {[0, 1].map((n) => (
        <span key={n} className={`flex h-[58px] w-[38px] flex-col gap-1 rounded-lg p-1 ${cor}`}><i className="block flex-1 rounded-[5px] bg-white/45" /><i className="block h-1.5 rounded-full bg-white/80" /></span>
      ))}
    </span>
  );
}

/** Formato dos vouchers na página pública: vale para todos, fica no box de Vouchers. */
export function VoucherFormato({ boxId, config, inicial }: { boxId: string; config: Record<string, unknown>; inicial: Formato }) {
  const [formato, setFormato] = useState<Formato>(inicial);
  const [cfg, setCfg] = useState(config);

  async function escolher(v: Formato) {
    if (v === formato) return;
    const anterior = formato;
    const novo = { ...cfg, voucherFormato: v };
    setFormato(v);
    setCfg(novo);
    const res = await createClient().from("smart_boxes").update({ config: novo }).eq("id", boxId);
    if (!conferirSalvo(res)) { setFormato(anterior); setCfg(cfg); }
  }

  return (
    <section aria-label="Formato dos vouchers">
      <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Formato dos vouchers</p>
      <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-2.5">
        {OPCOES.map((o) => {
          const ativo = formato === o.v;
          return (
            <button key={o.v} type="button" role="radio" aria-checked={ativo} onClick={() => escolher(o.v)} className={`flex flex-col items-start gap-2.5 rounded-2xl border-2 p-3.5 text-left ${ativo ? "border-on-background bg-surface-white" : "border-divider"}`}>
              <Mini v={o.v} ativo={ativo} />
              <span>
                <span className="block text-[14.5px] font-medium">{o.titulo}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{o.texto}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
