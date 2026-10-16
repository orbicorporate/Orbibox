"use client";

export type ModoFoto = "recortar" | "original" | "sem";

const OPCOES: { id: ModoFoto; titulo: string; texto: string }[] = [
  { id: "recortar", titulo: "Recortar os itens e trocar o fundo", texto: "A Orbi separa só o prato, tira o fundo e põe a cor escolhida. Para fotos de produto soltas." },
  { id: "original", titulo: "Usar a foto original", texto: "Só enquadra o prato, sem mexer no fundo. Para fotos já prontas, no ambiente." },
  { id: "sem", titulo: "Sem fotos", texto: "Entram só nome, descrição e preço." },
];

/** Como tratar as fotos dos pratos do cardápio. */
export default function ModoFotos({ valor, onChange, disabled, semOpcaoSem = false }: { valor: ModoFoto; onChange: (m: ModoFoto) => void; disabled?: boolean; semOpcaoSem?: boolean }) {
  return (
    <div className="mt-3">
      <p className="text-[13px] font-medium">O que fazer com as fotos?</p>
      <div role="radiogroup" aria-label="O que fazer com as fotos" className="mt-1.5 flex flex-col gap-2">
        {OPCOES.filter((o) => !(semOpcaoSem && o.id === "sem")).map((o) => {
          const ativa = o.id === valor;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={ativa}
              disabled={disabled}
              onClick={() => onChange(o.id)}
              className={`flex min-h-[56px] items-start gap-3 rounded-[20px] px-4 py-3 text-left transition-colors active:scale-[0.99] disabled:opacity-60 ${ativa ? "bg-white ring-2 ring-on-background" : "bg-white/60 ring-1 ring-black/10"}`}
            >
              <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ativa ? "bg-on-background" : "bg-white ring-1 ring-black/25"}`}>
                {ativa && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              <span>
                <span className="block text-[14px] font-semibold leading-tight">{o.titulo}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{o.texto}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
