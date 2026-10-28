import { Escritorio } from "@/components/landing/Escritorio";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { getInspirePhotos } from "@/lib/inspirePhotos";
import { PhoneDemo } from "@/components/landing/PhoneDemo";
import { Mural } from "@/components/landing/Mural";
import { OrbiChatDemo } from "@/components/landing/OrbiChatDemo";
import { Reveal } from "@/components/landing/Reveal";
import { Palco3D, FaixaRecursos } from "@/components/landing/Palco3D";
import { TEMAS_LANDING, type InspireLanding } from "@/components/landing/temas";

const PASSOS = [
  { n: "1", titulo: "Mostre seu site ou Instagram", texto: "Só isso. Sem formulário longo.", visual: "campo" },
  { n: "2", titulo: "A Orbi monta tudo", texto: "Cores, catálogo, jeito de falar e a primeira oferta, em menos de um minuto.", visual: "cores" },
  { n: "3", titulo: "Divulgue e acompanhe", texto: "Cole o seu link na bio, instale o app no celular e veja o que dá resultado.", visual: "link" },
];

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ code?: string; de?: string }> }) {
  // Se o Supabase mandar o link de confirmação pra raiz do site (Site URL),
  // encaminha pro callback que finaliza o login.
  const { code, de } = await searchParams;
  // Quem chegou pelo convite de uma marca mantém a origem até o cadastro.
  const cadastro = de ? `/signup?de=${encodeURIComponent(de.slice(0, 60))}` : "/signup";
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);

  let inspire: InspireLanding = {};
  try {
    const tudo = await getInspirePhotos();
    for (const t of TEMAS_LANDING) if (tudo[t.id]) inspire[t.id] = { photos: tudo[t.id].photos, titleStyle: tudo[t.id].titleStyle };
  } catch {
    inspire = {};
  }

  return (
    <main className="relative overflow-x-clip bg-background-main">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1000px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]">
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-[#B9A6FF] opacity-[0.45] blur-3xl" />
        <div className="absolute -right-32 top-10 h-[520px] w-[520px] rounded-full bg-[#8FC4FF] opacity-[0.5] blur-3xl" />
        <div className="absolute left-1/3 top-48 h-[480px] w-[480px] rounded-full bg-[#9DEBCB] opacity-[0.5] blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-[family-name:var(--font-manrope)] text-[18px] font-medium tracking-[-0.01em]">Orbibox</span>
        <nav className="flex items-center gap-1">
          <Link href="/apresentacao" className="hidden min-h-[44px] items-center rounded-full px-4 text-[14px] text-text-secondary hover:text-on-background sm:flex">Como funciona</Link>
          <Link href="/login" className="flex min-h-[44px] items-center rounded-full px-4 text-[14px] text-text-secondary hover:text-on-background">Entrar</Link>
        </nav>
      </header>

      {/* Herói: promessa + vitrine de verdade que troca de negócio */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-12">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-white px-3.5 py-1.5 text-[13px] text-text-secondary ring-1 ring-black/[0.06]">
            <span className="orbi-gradient flex h-4 w-4 items-center justify-center rounded-full text-[8px]" aria-hidden>✦</span>
            IA e app próprios, prontos em 1 minuto
          </span>
          <h1 className="mt-6 font-[family-name:var(--font-manrope)] text-[40px] font-medium leading-[1.04] tracking-[-0.035em] sm:text-[56px]">
            Sua marca com <span className="bg-gradient-to-r from-[#5B3FD6] to-[#0A8F94] bg-clip-text text-transparent">inteligência própria</span>, aplicativo e muito mais.
          </h1>
          <p className="mx-auto mt-5 max-w-[500px] text-[17px] leading-relaxed text-text-secondary sm:text-[19px] lg:mx-0">
            Tudo em um único link. Mostre seu site ou Instagram e a Orbi monta sua vitrine, atende seus clientes e ajuda você a vender mais.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link href={cadastro} className="inline-flex min-h-[56px] items-center justify-center rounded-full px-8 text-[16px] font-medium bg-on-background text-white shadow-[0_16px_38px_-16px_rgba(17,19,24,0.6)] transition-transform active:scale-[0.98]">
              Criar meu Orbibox grátis ✦
            </Link>
            <Link href="/apresentacao" className="inline-flex min-h-[56px] items-center justify-center rounded-full px-6 text-[15px] text-text-secondary underline underline-offset-4">
              Ver como funciona
            </Link>
          </div>
          <p className="mt-4 text-[13.5px] text-text-tertiary">7 dias grátis, sem cartão.</p>
        </div>
        <div className="flex justify-center">
          <PhoneDemo />
        </div>
      </section>

      <div className="relative pb-16"><FaixaRecursos /></div>

      {/* Mural de vitrines */}
      <section className="relative pb-24">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-10 bottom-10 -z-0 bg-gradient-to-b from-transparent via-[#E6E0FF]/60 to-transparent" />
        <Reveal>
          <div className="relative mx-auto max-w-3xl px-5 text-center">
            <h2 className="font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[42px]">Cada negócio, uma vitrine que parece sua.</h2>
            <p className="mx-auto mt-3 max-w-[480px] text-[16px] text-text-secondary">Restaurante, moda, joias, doces, arquitetura, academia. Escolha uma inspiração e a Orbi adapta para você.</p>
          </div>
        </Reveal>
        <Reveal delay={120} className="mt-10"><Mural inspire={inspire} /></Reveal>
      </section>

      {/* Palco: o que o Orbibox faz, em movimento */}
      <section className="relative mx-auto max-w-6xl px-5 pb-24">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[42px]">Tudo isso, em um único link.</h2>
            <p className="mx-auto mt-3 max-w-[480px] text-[16px] text-text-secondary">Passe o dedo nos cartões e veja o Orbibox em ação.</p>
          </div>
        </Reveal>
        <Reveal delay={100} className="mt-10"><Palco3D /></Reveal>
      </section>

      {/* Como começa */}
      <section className="relative mx-auto max-w-6xl px-5 pb-24">
        <Reveal>
          <h2 className="text-center font-[family-name:var(--font-manrope)] text-[30px] font-medium tracking-[-0.025em] sm:text-[42px]">Pronto em menos de um minuto</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PASSOS.map((p, n) => (
            <Reveal key={p.n} delay={n * 120}>
              <div className="h-full rounded-[30px] bg-surface-white p-6 ring-1 ring-black/[0.05]">
                <div className="flex h-[96px] items-center justify-center rounded-[22px] bg-surface-soft px-4">
                  {p.visual === "campo" && (
                    <div className="flex w-full items-center rounded-full bg-surface-white px-4 py-3 text-[14px] text-text-secondary ring-1 ring-black/[0.06]">
                      <span className="truncate">instagram.com/suamarca</span><span className="lp-caret ml-0.5 inline-block h-4 w-px bg-on-background" aria-hidden />
                    </div>
                  )}
                  {p.visual === "cores" && (
                    <div className="flex items-center gap-2.5" aria-hidden>
                      {["#B7F34A", "#9A3B2E", "#B8860B", "#2E3A4A", "#B76E79"].map((c) => <span key={c} className="h-8 w-8 rounded-full ring-2 ring-white" style={{ background: c }} />)}
                    </div>
                  )}
                  {p.visual === "link" && (
                    <div className="flex w-full items-center justify-between rounded-full bg-surface-white px-4 py-3 text-[14px] ring-1 ring-black/[0.06]">
                      <span className="truncate text-text-secondary">orbibox.app/<span className="text-on-background">suamarca</span></span>
                      <span className="orbi-gradient ml-2 rounded-full px-3 py-1 text-[12px]">Copiar</span>
                    </div>
                  )}
                </div>
                <span className="orbi-gradient mt-6 flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium text-on-background">{p.n}</span>
                <h3 className="mt-3 text-[18px] font-medium">{p.titulo}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">{p.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* A Orbi conversando */}
      <section className="relative mx-auto max-w-6xl px-5 pb-24">
        <div className="grid items-center gap-12 rounded-[40px] bg-[#111318] px-6 py-14 text-white sm:px-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-white/50">Atendimento que não dorme</p>
            <h2 className="mt-3 font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[40px]">Enquanto você trabalha, a Orbi atende.</h2>
            <p className="mt-4 max-w-[440px] text-[16px] leading-relaxed text-white/70">Ela conhece seus produtos, preços e horários. Responde na hora, e quando alguém se interessa, o contato chega para você.</p>
            <Link href={cadastro} className="orbi-gradient mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full px-7 text-[15px] font-medium text-on-background active:scale-[0.98]">Quero uma Orbi para o meu negócio ✦</Link>
          </Reveal>
          <Reveal delay={150} className="flex justify-center lg:justify-end"><OrbiChatDemo /></Reveal>
        </div>
      </section>

      {/* Chamada final */}
      <section className="relative mx-auto max-w-6xl px-5 pb-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-[40px] px-6 py-16 text-center">
            <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#C9BBFF] via-[#A9D3FF] to-[#A6EFD2] opacity-80" />
            <div className="relative flex flex-col items-center">
              <OrbiOrb size={72} className="mb-6" />
              <h2 className="max-w-xl font-[family-name:var(--font-manrope)] text-[32px] font-medium leading-[1.08] tracking-[-0.03em] sm:text-[48px]">Sua marca com inteligência própria, aplicativo e muito mais.</h2>
              <Link href={cadastro} className="mt-8 inline-flex min-h-[56px] items-center justify-center rounded-full bg-on-background px-8 text-[16px] font-medium text-white transition-transform active:scale-[0.98]">Criar meu Orbibox grátis ✦</Link>
              <p className="mt-3 text-[13.5px] text-on-background/70">Tudo em um único link. 7 dias grátis, sem cartão.</p>
            </div>
          </div>
        </Reveal>
      </section>

      <Escritorio />

      <footer className="relative mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 pb-10 text-[13.5px] text-text-tertiary sm:flex-row">
        <span>Orbibox, um produto Nume.</span>
        <nav className="flex items-center gap-1">
          <Link href="/apresentacao" className="flex min-h-[44px] items-center px-3 hover:text-on-background">Como funciona</Link>
          <Link href="/login" className="flex min-h-[44px] items-center px-3 hover:text-on-background">Entrar</Link>
          <Link href={cadastro} className="flex min-h-[44px] items-center px-3 hover:text-on-background">Criar conta</Link>
        </nav>
      </footer>
    </main>
  );
}
