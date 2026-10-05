"use client";

import { useEffect, useState } from "react";

// Aviso global e discreto pra quando um salvamento falha. Qualquer tela do
// painel chama avisarErroSalvar() e a pessoa fica sabendo na hora, em vez de
// achar que salvou quando não salvou.
type Aviso = { id: number; texto: string };
const ouvintes = new Set<(a: Aviso) => void>();
let seq = 0;

export function avisarErroSalvar(texto = "Não conseguimos salvar. Confira sua internet e tente de novo.") {
  const a = { id: ++seq, texto };
  ouvintes.forEach((fn) => fn(a));
}

// Ajuda pra chamadas do Supabase: avisa se veio erro e devolve true se deu certo.
export function conferirSalvo(res: { error: unknown } | null | undefined, texto?: string): boolean {
  if (!res || res.error) {
    avisarErroSalvar(texto);
    return false;
  }
  return true;
}

export function AvisoSalvarHost() {
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    const fn = (a: Aviso) => setAviso(a);
    ouvintes.add(fn);
    return () => {
      ouvintes.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!aviso) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-28 z-[90] flex justify-center px-6">
      <button
        type="button"
        onClick={() => setAviso(null)}
        className="flex max-w-[400px] items-center gap-3 rounded-2xl bg-[#1a1b1f] px-4 py-3 text-left text-[13px] leading-snug text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)]"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/90 text-[13px] font-semibold">!</span>
        <span>{aviso.texto}</span>
      </button>
    </div>
  );
}
