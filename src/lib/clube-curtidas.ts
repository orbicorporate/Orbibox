"use client";

import { useEffect, useSyncExternalStore } from "react";
import { clubeDb, curtirAlvo } from "./clube";

/**
 * Curtidas de itens, vouchers e outras coisas da marca. Um estado só para a página
 * inteira: todo coração lê daqui, sem cada um consultar o banco.
 */
type Estado = { negocio: string | null; pronto: boolean; logado: boolean; userId: string | null; ehFa: boolean; curtidos: ReadonlySet<string> };

let estado: Estado = { negocio: null, pronto: false, logado: false, userId: null, ehFa: false, curtidos: new Set() };
const ouvintes = new Set<() => void>();
function mudar(novo: Partial<Estado>) {
  estado = { ...estado, ...novo };
  ouvintes.forEach((f) => f());
}
const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

export const chaveCurtida = (alvo: string, id: string) => `${alvo}:${id}`;

export async function carregarCurtidas(negocio: string) {
  const db = clubeDb();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return mudar({ negocio, pronto: true, logado: false, userId: null, ehFa: false, curtidos: new Set() });
  const [fan, likes] = await Promise.all([
    db.from("fans").select("customer_id").eq("business_id", negocio).eq("customer_id", user.id).maybeSingle(),
    db.from("likes").select("alvo, alvo_id").eq("business_id", negocio).eq("customer_id", user.id).neq("alvo", "marca"),
  ]);
  const lista = (likes.data ?? []) as { alvo: string; alvo_id: string }[];
  mudar({ negocio, pronto: true, logado: true, userId: user.id, ehFa: !!fan.data, curtidos: new Set(lista.map((l) => chaveCurtida(l.alvo, l.alvo_id))) });
}

export function useCurtidas(negocio: string): Estado {
  const e = useSyncExternalStore(assinar, () => estado, () => estado);
  useEffect(() => {
    if (e.negocio === negocio || carregando.has(negocio)) return;
    carregando.add(negocio);
    void carregarCurtidas(negocio).finally(() => carregando.delete(negocio));
  }, [e.negocio, negocio]);
  return e;
}
const carregando = new Set<string>();

/** Curte ou descurte. Muda na tela na hora e volta atrás se o banco recusar. */
export async function alternarCurtida(negocio: string, alvo: string, id: string) {
  if (!estado.userId) return;
  const k = chaveCurtida(alvo, id);
  const curtir = !estado.curtidos.has(k);
  const antes = estado.curtidos;
  const depois = new Set(antes);
  if (curtir) depois.add(k); else depois.delete(k);
  mudar({ curtidos: depois });
  const ok = await curtirAlvo(negocio, estado.userId, alvo, id, curtir);
  if (!ok) mudar({ curtidos: antes });
}
