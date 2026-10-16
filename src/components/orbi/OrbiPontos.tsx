"use client";

/**
 * Fileira de bolinhas, uma por item. A que a Orbi está fazendo agora vai sendo pintada de verde de baixo
 * para cima, e as prontas ficam verdes com um pequeno salto. Só transform e opacity animam.
 */
const MAX_PONTOS = 24;

export default function OrbiPontos({ n, total, className = "" }: { n: number; total: number; className?: string }) {
  const qtd = Math.max(1, Math.min(MAX_PONTOS, total));
  const prontos = total > MAX_PONTOS ? Math.floor((n / total) * MAX_PONTOS) : Math.min(n, qtd);
  return (
    <div
      role="img"
      aria-label={`${n} de ${total} prontos`}
      className={`flex max-w-[260px] flex-wrap items-center justify-center gap-2.5 ${className}`}
    >
      {Array.from({ length: qtd }, (_, i) => {
        const pronto = i < prontos;
        const atual = i === prontos && prontos < qtd;
        return (
          <span
            key={i}
            className={`orbi-ponto ${pronto ? "orbi-ponto-pronto" : ""} ${atual ? "orbi-ponto-atual" : ""}`}
            aria-hidden="true"
          >
            <span className="orbi-ponto-tinta" />
          </span>
        );
      })}
    </div>
  );
}
