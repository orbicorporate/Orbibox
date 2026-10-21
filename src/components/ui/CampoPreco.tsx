"use client";

import { useState, type InputHTMLAttributes } from "react";

// Lê "22,50", "22.5", "22," ou "" como número (ou null quando vazio).
function analisar(t: string): number | null {
  const v = t.replace(",", ".").replace(/[^0-9.]/g, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "inputMode"> & {
  valor: number | null | undefined;
  onValor: (v: number | null) => void;
};

/**
 * Campo de preço que guarda o que a pessoa digitou. Sem isso, "22," virava 22 e a vírgula
 * sumia na hora, então digitar 22,50 resultava em 2250. O texto digitado só é trocado
 * quando o valor de fora muda por outro motivo (importação, edição em outra tela).
 */
export default function CampoPreco({ valor, onValor, ...resto }: Props) {
  const [texto, setTexto] = useState<string | null>(null);
  const mostrado =
    texto !== null && analisar(texto) === (valor ?? null)
      ? texto
      : valor == null
        ? ""
        : String(valor).replace(".", ",");
  return (
    <input
      {...resto}
      value={mostrado}
      inputMode="decimal"
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, "");
        setTexto(t);
        onValor(analisar(t));
      }}
    />
  );
}
