"use client";

import { useState, type ComponentProps } from "react";
import { ConversasList } from "./ConversasList";
import { Segmentos } from "./Segmentos";

/** Duas abas: as conversas (uma a uma) e as listas de disparo. */
export function ConversasTabs(props: ComponentProps<typeof ConversasList>) {
  // ?lista=<segmento> (vindo da vitrine ao publicar item) já abre em Listas.
  const [aba, setAba] = useState<"conversas" | "listas">(
    () => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lista") ? "listas" : "conversas"),
  );

  return (
    <>
      <div className="mt-4 flex gap-2">
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
      {aba === "conversas" ? <ConversasList {...props} /> : <Segmentos businessId={props.businessId} orbiColors={props.orbiColors} />}
    </>
  );
}
