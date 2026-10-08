import Link from "next/link";
import { redirect } from "next/navigation";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

const BENEFICIOS = [
  {
    titulo: "Venda mais",
    texto: "Vouchers com limite de unidades, promoções e gift cards. Um motivo pro cliente agir hoje.",
    icone: <path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 0 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1ZM9 15l6-6" />,
  },
  {
    titulo: "Mostre melhor sua marca",
    texto: "Uma vitrine interativa e bonita para seus produtos e serviços, com as suas cores.",
    icone: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  },
  {
    titulo: "Tenha sua própria IA",
    texto: "Ela conhece sua empresa, responde seus clientes na hora e guarda o contato de quem se interessou.",
    icone: <path d="M12 3v2M12 19v2M5.6 5.6 7 7M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  },
];

const PASSOS = [
  { n: "1", titulo: "Mostre seu site ou Instagram", texto: "Só isso. Sem formulário longo." },
  { n: "2", titulo: "A Orbi monta tudo", texto: "Cores, catálogo, jeito de falar e a primeira oferta, em menos de um minuto." },
  { n: "3", titulo: "Divulgue e acompanhe", texto: "A Orbi diz o que está funcionando e o que fazer a seguir." },
];

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  // Se o Supabase mandar o link de confirmação pra raiz do site (Site URL),
  // encaminha pro callback que finaliza o login.
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background-main">
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full orbi-gradient opacity-[0.18] blur-3xl" aria-hidden />

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="font-[family-name:var(--font-manrope)] text-[17px] font-semibold tracking-[-0.01em]">Orbibox</span>
        <Link href="/login" className="rounded-full px-4 py-2 text-[14px] font-medium text-text-secondary transition-colors hover:text-on-background">
          Entrar
        </Link>
      </header>

      {/* Herói: o que é, em uma frase, e o primeiro passo */}
      <section className="relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-16 pt-8 text-center sm:pt-14">
        <OrbiOrb size={120} className="mb-8" />
        <h1 className="font-[family-name:var(--font-manrope)] text-[38px] font-medium leading-[1.06] tracking-[-0.03em] sm:text-[56px]">
          Agora, sua marca pode ter inteligência própria.
        </h1>
        <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-text-secondary sm:text-[19px]">
          Uma presença digital inteligente que apresenta seu negócio, atende seus clientes e ajuda você a vender mais.
        </p>
        <Link
          href="/signup"
          className="orbi-gradient mt-9 inline-flex min-h-[54px] items-center justify-center rounded-full px-8 text-[16px] font-medium text-on-background shadow-[0_14px_34px_-14px_rgba(110,231,216,0.9)] transition-transform active:scale-[0.98]"
        >
          Criar meu Orbibox grátis ✦
        </Link>
        <p className="mt-3 text-[13.5px] text-text-tertiary">Mostre seu site ou Instagram. A Orbi monta a primeira versão pra você.</p>
        <Link href="/apresentacao" className="mt-6 text-[14px] font-medium text-text-secondary underline underline-offset-4">
          Ver como funciona
        </Link>
      </section>

      {/* Três promessas, organizadas pelo resultado que a pessoa quer */}
      <section className="relative mx-auto max-w-5xl px-5 pb-20">
        <div className="grid gap-3 sm:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="rounded-[26px] bg-surface-white p-6 ring-1 ring-black/[0.05]">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{b.icone}</svg>
              </span>
              <h2 className="mt-5 font-[family-name:var(--font-manrope)] text-[19px] font-medium tracking-[-0.01em]">{b.titulo}</h2>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-text-secondary">{b.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Não substitui os canais: deixa cada um mais inteligente */}
      <section className="relative mx-auto max-w-5xl px-5 pb-20">
        <div className="rounded-[30px] bg-[#111318] px-6 py-10 text-white sm:px-12">
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-white/50">Sem largar nada do que já funciona</p>
          <h2 className="mt-3 max-w-[560px] font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-[1.15] tracking-[-0.02em] sm:text-[32px]">
            Continue no Instagram e no WhatsApp. O Orbibox deixa cada um mais inteligente.
          </h2>
          <ol className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
            {["Instagram, Google ou WhatsApp", "Seu Orbibox", "Vitrine, IA ou oferta", "Conversa no seu WhatsApp"].map((etapa, i, arr) => (
              <li key={etapa} className="flex items-center gap-2 sm:flex-1">
                <span className={`flex-1 rounded-2xl px-4 py-3 text-[14px] ${i === 1 ? "orbi-gradient font-medium text-on-background" : "bg-white/[0.07] text-white/85"}`}>{etapa}</span>
                {i < arr.length - 1 && <span className="hidden px-2 text-white/35 sm:inline" aria-hidden>→</span>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Como começa */}
      <section className="relative mx-auto max-w-5xl px-5 pb-20">
        <h2 className="text-center font-[family-name:var(--font-manrope)] text-[26px] font-medium tracking-[-0.02em]">Pronto em menos de um minuto</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {PASSOS.map((p) => (
            <div key={p.n} className="flex gap-4 sm:flex-col">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-background text-[14px] font-medium text-white">{p.n}</span>
              <div>
                <p className="text-[16px] font-medium">{p.titulo}</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-text-secondary">{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-24 text-center">
        <Link
          href="/signup"
          className="orbi-gradient inline-flex min-h-[54px] items-center justify-center rounded-full px-8 text-[16px] font-medium text-on-background transition-transform active:scale-[0.98]"
        >
          Criar meu Orbibox grátis ✦
        </Link>
        <p className="mt-3 text-[13.5px] text-text-tertiary">7 dias grátis, sem cartão.</p>
      </section>
    </main>
  );
}
