import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background-main px-6 text-center">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full orbi-gradient opacity-20 blur-3xl" />
      <div className="relative flex flex-col items-center">
        <OrbiOrb size={140} className="mb-8" />
        <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Orbibox</p>
        <h1 className="mt-2 max-w-md font-[family-name:var(--font-manrope)] text-[44px] font-medium leading-tight tracking-[-0.01em]">
          Um link, infinitas possibilidades.
        </h1>
        <p className="mt-4 max-w-sm text-[16px] text-text-secondary">
          Seu negócio com inteligência própria.
        </p>
        <div className="mt-10 flex gap-3">
          <Link href="/signup">
            <Button variant="orbi">Criar meu Orbibox ✦</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
