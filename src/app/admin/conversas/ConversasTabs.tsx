"use client";

import { useState, type ComponentProps } from "react";
import { ConversasList } from "./ConversasList";
import { Segmentos } from "./Segmentos";
import { MinhasListas } from "./MinhasListas";
import { PorEtiqueta } from "./Etiquetas";

/**
 * Três abas: Conversas (quem chegou pelo link e falou com a Orbi), Listas
 * automáticas (montadas sozinhas pelo comportamento) e Minhas listas
 * (criadas pelo dono, com motivo próprio, importação em lote e lembrete
 * de recompra). Talks funciona mesmo sem nenhum visitante: "Minhas listas"
 * é o caminho pra trazer os clientes que já existem fora do Orbibox.
 */
export function ConversasTabs(props: ComponentProps<typeof ConversasList>) {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [aba, setAba] = useState<"conversas" | "automaticas" | "minhas" | "etiquetas">(
    params?.get("lista") ? "automaticas" : "conversas",
  );

  const semNadaAinda = props.conversations.length === 0;

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        {([["conversas", "Conversas"], ["etiquetas", "Por etiqueta"], ["automaticas", "Listas automáticas"], ["minhas", "Minhas listas"]] as const).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k)}
            className={`cursor-pointer rounded-full px-3.5 py-2 text-[13px] font-medium ${aba === k ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Sem nenhuma conversa ainda: aponta pro caminho que não depende
          de visitante, em vez de deixar a aba vazia. */}
      {semNadaAinda && aba === "conversas" && (
        <div className="mt-4 rounded-[24px] border border-dashed border-divider bg-surface-white p-5">
          <p className="text-[15px] font-semibold">Ainda sem conversas pelo link</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">
            Sem problema, o Talks funciona mesmo assim. Em &quot;Minhas listas&quot; você importa os clientes que já
            tem e a Orbi escreve mensagens pra eles também.
          </p>
          <button type="button" onClick={() => setAba("minhas")} className="mt-3 cursor-pointer rounded-full bg-on-background px-4 py-2.5 text-[13.5px] font-semibold text-white">
            Ir pra Minhas listas
          </button>
        </div>
      )}

      {aba === "conversas" && !semNadaAinda && <ConversasList {...props} />}
      {aba === "automaticas" && <Segmentos businessId={props.businessId} orbiColors={props.orbiColors} />}
      {aba === "minhas" && <MinhasListas businessId={props.businessId} orbiColors={props.orbiColors} />}
      {aba === "etiquetas" && <PorEtiqueta businessId={props.businessId} orbiColors={props.orbiColors} />}
    </>
  );
}
