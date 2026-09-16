import type { Metadata } from "next";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { AfiliadoSimulador } from "./AfiliadoSimulador";

export const metadata: Metadata = {
  title: "Programa de Afiliados, Orbibox",
  description: "Compartilhe o Orbibox, as pessoas assinam, e você ganha todo mês que elas pagam. 30% de comissão recorrente e acumulativa.",
};

const PASSOS = [
  { n: 1, titulo: "Compartilhe seu link", texto: "A gente te dá um link exclusivo. Manda pra quem quiser: cliente, amigo, seu público." },
  { n: 2, titulo: "As pessoas assinam", texto: "Quem entra pelo seu link e vira cliente fica registrado como sua indicação." },
  { n: 3, titulo: "Você ganha todo mês", texto: "30% de cada mensalidade que essa pessoa pagar. Recorrente: enquanto ela paga, você recebe." },
  { n: 4, titulo: "E vai acumulando", texto: "Cada nova indicação soma na anterior. Quanto mais gente ativa, maior o seu ganho fixo mensal." },
];

export default function AfiliadosPublico() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[640px] px-5 pb-16 pt-8">
      <div className="orbi-rise flex items-center gap-2.5" style={{ animationDelay: "0ms" }}>
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-on-background text-[15px] font-bold text-white">O</span>
        <span className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold tracking-[-0.01em]">Orbibox</span>
        <span className="ml-1 rounded-full bg-gradient-to-r from-[#B8860B] to-[#E0B34C] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white">Afiliados</span>
      </div>

      <div className="orbi-rise orbi-card-light relative mt-6 overflow-hidden rounded-[32px] px-6 py-9 text-center" style={{ animationDelay: "60ms" }}>
        <span className="relative mx-auto block h-20 w-20 overflow-hidden rounded-full">
          <OrbiParticleSphere size={80} vivid className="rounded-full" />
        </span>
        <h1 className="relative mt-5 font-[family-name:var(--font-manrope)] text-[31px] font-semibold leading-[1.08] tracking-[-0.02em] text-on-background">
          Indique. Elas assinam.<br />Você ganha todo mês.
        </h1>
        <p className="relative mx-auto mt-3 max-w-[420px] text-[15px] leading-relaxed text-text-secondary">
          Compartilhe seu link, as pessoas entram e assinam, e você ganha 30% de cada mensalidade que elas pagarem. Recorrente e acumulativo.
        </p>
      </div>

      <div className="orbi-rise mt-4" style={{ animationDelay: "120ms" }}>
        <AfiliadoSimulador />
      </div>

      {/* Benefício de quem você indica: argumento de venda pro afiliado */}
      <div className="orbi-rise mt-4 flex items-center gap-3.5 rounded-[22px] bg-[#DEF3E3] p-5" style={{ animationDelay: "150ms" }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[20px]">🎁</span>
        <div className="min-w-0">
          <p className="text-[14.5px] font-semibold text-[#15803D]">Quem você indica também ganha</p>
          <p className="mt-0.5 text-[13px] leading-snug text-[#1F7A3D]/90">
            Assinando o plano anual, seu indicado leva 1 mês grátis extra. Um bom motivo pra ele fechar com você.
          </p>
        </div>
      </div>

      <div className="orbi-rise mt-8" style={{ animationDelay: "180ms" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Como funciona</p>
        <div className="mt-3 flex flex-col gap-2.5">
          {PASSOS.map((p, i) => (
            <div key={p.n} className="orbi-rise flex items-start gap-3.5 rounded-[22px] border border-divider bg-surface-white p-5" style={{ animationDelay: `${220 + i * 60}ms` }}>
              <span className="orbi-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-on-background">{p.n}</span>
              <div className="min-w-0">
                <p className="text-[15.5px] font-semibold leading-tight">{p.titulo}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-text-secondary">{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="orbi-rise mt-4 rounded-[24px] bg-surface-soft p-6" style={{ animationDelay: "480ms" }}>
        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold tracking-[-0.01em]">Você acompanha e recebe fácil</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
          Junto com seu link, você ganha um painel só seu. Sem criar conta, sem instalar nada, abre por um link no celular. Nele você vê:
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {[
            "Quanto você tem disponível pra receber, agora.",
            "Quantas pessoas acessaram, cadastraram e assinaram pelo seu link.",
            "Cada venda, com plano e data.",
            "Quanto entrou de comissão em cada mês.",
          ].map((t) => (
            <div key={t} className="flex items-start gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F7A3D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M20 6L9 17l-5-5" /></svg>
              <p className="text-[13.5px] leading-snug text-text-secondary">{t}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-text-tertiary">
          A comissão fica 7 dias em garantia e depois cai na sua chave Pix. Simples assim.
        </p>
      </div>

      <div className="orbi-rise mt-6 rounded-[24px] border border-divider bg-surface-white p-6 text-center" style={{ animationDelay: "540ms" }}>
        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold tracking-[-0.01em]">Bora ganhar junto?</p>
        <p className="mx-auto mt-1.5 max-w-[380px] text-[14px] leading-relaxed text-text-secondary">
          Fale com quem te enviou esta página. Em minutos você recebe seu link e seu painel, e já pode começar.
        </p>
      </div>

      <p className="mt-8 text-center text-[12px] text-text-tertiary">
        Orbibox, a web que se adapta a quem entra.
      </p>
    </main>
  );
}
