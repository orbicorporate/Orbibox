"use client";

import { useState, type ComponentProps } from "react";
import { ConversasList } from "./ConversasList";
import { Segmentos } from "./Segmentos";
import { MinhasListas } from "./MinhasListas";
import { PorEtiqueta } from "./Etiquetas";

type AbaKey = "conversas" | "etiquetas" | "automaticas" | "minhas";

// Cada aba com ícone, cor e uma frase que explica o que é. As quatro
// pílulas iguais não diziam que eram filtros nem o que faziam.
const ABAS: { key: AbaKey; label: string; desc: string }[] = [
  { key: "conversas", label: "Conversas", desc: "" },
  { key: "etiquetas", label: "Por etiqueta", desc: "Seus contatos agrupados por interesse, de quem veio do link e de quem você importou." },
  { key: "automaticas", label: "Listas da Orbi", desc: "Listas que a Orbi monta sozinha: quem esquentou, sumiu, ou pegou voucher e não usou." },
  { key: "minhas", label: "Listas suas", desc: "Contatos que você traz de fora do Orbibox, com lembrete de recompra." },
];

/**
 * Talks tem quatro visões da mesma base de contatos. A barra de cima é um
 * filtro: troca o que você está vendo, não te leva pra outra tela.
 */
export function ConversasTabs(props: ComponentProps<typeof ConversasList>) {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [aba, setAba] = useState<AbaKey>(params?.get("lista") ? "automaticas" : "conversas");

  const semNadaAinda = props.conversations.length === 0;
  const ativa = ABAS.find((a) => a.key === aba)!;

  return (
    <>
      <div className="mt-4">
        <div role="tablist" aria-label="Ver" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {ABAS.map((a) => {
            const on = aba === a.key;
            return (
              <button
                key={a.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setAba(a.key)}
                className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${on ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
        {ativa.desc && <p className="mt-2.5 text-[12.5px] leading-snug text-text-tertiary">{ativa.desc}</p>}
      </div>

      {/* Sem nenhuma conversa ainda: aponta pro caminho que não depende
          de visitante, em vez de deixar a aba vazia. */}
      {semNadaAinda && aba === "conversas" && (
        <div className="mt-4 rounded-[24px] border border-dashed border-divider bg-surface-white p-5">
          <p className="text-[15px] font-semibold">Ainda sem conversas pelo link</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">
            Sem problema, Conversas funciona mesmo assim. Em &quot;Listas suas&quot; você importa os clientes que já
            tem e a Orbi escreve mensagens pra eles também.
          </p>
          <button type="button" onClick={() => setAba("minhas")} className="mt-3 cursor-pointer rounded-full bg-on-background px-4 py-2.5 text-[13.5px] font-semibold text-white">
            Ir pra Listas suas
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
