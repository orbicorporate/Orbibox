import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  // Se o Supabase mandar o link de confirmação pra raiz do site (Site URL),
  // encaminha pro callback que finaliza o login.
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background-main px-6 text-center">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full orbi-gradient opacity-20 blur-3xl" />
      <div className="relative flex flex-col items-center">
        <OrbiOrb size={140} className="mb-8" />
        <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Orbibox</p>
        <h1 className="mt-2 max-w-md font-[family-name:var(--font-manrope)] text-[32px] font-medium leading-tight tracking-[-0.01em]">
          A IA da sua marca com site inteligente.
        </h1>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link href="/apresentacao">
            <Button variant="orbi">Ver como funciona ✦</Button>
          </Link>
          <div className="flex gap-3">
            <Link href="/signup">
              <Button variant="ghost">Criar meu Orbibox</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
