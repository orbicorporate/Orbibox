"use client";

export type TipoDesconto = "percent" | "fixed" | "gift";

const OPCOES: { id: TipoDesconto; nome: string }[] = [
  { id: "percent", nome: "Porcentagem" },
  { id: "fixed", nome: "Valor em R$" },
  { id: "gift", nome: "Brinde" },
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
  tipo: TipoDesconto;
  valor: string;
  onTipo: (t: TipoDesconto) => void;
  onValor: (v: string) => void;
  invalido?: boolean;
  idCampo?: string;
}) {
  const exemplo = tipo === "percent" ? `${valor || "10"}% OFF` : `R$ ${valor || "15"} OFF`;
  return (
    <div>
      <div role="radiogroup" aria-label="Tipo de benefício" className="flex gap-1.5 rounded-full bg-surface-soft p-1">
        {OPCOES.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={tipo === o.id}
            onClick={() => onTipo(o.id)}
            className={`min-h-[40px] flex-1 rounded-full px-2 text-[13px] font-medium transition-colors ${tipo === o.id ? "bg-on-background text-white" : "text-text-secondary"}`}
          >
            {o.nome}
          </button>
        ))}
      </div>

      {tipo === "gift" ? (
        <div className="mt-2 rounded-2xl bg-surface-soft px-4 py-3">
          <p className="text-[13.5px] font-medium">Sem número no cartão</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">O que a pessoa ganha vai no título. Ex: Sobremesa grátis, Café de cortesia.</p>
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
