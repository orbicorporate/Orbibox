"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

type Estado = "conta" | "testando" | "assinou" | "parou";
type Amigo = { nome: string; estado: Estado };

const ESTADO: Record<Estado, { rotulo: string; cls: string }> = {
  conta: { rotulo: "Criou a conta", cls: "bg-surface-soft text-text-secondary" },
  testando: { rotulo: "Testando grátis", cls: "bg-[#FDEEDF] text-[#B45A08]" },
  assinou: { rotulo: "Assinou · +1 mês", cls: "bg-[#DEF3E3] text-[#17803F]" },
  parou: { rotulo: "Não seguiu", cls: "bg-surface-soft text-text-tertiary" },
};

const META = 12;

function frasePremio(meses: number) {
  if (meses === 0) return "Seu primeiro mês grátis está a 1 amigo de distância.";
  const falta = (n: number) => (n === 1 ? "Falta 1 amigo" : `Faltam ${n} amigos`);
  if (meses < 3) return `${falta(3 - meses)} pra 3 meses grátis.`;
  if (meses < 6) return `${falta(6 - meses)} pra meio ano grátis.`;
  if (meses < 12) return `${falta(12 - meses)} pra 1 ano inteiro grátis.`;
  return "Você já garantiu 1 ano grátis. E continua valendo!";
}

function IconeWhats() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" />
    </svg>
  );
}
function IconeInsta() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconeMais() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

