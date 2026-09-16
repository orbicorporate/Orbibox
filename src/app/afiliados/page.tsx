import type { Metadata } from "next";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

export const metadata: Metadata = {
  title: "Programa de Afiliados, Orbibox",
  description: "Indique o Orbibox e ganhe 30% de comissão recorrente por 12 meses. Sem precisar de conta, você acompanha tudo por um painel próprio.",
};

const GANHOS = [
  { valor: "30%", label: "de comissão", nota: "sobre cada cobrança paga por quem você indicar" },
  { valor: "12", label: "meses", nota: "recorrente, desde a primeira cobrança de cada cliente" },
  { valor: "R$0", label: "pra começar", nota: "sem custo, sem meta e sem precisar de conta no Orbibox" },
];

const PASSOS = [
  { n: 1, titulo: "Você recebe seu link", texto: "A gente cadastra você e gera um link exclusivo, com seu código. É ele que você compartilha." },
  { n: 2, titulo: "Alguém assina pelo seu link", texto: "Quem entra pelo seu link e vira cliente pagante fica registrado como sua indicação, pra sempre." },
  { n: 3, titulo: "A comissão entra", texto: "Você ganha 30% de cada cobrança dessa pessoa, todo mês, pelos primeiros 12 meses dela." },
  { n: 4, titulo: "Você recebe no Pix", texto: "Depois de 7 dias de garantia, a comissão fica disponível. A gente paga na chave Pix que você informar." },
];

/**
 * Página pública pra apresentar o programa de afiliados a um parceiro em
 * potencial, antes de cadastrar. Refinada, com o logo, a esfera da Orbi e
 * os números em destaque. É só leitura, não pede login.
 */
export default function AfiliadosPublico() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[640px] px-5 pb-16 pt-8">
      {/* Cabeçalho com logo */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-on-background text-[15px] font-bold text-white">O</span>
        <span className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold tracking-[-0.01em]">Orbibox</span>
        <span className="ml-1 rounded-full bg-gradient-to-r from-[#B8860B] to-[#E0B34C] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white">Afiliados</span>
      </div>

      {/* Herói */}
      <div className="orbi-card-light relative mt-6 overflow-hidden rounded-[32px] px-6 py-9 text-center">
        <span className="relative mx-auto block h-20 w-20 overflow-hidden rounded-full">
          <OrbiParticleSphere size={80} vivid className="rounded-full" />
        </span>
        <h1 className="relative mt-5 font-[family-name:var(--font-manrope)] text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-on-background">
          Indique o Orbibox, ganhe todo mês
        </h1>
        <p className="relative mx-auto mt-3 max-w-[420px] text-[15px] leading-relaxed text-text-secondary">
          Você indica, a pessoa assina, e você recebe 30% de comissão recorrente por 12 meses. Sem custo, sem meta, sem precisar de conta.
        </p>
      </div>

      {/* Números */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {GANHOS.map((g) => (
          <div key={g.label} className="rounded-[22px] border border-divider bg-surface-white px-3 py-5 text-center">
            <p className="font-[family-name:var(--font-manrope)] text-[26px] font-bold leading-none tracking-[-0.02em]">{g.valor}</p>
            <p className="mt-1 text-[12px] font-semibold text-on-background">{g.label}</p>
            <p className="mt-1.5 text-[11px] leading-snug text-text-tertiary">{g.nota}</p>
          </div>
        ))}
      </div>

      {/* Como funciona */}
      <div className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Como funciona</p>
        <div className="mt-3 flex flex-col gap-2.5">
          {PASSOS.map((p) => (
            <div key={p.n} className="flex items-start gap-3.5 rounded-[22px] border border-divider bg-surface-white p-5">
              <span className="orbi-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-on-background">{p.n}</span>
              <div className="min-w-0">
                <p className="text-[15.5px] font-semibold leading-tight">{p.titulo}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-text-secondary">{p.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Como você acompanha */}
      <div className="mt-4 rounded-[24px] bg-surface-soft p-6">
        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold tracking-[-0.01em]">Você acompanha tudo</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
          Junto com seu link, você recebe um painel próprio, só seu. Nele você vê em tempo real:
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {[
            "Quanto você tem disponível pra receber, agora.",
            "Quantas pessoas acessaram, cadastraram e assinaram pelo seu link.",
            "Cada venda, com plano, data e até quando ainda gera comissão.",
            "Quanto entrou de comissão em cada mês.",
          ].map((t) => (
            <div key={t} className="flex items-start gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F7A3D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M20 6L9 17l-5-5" /></svg>
              <p className="text-[13.5px] leading-snug text-text-secondary">{t}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-text-tertiary">
          Você não precisa criar conta nem instalar nada. O painel abre por um link, no navegador do celular ou do computador.
        </p>
      </div>

      {/* Chamada final */}
      <div className="mt-6 rounded-[24px] border border-divider bg-surface-white p-6 text-center">
        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold tracking-[-0.01em]">Quer participar?</p>
        <p className="mx-auto mt-1.5 max-w-[380px] text-[14px] leading-relaxed text-text-secondary">
          Fale com quem te enviou esta página. Em minutos você recebe seu link e seu painel, e já pode começar a indicar.
        </p>
      </div>

      <p className="mt-8 text-center text-[12px] text-text-tertiary">
        Orbibox, a web que se adapta a quem entra.
      </p>
    </main>
  );
}
