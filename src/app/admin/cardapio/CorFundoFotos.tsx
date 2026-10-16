"use client";

import { CORES_FUNDO } from "@/lib/recorteIA";

/** Escolha da cor de fundo das fotos dos pratos (a mesma em todas, para a lista ficar uniforme). */
export default function CorFundoFotos({ valor, onChange, disabled }: { valor: string; onChange: (cor: string) => void; disabled?: boolean }) {
  return (
    <div className="mt-3">
      <p className="text-[13px] font-medium">Cor de fundo das fotos</p>
      <div role="radiogroup" aria-label="Cor de fundo das fotos" className="mt-1.5 flex flex-wrap gap-2">
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
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-60 ${ativa ? "ring-2 ring-on-background ring-offset-2" : "ring-1 ring-black/15"}`}
              style={{ backgroundColor: c.cor }}
            >
              {ativa && <span className="text-[13px] font-bold text-on-background" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[12px] text-text-tertiary">{CORES_FUNDO.find((c) => c.cor.toLowerCase() === valor.toLowerCase())?.nome ?? "Personalizada"}. Todas as fotos usam a mesma cor, com sombra suave.</p>
    </div>
  );
}