export function ReferralPanel({ code, amigos, mesesGuardados, statusPlano }: { code: string; amigos: Amigo[]; mesesGuardados: number; statusPlano: string | null }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const [modelo, setModelo] = useState(0);
  const base = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "https://orbibox-one.vercel.app");
  const link = `${base}/r/${code}`;

  const meses = amigos.filter((a) => a.estado === "assinou").length;
  const testando = amigos.filter((a) => a.estado === "testando").length;

  const MODELOS = [
    { rotulo: "Pra um amigo", texto: `Tô usando o Orbibox no meu negócio: uma página com IA que responde cliente, mostra catálogo e cria vouchers. Pelo meu link você testa 14 dias grátis, sem cartão: ${link}` },
    { rotulo: "Pra quem tem negócio", texto: `Se você tem negócio, olha isso: o Orbibox monta sua página com uma IA que atende seus clientes 24h e ainda cria promoções. Me ajudou muito. Pelo meu convite são 14 dias grátis: ${link}` },
    { rotulo: "Curtinha", texto: `Testa o Orbibox, 14 dias grátis pelo meu link: ${link}` },
  ];
  const texto = MODELOS[modelo].texto;

  async function copiar(oque: "link" | "texto") {
    try {
      await navigator.clipboard.writeText(oque === "link" ? link : texto);
      setCopiado(oque);
      setTimeout(() => setCopiado(null), 1800);
    } catch { /* sem clipboard */ }
  }
  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }
  async function stories() {
    await copiar("link");
    setCopiado("stories");
    setTimeout(() => setCopiado(null), 4000);
  }
  async function mais() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: "Orbibox", text: texto }); return; } catch { return; }
    }
    copiar("texto");
  }

  const ondeEntra =
    statusPlano === "trialing" ? "Você está testando: cada mês ganho soma 30 dias no seu teste grátis."
    : statusPlano === "active" || statusPlano === "past_due" ? "Você é assinante: cada mês ganho vira desconto de 1 mês na próxima fatura."
    : statusPlano === "comped" ? "Sua conta é cortesia. Os meses ficam registrados aqui."
    : "Os meses ficam guardados e viram dias grátis quando você assinar.";

  return (
    <div className="flex flex-col pb-6">
      <Link href="/admin" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Início</Link>

      {/* Herói com a régua de 12 meses */}
      <div className="relative mt-4 overflow-hidden rounded-[28px] bg-[#111318] p-6 text-white">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full orbi-gradient opacity-50 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-[#7C5CFF] opacity-30 blur-3xl" />
        <p className="relative text-[12px] font-semibold uppercase tracking-[0.16em] text-white/60">Indique e ganhe</p>
        <h1 className="relative mt-2 font-[family-name:var(--font-manrope)] text-[27px] font-semibold leading-[1.12] tracking-[-0.02em]">
          Cada amigo que assina vale <span className="orbi-gradient-text">1 mês grátis</span> pra você
        </h1>
        <p className="relative mt-2.5 text-[14px] leading-snug text-white/75">
          No plano mensal ou anual, sem limite. E seu amigo ainda testa 14 dias grátis em vez de 7, sem cartão.
        </p>

        <div className="relative mt-6">
          <div className="grid grid-cols-6 gap-1.5" role="img" aria-label={`${Math.min(meses, META)} de ${META} meses grátis conquistados`}>
            {Array.from({ length: META }, (_, i) => {
              const ganho = i < meses;
              return (
                <div
                  key={i}
                  className={`flex h-10 items-center justify-center rounded-xl text-[12px] font-semibold transition-colors ${ganho ? "orbi-gradient text-[#111318]" : "bg-white/[0.08] text-white/35 ring-1 ring-inset ring-white/10"}`}
                >
                  {ganho ? "✓" : i + 1}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-[13.5px] font-medium">{frasePremio(meses)}</p>
            <p className="shrink-0 pl-3 text-[12px] text-white/55">{Math.min(meses, META)}/{META}</p>
          </div>
        </div>
      </div>

      {/* Compartilhar */}
      <div className="mt-4 rounded-[24px] bg-surface-white p-5 shadow-[0_10px_24px_-14px_rgba(17,19,24,0.28)] ring-1 ring-black/[0.06]">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Seu link de convite</p>
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface-soft py-2 pl-4 pr-2">
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{link.replace(/^https?:\/\//, "")}</span>
          <button onClick={() => copiar("link")} className="min-h-[36px] shrink-0 rounded-full bg-on-background px-4 text-[12.5px] font-semibold text-white">
            {copiado === "link" ? "Copiado ✓" : "Copiar"}
          </button>
        </div>

        <p className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Escolha a mensagem</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODELOS.map((m, i) => (
            <button
              key={m.rotulo}
              type="button"
              onClick={() => setModelo(i)}
              aria-pressed={modelo === i}
              className={`min-h-[36px] rounded-full px-3.5 text-[13px] font-medium ${modelo === i ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
            >
              {m.rotulo}
            </button>
          ))}
        </div>
        {/* Prévia no jeito de balão do WhatsApp */}
        <div className="mt-3 rounded-[18px] rounded-tr-md bg-[#DCF8C6] px-4 py-3 text-[14px] leading-snug text-[#111b21]">
          {texto}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={whatsapp} className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-[#25D366] text-[12.5px] font-semibold text-white">
            <IconeWhats />
            WhatsApp
          </button>
          <button onClick={stories} className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl text-[12.5px] font-semibold text-white" style={{ background: "linear-gradient(135deg,#F58529,#DD2A7B 50%,#8134AF)" }}>
            <IconeInsta />
            Stories
          </button>
          <button onClick={mais} className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl bg-surface-soft text-[12.5px] font-semibold text-on-background">
            <IconeMais />
            Mais
          </button>
        </div>
        {copiado === "stories" && (
          <p className="mt-3 rounded-2xl bg-surface-soft px-4 py-2.5 text-[13px] leading-snug text-text-secondary">
            Link copiado. No Instagram, crie um story e use o adesivo &ldquo;Link&rdquo; pra colar.
          </p>
        )}
        {copiado === "texto" && <p className="mt-3 text-[13px] text-text-secondary">Mensagem copiada ✓</p>}
      </div>

      {/* Números */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          { n: amigos.length, t: "convidados", bg: "#E7EAFC", fg: "#4453D6" },
          { n: testando, t: "testando agora", bg: "#FDEEDF", fg: "#B45A08" },
          { n: meses, t: meses === 1 ? "mês ganho" : "meses ganhos", bg: "#DEF3E3", fg: "#17803F" },
        ].map((c) => (
          <div key={c.t} className="rounded-[20px] p-3.5" style={{ backgroundColor: c.bg }}>
            <p className="font-[family-name:var(--font-manrope)] text-[26px] font-bold leading-none" style={{ color: c.fg }}>{c.n}</p>
            <p className="mt-1.5 text-[12px] font-medium leading-tight" style={{ color: c.fg }}>{c.t}</p>
          </div>
        ))}
      </div>
      {mesesGuardados > 0 && (
        <p className="mt-2.5 rounded-2xl bg-[#DEF3E3] px-4 py-2.5 text-[13px] text-[#17803F]">
          Você tem {mesesGuardados} {mesesGuardados === 1 ? "mês guardado" : "meses guardados"} esperando. Entram como dias grátis quando assinar.
        </p>
      )}

      {/* Amigos */}
      <div className="mt-4 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
        <p className="text-[15px] font-semibold">Seus convidados</p>
        {amigos.length === 0 ? (
          <p className="mt-2 text-[13.5px] leading-snug text-text-secondary">
            Ninguém entrou pelo seu link ainda. Pense em 3 amigos com negócio e mande agora: é o jeito mais rápido de ganhar seu primeiro mês.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-divider">
            {amigos.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 truncate text-[14px]">{a.nome}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${ESTADO[a.estado].cls}`}>{ESTADO[a.estado].rotulo}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Como funciona */}
      <div className="mt-4 rounded-[24px] bg-surface-soft p-5">
        <p className="text-[15px] font-semibold">Como funciona</p>
        <ol className="mt-3 flex flex-col gap-3">
          {[
            ["Mande seu link", "Pelo WhatsApp, stories ou onde quiser."],
            ["Seu amigo testa 7 dias grátis", "Ele cria a página dele e conhece tudo sem pagar nada."],
            ["Ele assinou, você ganhou", "Quando ele paga a primeira mensalidade, mensal ou anual, entra 1 mês grátis pra você."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-on-background text-[12px] font-semibold text-white">{i + 1}</span>
              <span className="text-[13.5px] leading-snug">
                <span className="block font-medium">{t}</span>
                <span className="text-text-secondary">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-divider pt-3 text-[12.5px] leading-snug text-text-secondary">{ondeEntra}</p>
      </div>
    </div>
  );
}
