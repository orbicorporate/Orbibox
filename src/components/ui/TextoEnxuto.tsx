"use client";

import { useState } from "react";

/**
 * Texto que aparece enxuto (cortado em N linhas) com um "ler mais" pra
 * expandir. Deixa as telas mais leves sem esconder a informação — ela
 * continua disponível a um toque.
 */
export function TextoEnxuto({
  children,
  linhas = 2,
  className = "",
}: {
  children: string;
  linhas?: number;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <span className={className}>
      <span
        className={aberto ? "" : "block overflow-hidden"}
        style={aberto ? undefined : { display: "-webkit-box", WebkitLineClamp: linhas, WebkitBoxOrient: "vertical" }}
      >
        {children}
      </span>
      <button
        onClick={() => setAberto((v) => !v)}
        className="mt-0.5 text-[12px] font-medium text-text-tertiary underline"
      >
        {aberto ? "ler menos" : "ler mais"}
      </button>
    </span>
  );
}
