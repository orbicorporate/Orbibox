import Link from "next/link";

/**
 * Convite no fim das páginas públicas: "Quer criar seu próprio Orbibox?". Fica no fluxo da
 * página (não flutua por cima), pequeno, com uma vibradinha alegre de tempos em tempos.
 * `de` guarda de qual marca veio o toque, para saber o que traz cadastro.
 */
export function CrieSeuOrbibox({ de }: { de: string }) {
  return (
    <div className="flex justify-center px-4 pb-8 pt-6">
      <Link
        href={`/signup?de=${encodeURIComponent(de)}`}
        className="crie-orbibox orbi-gradient inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[13.5px] font-semibold text-on-background shadow-[0_10px_26px_-12px_rgba(110,231,216,0.95)] active:scale-[0.97]"
      >
        <span aria-hidden className="crie-orbibox-brilho">✦</span>
        <span>Quer criar seu próprio Orbibox? Toque aqui</span>
      </Link>
    </div>
  );
}
