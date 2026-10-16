"use client";

import { CORES_FUNDO } from "@/lib/recorteIA";

/** Cor de fundo das fotos dos pratos (a mesma em todas, para a lista ficar uniforme). */
export default function CorFundoFotos({ valor, onChange, disabled }: { valor: string; onChange: (cor: string) => void; disabled?: boolean }) {
  const atual = CORES_FUNDO.find((c) => c.cor.toLowerCase() === valor.toLowerCase());
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <p className="text-[12.5px] text-text-secondary">Fundo <span className="text-text-tertiary">· {atual?.nome ?? "Personalizada"}</span></p>
      <div role="radiogroup" aria-label="Cor de fundo das fotos" className="flex items-center">
        {CORES_FUNDO.map((c) => {
          const ativa = c.cor.toLowerCase() === valor.toLowerCase();
          return (
            <button
              key={c.cor}
              type="button"
              role="radio"
              aria-checked={ativa}
              aria-label={c.nome}
              disabled={disabled}
              onClick={() => onChange(c.cor)}
              className="flex h-11 w-9 items-center justify-center disabled:opacity-60"
            >
              <span
                className={`block h-6 w-6 rounded-full transition-transform duration-150 ${ativa ? "scale-110 ring-2 ring-on-background ring-offset-2 ring-offset-white" : "ring-1 ring-black/15"}`}
                style={{ backgroundColor: c.cor }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
