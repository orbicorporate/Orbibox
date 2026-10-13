"use client";

import { IconePresente, IconeReais, IconePorcento } from "./IconesLinha";

export type TipoDesconto = "percent" | "fixed" | "gift";

// Porcentagem fica por último: é a opção que mais vem pré-marcada, então quem
// quer um brinde ou um valor em reais precisa ver essas duas primeiro.
const OPCOES: { id: TipoDesconto; nome: string; sub: string; icone: React.ReactNode }[] = [
  { id: "gift", nome: "Brinde", sub: "Um item ou benefício", icone: <IconePresente size={22} /> },
  { id: "fixed", nome: "Valor em R$", sub: "Ex: R$ 15 off", icone: <IconeReais size={22} /> },
  { id: "percent", nome: "Porcentagem", sub: "Ex: 10% off", icone: <IconePorcento size={22} /> },
];

/**
 * Escolha do benefício do voucher: três opções lado a lado (em vez de uma
 * lista suspensa), e logo abaixo o campo certo para cada uma, com o símbolo
 * % ou R$ dentro do campo e um exemplo do que vai aparecer no cartão.
 */
export function SeletorDesconto({
  tipo,
  valor,
  onTipo,
  onValor,
  invalido,
  idCampo,
}: {
  /** Vazio no cadastro novo: a pessoa precisa escolher, nada vem pré-marcado. */
  tipo: TipoDesconto | "";
  valor: string;
  onTipo: (t: TipoDesconto) => void;
  onValor: (v: string) => void;
  invalido?: boolean;
  idCampo?: string;
}) {
  const exemplo = tipo === "percent" ? `${valor || "10"}% OFF` : `R$ ${valor || "15"} OFF`;
  return (
    <div>
      <div role="radiogroup" aria-label="Tipo de benefício" className="grid grid-cols-3 gap-2">
        {OPCOES.map((o) => {
          const on = tipo === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onTipo(o.id)}
              className={`flex flex-col items-center gap-0.5 rounded-[20px] border-2 px-2 py-3 text-center transition-colors ${on ? "border-on-background bg-on-background text-white" : "border-divider bg-surface-white text-text-secondary"}`}
            >
              <span aria-hidden>{o.icone}</span>
              <span className="mt-1 text-[13px] font-semibold leading-tight">{o.nome}</span>
              <span className={`text-[11px] leading-tight ${on ? "text-white/70" : "text-text-tertiary"}`}>{o.sub}</span>
            </button>
          );
        })}
      </div>

      {tipo === "" ? (
        <p className={`mt-2 rounded-[20px] px-4 py-3 text-[13px] ${invalido ? "bg-red-50 text-red-600" : "bg-surface-soft text-text-tertiary"}`}>Escolha acima o que a pessoa ganha com este voucher.</p>
      ) : tipo === "gift" ? (
        <div className="mt-2 rounded-[20px] bg-[#FDEEDF] px-4 py-3.5 ring-1 ring-[#C2650A]/25">
          <p className="text-[14px] font-semibold text-[#9A4F06]">Este voucher é um brinde, sem número</p>
          <p className="mt-1 text-[12.5px] leading-snug text-[#9A4F06]/90">No cartão aparece a palavra <span className="font-bold">BRINDE</span>, e o que a pessoa ganha vai no título. Ex: Sobremesa grátis, Café de cortesia. Porcentagem e valor não valem para brinde.</p>
        </div>
      ) : (
        <div className="mt-2">
          <div className={`flex items-center rounded-2xl border bg-surface-white px-4 focus-within:border-on-background ${invalido ? "border-red-500" : "border-divider"}`}>
            {tipo === "fixed" && <span className="mr-1.5 text-[15px] font-medium text-text-tertiary">R$</span>}
            <input
              id={idCampo}
              value={valor}
              onChange={(e) => onValor(e.target.value)}
              placeholder={tipo === "percent" ? "10" : "15"}
              type="number"
              min="0"
              inputMode="decimal"
              aria-label={tipo === "percent" ? "Porcentagem de desconto" : "Valor do desconto em reais"}
              className="min-w-0 flex-1 bg-transparent py-3 text-[16px] outline-none"
            />
            {tipo === "percent" && <span className="ml-1.5 text-[15px] font-medium text-text-tertiary">%</span>}
          </div>
          <p className="mt-1.5 text-[12px] text-text-tertiary">No cartão aparece: <span className="font-semibold text-text-secondary">{exemplo}</span></p>
        </div>
      )}
    </div>
  );
}
