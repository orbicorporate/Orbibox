import { Escritorio } from "@/components/landing/Escritorio";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { getInspirePhotos } from "@/lib/inspirePhotos";
import { PhoneDemo } from "@/components/landing/PhoneDemo";
import { Mural } from "@/components/landing/Mural";
import { OrbiChatDemo } from "@/components/landing/OrbiChatDemo";
import { Reveal } from "@/components/landing/Reveal";
import { TEMAS_LANDING, type InspireLanding } from "@/components/landing/temas";

const RECURSOS = [
  { titulo: "Vitrine que vende", texto: "Seus produtos e serviços em cards bonitos, com foto, preço e página própria.", d: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" },
  { titulo: "Orbi, sua IA", texto: "Conhece o seu negócio, responde seus clientes na hora e guarda o contato de quem se interessou.", d: "M12 3v2M12 19v2M5.6 5.6 7 7M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" },
  { titulo: "Vouchers e gift cards", texto: "Promoções com limite de unidades e vales-presente. Um motivo para o cliente agir hoje.", d: "M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 0 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1ZM9 15l6-6" },
  { titulo: "Pulse", texto: "A Orbi mostra o que está funcionando e o que fazer a seguir, em linguagem simples.", d: "M3 12h4l3-8 4 16 3-8h4" },
  { titulo: "Conversas e contatos", texto: "Todo mundo que perguntou ou pegou um voucher vira contato seu, pronto para você chamar.", d: "M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.2A8.4 8.4 0 1 1 21 11.5Z" },
  { titulo: "Do seu jeito", texto: "Cores nobres, paletas prontas ou a paleta da sua marca. Tudo muda na hora, com prévia.", d: "M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.6-.2-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2H18a3 3 0 0 0 3-3c0-4.4-4-8.3-9-8.3ZM7.5 11.5h.01M10 7.5h.01M15 7.5h.01" },
];

const PASSOS = [
  { n: "1", titulo: "Mostre seu site ou Instagram", texto: "Só isso. Sem formulário longo.", visual: "campo" },
  { n: "2", titulo: "A Orbi monta tudo", texto: "Cores, catálogo, jeito de falar e a primeira oferta, em menos de um minuto.", visual: "cores" },
  { n: "3", titulo: "Divulgue e acompanhe", texto: "Cole o seu link na bio e veja o que dá resultado.", visual: "link" },
];

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  // Se o Supabase mandar o link de confirmação pra raiz do site (Site URL),
  // encaminha pro callback que finaliza o login.
  const { code } = await searchParams;
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
      <div aria-hidden className="pointer-events-none absolute -top-56 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full orbi-gradient opacity-[0.16] blur-3xl" />

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
            Sua vitrine com IA, pronta em 1 minuto
          </span>
          <h1 className="mt-6 font-[family-name:var(--font-manrope)] text-[40px] font-medium leading-[1.04] tracking-[-0.035em] sm:text-[60px]">
            Seu link na bio,
            <br />
            agora com <span className="orbi-gradient-text">inteligência</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-[500px] text-[17px] leading-relaxed text-text-secondary sm:text-[19px] lg:mx-0">
            Mostre seu site ou Instagram. A Orbi monta sua vitrine, atende seus clientes e ajuda você a vender mais.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/signup" className="orbi-gradient inline-flex min-h-[56px] items-center justify-center rounded-full px-8 text-[16px] font-medium text-on-background shadow-[0_16px_38px_-14px_rgba(110,231,216,0.95)] transition-transform active:scale-[0.98]">
              Criar meu Orbibox grátis ✦
            </Link>
            <Link href="/apresentacao" className="inline-flex min-h-[56px] items-center justify-center rounded-full px-6 text-[15px] text-text-secondary underline underline-offset-4">
              Ver como funciona
            </Link>
          </div>
          <p className="mt-4 text-[13.5px] text-text-tertiary">7 dias grátis, sem cartão.</p>
        </div>
        <div className="flex justify-center">
          <PhoneDemo inspire={inspire} />
        </div>
      </section>

      {/* Mural de vitrines */}
      <section className="relative pb-24">
        <Reveal>
          <div className="mx-auto max-w-3xl px-5 text-center">
            <h2 className="font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[42px]">Cada negócio, uma vitrine que parece sua.</h2>
            <p className="mx-auto mt-3 max-w-[480px] text-[16px] text-text-secondary">Restaurante, moda, joias, doces, arquitetura, academia. Escolha uma inspiração e a Orbi adapta para você.</p>
          </div>
        </Reveal>
        <Reveal delay={120} className="mt-10"><Mural inspire={inspire} /></Reveal>
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
                      <span className="truncate text-text-secondary">orbibox/<span className="text-on-background">suamarca</span></span>
                      <span className="orbi-gradient ml-2 rounded-full px-3 py-1 text-[12px]">Copiar</span>
                    </div>
                  )}
                </div>
                <span className="mt-6 flex h-8 w-8 items-center justify-center rounded-full bg-on-background text-[13px] font-medium text-white">{p.n}</span>
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
            <Link href="/signup" className="orbi-gradient mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full px-7 text-[15px] font-medium text-on-background active:scale-[0.98]">Quero uma Orbi para o meu negócio ✦</Link>
          </Reveal>
          <Reveal delay={150} className="flex justify-center lg:justify-end"><OrbiChatDemo /></Reveal>
        </div>
      </section>

      {/* Recursos */}
      <section className="relative mx-auto max-w-6xl px-5 pb-24">
        <Reveal>
          <h2 className="mx-auto max-w-2xl text-center font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[42px]">Tudo o que o seu link precisa, num lugar só.</h2>
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map((r, n) => (
            <Reveal key={r.titulo} delay={(n % 3) * 100}>
              <div className="h-full rounded-[28px] bg-surface-white p-6 ring-1 ring-black/[0.05] transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(17,19,24,0.35)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={r.d} /></svg>
                </span>
                <h3 className="mt-5 text-[18px] font-medium">{r.titulo}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">{r.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Chamada final */}
      <section className="relative mx-auto max-w-6xl px-5 pb-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-[40px] px-6 py-16 text-center">
            <div aria-hidden className="orbi-gradient absolute inset-0 opacity-30" />
            <div className="relative flex flex-col items-center">
              <OrbiOrb size={72} className="mb-6" />
              <h2 className="max-w-xl font-[family-name:var(--font-manrope)] text-[32px] font-medium leading-[1.08] tracking-[-0.03em] sm:text-[48px]">Sua marca pode ter inteligência própria.</h2>
              <Link href="/signup" className="mt-8 inline-flex min-h-[56px] items-center justify-center rounded-full bg-on-background px-8 text-[16px] font-medium text-white transition-transform active:scale-[0.98]">Criar meu Orbibox grátis ✦</Link>
              <p className="mt-3 text-[13.5px] text-text-secondary">7 dias grátis, sem cartão. Cancele quando quiser.</p>
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
          <Link href="/signup" className="flex min-h-[44px] items-center px-3 hover:text-on-background">Criar conta</Link>
        </nav>
      </footer>
    </main>
  );
}
