import Link from "next/link";
import { redirect } from "next/navigation";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

const PROMESSAS = [
  { titulo: "Venda mais", texto: "Vouchers, promoções e gift cards num só link." },
  { titulo: "Mostre melhor sua marca", texto: "Uma vitrine bonita, com as suas cores." },
  { titulo: "Tenha sua própria IA", texto: "A Orbi responde seus clientes e guarda o contato de quem se interessou." },
];

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  // Se o Supabase mandar o link de confirmação pra raiz do site (Site URL),
  // encaminha pro callback que finaliza o login.
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);

  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-5">
        <span className="font-[family-name:var(--font-manrope)] text-[17px] font-medium tracking-[-0.01em]">Orbibox</span>
        <Link href="/login" className="text-[14px] text-text-secondary transition-colors hover:text-on-background">
          Entrar
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <OrbiOrb size={64} className="mb-8" />
        <h1 className="font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-[36px]">
          Sua marca com inteligência própria.
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
          Apresenta seu negócio, atende seus clientes e ajuda você a vender mais.
        </p>

        <Link
          href="/signup"
          className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#111318] px-6 text-[15px] font-medium text-white transition-transform active:scale-[0.98]"
        >
          Criar meu Orbibox grátis ✦
        </Link>
        <p className="mt-3 text-center text-[13px] text-text-tertiary">
          7 dias grátis, sem cartão. Mostre seu site ou Instagram e a Orbi monta a primeira versão.
        </p>
        <p className="mt-6 text-center text-[14px] text-text-tertiary">
          Já tem conta? <Link href="/login" className="text-on-background underline underline-offset-4">Entrar</Link>
        </p>

        <ul className="mt-12 flex flex-col gap-5 border-t border-divider pt-8">
          {PROMESSAS.map((b) => (
            <li key={b.titulo}>
              <p className="text-[15px] font-medium">{b.titulo}</p>
              <p className="mt-0.5 text-[14px] leading-snug text-text-secondary">{b.texto}</p>
            </li>
          ))}
        </ul>
        <Link href="/apresentacao" className="mt-8 text-center text-[14px] text-text-secondary underline underline-offset-4">
          Ver como funciona
        </Link>
      </section>
    </main>
  );
}
