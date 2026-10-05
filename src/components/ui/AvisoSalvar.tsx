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

// Quem quer saber que algo foi salvo com sucesso (ex: a prévia ao vivo, que
// recarrega pra mostrar a mudança).
const ouvintesSalvo = new Set<() => void>();
export function aoSalvar(fn: () => void) {
  ouvintesSalvo.add(fn);
  return () => {
    ouvintesSalvo.delete(fn);
  };
}
export function avisarSalvo() {
  ouvintesSalvo.forEach((fn) => fn());
}

// Ajuda pra chamadas do Supabase: avisa se veio erro e devolve true se deu certo.
export function conferirSalvo(res: { error: unknown } | null | undefined, texto?: string): boolean {
  if (!res || res.error) {
    avisarErroSalvar(texto);
    return false;
  }
  avisarSalvo();
  return true;
}

// Exclusão com "Desfazer": some da tela na hora, mas só apaga de verdade
// depois de alguns segundos. Se a pessoa tocar em Desfazer, volta tudo e
// nada foi apagado. Se sair da página antes, apaga na hora (não fica perdido).
type Pendente = { id: number; texto: string; executar: () => Promise<unknown>; restaurar: () => void; timer: ReturnType<typeof setTimeout> | null };
const pendentes = new Map<number, Pendente>();
const ouvintesDesfazer = new Set<(p: Pendente | null) => void>();
const ESPERA_MS = 6000;

async function concluir(id: number) {
  const p = pendentes.get(id);
  if (!p) return;
  pendentes.delete(id);
  if (p.timer) clearTimeout(p.timer);
  ouvintesDesfazer.forEach((fn) => fn(null));
  try {
    const r = (await p.executar()) as { error?: unknown } | undefined;
    if (r && r.error) {
      p.restaurar();
      avisarErroSalvar("Não conseguimos excluir. Tente de novo.");
    }
  } catch {
    p.restaurar();
    avisarErroSalvar("Não conseguimos excluir. Tente de novo.");
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    for (const id of Array.from(pendentes.keys())) void concluir(id);
  });
}

export function excluirComDesfazer({ texto, executar, restaurar }: { texto: string; executar: () => Promise<unknown>; restaurar: () => void }) {
  // Uma exclusão por vez no aviso: a anterior é concluída antes.
  for (const id of Array.from(pendentes.keys())) void concluir(id);
  const id = ++seq;
  const p: Pendente = { id, texto, executar, restaurar, timer: null };
  p.timer = setTimeout(() => void concluir(id), ESPERA_MS);
  pendentes.set(id, p);
  ouvintesDesfazer.forEach((fn) => fn(p));
}

function desfazer(id: number) {
  const p = pendentes.get(id);
  if (!p) return;
  if (p.timer) clearTimeout(p.timer);
  pendentes.delete(id);
  p.restaurar();
  ouvintesDesfazer.forEach((fn) => fn(null));
}

export function AvisoSalvarHost() {
  const [pendente, setPendente] = useState<Pendente | null>(null);
  useEffect(() => {
    const fn = (p: Pendente | null) => setPendente(p);
    ouvintesDesfazer.add(fn);
    return () => {
      ouvintesDesfazer.delete(fn);
    };
  }, []);

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

  if (pendente) {
    return (
      <div role="status" className="fixed inset-x-0 bottom-28 z-[90] flex justify-center px-6">
        <div className="flex w-full max-w-[400px] items-center gap-3 rounded-2xl bg-[#1a1b1f] py-2.5 pl-4 pr-2 text-[13.5px] text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)]">
          <span className="min-w-0 flex-1 truncate">{pendente.texto}</span>
          <button type="button" onClick={() => desfazer(pendente.id)} className="shrink-0 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold">
            Desfazer
          </button>
        </div>
      </div>
    );
  }
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
