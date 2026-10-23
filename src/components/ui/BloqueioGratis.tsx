import Link from "next/link";

/** Tela de recurso que o plano grátis não inclui: mostra o que é e leva aos planos. */
export function BloqueioGratis({ recurso, descricao, itens }: { recurso: string; descricao: string; itens?: string[] }) {
  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-tight tracking-[-0.02em]">{recurso}</h1>
      <div className="mt-5 rounded-[28px] bg-surface-white p-6 ring-1 ring-divider">
        <p className="text-[13.5px] text-text-secondary">Não está no plano grátis</p>
        <p className="mt-2 text-[17px] leading-snug">{descricao}</p>
        {itens && itens.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {itens.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[15px] leading-snug text-text-secondary">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-on-background" />
                {t}
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/planos" className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-full bg-on-background text-[16px] text-white active:scale-[0.99]">
          Ver os planos
        </Link>
        <p className="mt-3 text-center text-[13px] text-text-tertiary">Seus dados ficam guardados e voltam quando você assinar.</p>
      </div>
    </div>
  );
}
