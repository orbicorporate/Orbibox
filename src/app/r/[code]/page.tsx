import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { DIAS_TESTE_INDICADO } from "@/lib/indicacao";

// Página do convite: quem recebe o link vê quem convidou e o presente (mais
// dias de teste), e aceita com um toque.
async function dadosConvite(code: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("referral_public_info", { p_code: code });
  return (data ?? [])[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const d = await dadosConvite(code);
  const titulo = d ? `${d.nome} te convidou pro Orbibox` : "Você foi convidado pro Orbibox";
  return { title: titulo, description: `Crie a página inteligente do seu negócio e teste ${DIAS_TESTE_INDICADO} dias grátis.`, openGraph: { title: titulo, description: `Teste ${DIAS_TESTE_INDICADO} dias grátis pelo convite.` } };
}

export default async function ConvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const limpo = (code ?? "").trim().toUpperCase().slice(0, 12);
  const d = await dadosConvite(limpo);

  const beneficios = [
    ["Sua página com IA", "Uma vendedora que responde seus clientes 24h, do seu jeito."],
    ["Catálogo e vouchers", "Mostre produtos, crie descontos e traga cliente na hora."],
    ["Pronta em minutos", "A Orbi lê seu site ou Instagram e monta tudo pra você."],
  ];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background-main px-6 py-12">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-[90px] orbi-gradient" aria-hidden />
      <div className="relative w-full max-w-sm text-center">
        <div className="mx-auto flex items-center justify-center">
          {d?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.logo_url} alt={d.nome} className="h-20 w-20 rounded-full bg-white object-cover shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] ring-4 ring-white" />
          ) : (
            <OrbiParticleSphere size={84} className="rounded-full" />
          )}
        </div>
        <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Você foi convidado</p>
        <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-[1.12] tracking-[-0.02em]">
          {d ? <>{d.nome} te chamou pro Orbibox</> : <>Um amigo te chamou pro Orbibox</>}
        </h1>

        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-on-background px-4 py-2 text-[14px] font-semibold text-white">
          🎁 {DIAS_TESTE_INDICADO} dias grátis pra testar
        </div>
        <p className="mt-2 text-[12.5px] text-text-tertiary">Quem entra sem convite testa só 3.</p>

        <div className="mt-7 flex flex-col gap-2.5 text-left">
          {beneficios.map(([t, s]) => (
            <div key={t} className="rounded-2xl bg-surface-white/90 px-4 py-3 ring-1 ring-black/[0.06] backdrop-blur">
              <p className="text-[14.5px] font-semibold">{t}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">{s}</p>
            </div>
          ))}
        </div>

        <Link
          href={`/api/referral/aceitar?c=${encodeURIComponent(limpo)}`}
          className="orbi-gradient mt-7 flex w-full items-center justify-center rounded-full py-4 text-[16px] font-semibold text-on-background shadow-[0_14px_30px_-12px_rgba(110,231,216,0.9)]"
        >
          Aceitar convite e criar minha página
        </Link>
        <p className="mt-4 text-[13px] text-text-tertiary">
          Já tem conta? <Link href="/login" className="text-on-background underline">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
