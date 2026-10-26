"use client";

import { alternarCurtida, chaveCurtida, useCurtidas } from "@/lib/clube-curtidas";
import { IcCoracao } from "./pecas";

export type PedidoFa = { titulo: string; alvo: string; id: string };

/**
 * Coração de curtir um item, voucher ou qualquer coisa da marca.
 * Só fã curte: quem ainda não é fã recebe o convite para virar fã.
 */
export function CurtirItem({ businessId, alvo, id, titulo, className = "", cor }: { businessId: string; alvo: string; id: string; titulo: string; className?: string; /** Cor da linha do coração (clara em fundo escuro). */ cor?: string }) {
  const e = useCurtidas(businessId);
  const curtiu = e.curtidos.has(chaveCurtida(alvo, id));

  async function clique(ev: React.MouseEvent<HTMLButtonElement>) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!e.logado || !e.ehFa) {
      window.dispatchEvent(new CustomEvent<PedidoFa>("clube:pedir-fa", { detail: { titulo, alvo, id } }));
      return;
    }
    await alternarCurtida(businessId, alvo, id);
  }

  return (
    <button type="button" onClick={clique} aria-pressed={curtiu} aria-label={curtiu ? `Descurtir ${titulo}` : `Curtir ${titulo}`} className={`cl-cora ${curtiu ? "on" : ""} ${className}`} style={cor ? ({ "--cora": cor } as React.CSSProperties) : undefined}>
      <IcCoracao cheio={curtiu} />
    </button>
  );
}
