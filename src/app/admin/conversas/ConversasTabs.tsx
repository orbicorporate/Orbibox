"use client";

import { useState, type ComponentProps } from "react";
import { ConversasList } from "./ConversasList";
import { Segmentos } from "./Segmentos";
import { MinhasListas } from "./MinhasListas";
import { PorEtiqueta } from "./Etiquetas";

type AbaKey = "conversas" | "etiquetas" | "automaticas" | "minhas";

// Cada aba com ícone, cor e uma frase que explica o que é. As quatro
// pílulas iguais não diziam que eram filtros nem o que faziam.
const ABAS: { key: AbaKey; label: string; icon: string; cor: string; fundo: string; desc: string }[] = [
  { key: "conversas", label: "Conversas", icon: "▤", cor: "#1D4ED8", fundo: "#E2EAFE", desc: "Quem falou com a Orbi pelo seu link. Ela resume, mede a temperatura e sugere o que responder." },
  { key: "etiquetas", label: "Por etiqueta", icon: "◉", cor: "#6D28D9", fundo: "#EDE6FC", desc: "Seus contatos agrupados por interesse, misturando quem veio do link e quem você importou." },
  { key: "automaticas", label: "Listas automáticas", icon: "✦", cor: "#1F7A3D", fundo: "#DEF3E3", desc: "Listas que a Orbi monta sozinha: quem esquentou, sumiu, ou pegou voucher e não usou." },
  { key: "minhas", label: "Minhas listas", icon: "◫", cor: "#C2650A", fundo: "#FDEEDF", desc: "Contatos que você traz de fora do Orbibox e organiza do seu jeito, com lembrete de recompra." },
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
      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Ver</p>
        <div className="flex flex-wrap gap-2">
          {ABAS.map((a) => {
            const on = aba === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setAba(a.key)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all"
                style={on ? { backgroundColor: a.cor, color: "#fff" } : { backgroundColor: a.fundo, color: a.cor }}
              >
                <span className="text-[13px]">{a.icon}</span>
                {a.label}
              </button>
            );
          })}
        </div>
        {/* Explica a visão ativa, com a cor dela */}
        <div className="mt-2.5 flex items-start gap-2.5 rounded-[16px] px-3.5 py-2.5" style={{ backgroundColor: ativa.fundo }}>
          <span className="mt-0.5 shrink-0 text-[14px]" style={{ color: ativa.cor }}>{ativa.icon}</span>
          <p className="text-[12.5px] leading-snug" style={{ color: ativa.cor }}>{ativa.desc}</p>
        </div>
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
