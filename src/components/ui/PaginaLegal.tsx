import Link from "next/link";
import type { ReactNode } from "react";

export const CONTATO_LEGAL = "pedrobruder11@gmail.com";

export function PaginaLegal({ titulo, atualizado, children }: { titulo: string; atualizado: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link href="/" className="text-[13px] text-text-tertiary hover:underline">← Orbibox</Link>
      <h1 className="mt-4 font-[family-name:var(--font-manrope)] text-[30px] font-medium tracking-[-0.01em]">{titulo}</h1>
      <p className="mt-1 text-[13px] text-text-tertiary">Atualizado em {atualizado}</p>
      <div className="mt-8 flex flex-col gap-6 text-[15px] leading-relaxed text-text-secondary">{children}</div>
    </main>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-manrope)] text-[18px] font-medium text-on-background">{titulo}</h2>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}
