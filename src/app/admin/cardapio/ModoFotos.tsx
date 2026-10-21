"use client";

export type ModoFoto = "recortar" | "original" | "sem";

const OPCOES: { id: ModoFoto; rotulo: string; texto: string }[] = [
  { id: "recortar", rotulo: "Recortar", texto: "A Orbi separa só o prato, tira o fundo e põe a cor escolhida. Ideal para fotos de produto soltas." },
  { id: "original", rotulo: "Original", texto: "Só enquadra o prato, sem mexer no fundo. Ideal para fotos já prontas, no ambiente." },
  { id: "sem", rotulo: "Sem fotos", texto: "Entram só nome, descrição e preço." },
];

/** Como tratar as fotos dos pratos do cardápio: controle segmentado com uma linha de explicação. */
export default function ModoFotos({ valor, onChange, disabled, semOpcaoSem = false }: { valor: ModoFoto; onChange: (m: ModoFoto) => void; disabled?: boolean; semOpcaoSem?: boolean }) {
  const opcoes = OPCOES.filter((o) => !(semOpcaoSem && o.id === "sem"));
  const indice = Math.max(0, opcoes.findIndex((o) => o.id === valor));
  return (
    <div className="mt-4">
      <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-text-tertiary">Fotos dos pratos</p>
      <div role="radiogroup" aria-label="O que fazer com as fotos" className="relative mt-2 flex rounded-full bg-black/[0.05] p-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{ width: `calc((100% - 8px) / ${opcoes.length})`, transform: `translateX(${indice * 100}%)` }}
        />
        {opcoes.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === valor}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={`relative z-10 min-h-[40px] flex-1 rounded-full px-2 text-[13.5px] transition-colors disabled:opacity-60 ${o.id === valor ? "font-semibold text-on-background" : "font-medium text-text-secondary"}`}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
      <p key={valor} className="modo-desc mt-2.5 min-h-[44px] text-[12.5px] leading-snug text-text-secondary">{opcoes[indice].texto}</p>
    </div>
  );
}
