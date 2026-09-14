"use client";

/**
 * Grupo de opções que se marca clicando, sem digitar nada. Cada opção tem
 * a sua cor, então o bloco fica legível de relance e preencher vira quase
 * um jogo em vez de um formulário.
 */
export function ChipGroup({
  titulo,
  ajuda,
  opcoes,
  selecionadas,
  onToggle,
}: {
  titulo: string;
  ajuda?: string;
  opcoes: { id: string; label: string; cor: string; fundo: string }[];
  selecionadas: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] uppercase tracking-wide text-text-tertiary">{titulo}</p>
        {selecionadas.length > 0 && (
          <span className="rounded-full bg-[#DEF3E3] px-2 py-0.5 text-[10.5px] font-semibold text-[#1F7A3D]">
            {selecionadas.length}
          </span>
        )}
      </div>
      {ajuda && <p className="mt-1 text-[12.5px] leading-snug text-text-tertiary">{ajuda}</p>}

      <div className="mt-2.5 flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativa = selecionadas.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              aria-pressed={ativa}
              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-all"
              style={
                ativa
                  ? { backgroundColor: o.cor, color: "#fff", boxShadow: `0 2px 10px ${o.cor}55` }
                  : { backgroundColor: o.fundo, color: o.cor }
              }
            >
              {ativa && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Classe econômica do cliente típico, do topo pro mais popular. */
export const CLASSES = [
  { id: "A+", label: "A+", cor: "#6D28D9", fundo: "#EDE6FC" },
  { id: "A", label: "A", cor: "#1D4ED8", fundo: "#E2EAFE" },
  { id: "B+", label: "B+", cor: "#0E7490", fundo: "#DDF2F7" },
  { id: "B", label: "B", cor: "#1F7A3D", fundo: "#DEF3E3" },
  { id: "C", label: "C", cor: "#C2650A", fundo: "#FDEEDF" },
  { id: "D", label: "D", cor: "#B0463C", fundo: "#FBE6E3" },
];

export const FAIXAS_ETARIAS = [
  { id: "crianca", label: "Crianças", cor: "#B0309E", fundo: "#FBE4F6" },
  { id: "adolescente", label: "Adolescentes", cor: "#6D28D9", fundo: "#EDE6FC" },
  { id: "jovem", label: "18 a 29", cor: "#1D4ED8", fundo: "#E2EAFE" },
  { id: "adulto", label: "30 a 49", cor: "#1F7A3D", fundo: "#DEF3E3" },
  { id: "maduro", label: "50 a 64", cor: "#C2650A", fundo: "#FDEEDF" },
  { id: "idoso", label: "65 ou mais", cor: "#B0463C", fundo: "#FBE6E3" },
];

export const PAGAMENTOS = [
  { id: "pix", label: "Pix", cor: "#0E7490", fundo: "#DDF2F7" },
  { id: "credito", label: "Cartão de crédito", cor: "#1D4ED8", fundo: "#E2EAFE" },
  { id: "debito", label: "Cartão de débito", cor: "#6D28D9", fundo: "#EDE6FC" },
  { id: "dinheiro", label: "Dinheiro", cor: "#1F7A3D", fundo: "#DEF3E3" },
  { id: "boleto", label: "Boleto", cor: "#555960", fundo: "#ECEDE9" },
  { id: "parcelado", label: "Parcelamos", cor: "#C2650A", fundo: "#FDEEDF" },
];

export const ATENDIMENTOS = [
  { id: "loja", label: "Loja física", cor: "#1F7A3D", fundo: "#DEF3E3" },
  { id: "delivery", label: "Delivery", cor: "#C2650A", fundo: "#FDEEDF" },
  { id: "online", label: "Online", cor: "#1D4ED8", fundo: "#E2EAFE" },
  { id: "agendamento", label: "Com agendamento", cor: "#6D28D9", fundo: "#EDE6FC" },
  { id: "domicilio", label: "Vou até o cliente", cor: "#B0309E", fundo: "#FBE4F6" },
];
