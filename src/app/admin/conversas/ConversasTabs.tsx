"use client";

import { useState, type ComponentProps } from "react";
import { ConversasList } from "./ConversasList";
import { Segmentos } from "./Segmentos";
import { AdicionarContato } from "./AdicionarContato";

/**
 * Duas abas: as conversas (uma a uma, vêm de quem visitou o link) e as
 * listas de disparo (vêm de qualquer lead, incluindo os adicionados à
 * mão). Talks funciona mesmo sem nenhum visitante: o dono importa os
 * clientes que já tem e usa a Orbi pra falar com eles também.
 */
export function ConversasTabs(props: ComponentProps<typeof ConversasList>) {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [aba, setAba] = useState<"conversas" | "listas">(params?.get("lista") ? "listas" : "conversas");
  const [refreshKey, setRefreshKey] = useState(0);

  const semNadaAinda = props.conversations.length === 0;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {([["conversas", "Conversas"], ["listas", "Listas de disparo"]] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setAba(k)}
              className={`cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-medium ${aba === k ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <AdicionarContato businessId={props.businessId} onAdded={() => { setRefreshKey((k) => k + 1); setAba("listas"); }} />
      </div>

      {/* Sem nenhuma conversa ainda: a página não fica vazia, ela ensina o
          outro jeito de usar o Talks, que não depende de visitante nenhum. */}
      {semNadaAinda && aba === "conversas" && (
        <div className="mt-4 rounded-[24px] border border-dashed border-divider bg-surface-white p-5">
          <p className="text-[15px] font-semibold">Ainda sem conversas pelo link</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">
            Sem problema, o Talks funciona mesmo assim. Adicione os clientes que você já tem no WhatsApp e a Orbi
            escreve mensagens pra eles também, do mesmo jeito que faria com quem chegasse pelo seu link.
          </p>
          <AdicionarContato
            businessId={props.businessId}
            onAdded={() => { setRefreshKey((k) => k + 1); setAba("listas"); }}
            trigger={
              <button type="button" className="mt-3 cursor-pointer rounded-full bg-on-background px-4 py-2.5 text-[13.5px] font-semibold text-white">
                + Adicionar meu primeiro contato
              </button>
            }
          />
        </div>
      )}

      {aba === "conversas" ? (
        !semNadaAinda && <ConversasList {...props} />
      ) : (
        <Segmentos businessId={props.businessId} orbiColors={props.orbiColors} refreshKey={refreshKey} />
      )}
    </>
  );
}
