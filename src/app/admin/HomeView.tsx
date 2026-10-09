import Link from "next/link";
import { ShareOrbiboxButton } from "@/components/mobile/ShareOrbiboxButton";
import { QRCodeButton } from "@/components/ui/QRCodeButton";
import { WelcomeBackBanner } from "./WelcomeBackBanner";
import { ProximaAcao } from "./ProximaAcao";
import { Marcos } from "./Marcos";
import { ConviteCard } from "./ConviteCard";
import { OportunidadeCard } from "./OportunidadeCard";
import { PerguntaOrbi } from "./PerguntaOrbi";
import type { Oportunidade } from "@/lib/copiloto";
import type { ComponentProps } from "react";

function variacao(agora: number, antes: number): { texto: string; sobe: boolean | null } {
  if (antes === 0) return agora > 0 ? { texto: "novo", sobe: true } : { texto: "", sobe: null };
  const d = Math.round(((agora - antes) / antes) * 100);
  if (d === 0) return { texto: "igual", sobe: null };
  return { texto: `${d > 0 ? "+" : ""}${d}%`, sobe: d > 0 };
}

// Ícones de traço fino, no mesmo desenho dos outros do painel.
const I = {
  clientes: <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM21 19v-1a4 4 0 0 0-3-3.87M15.5 4.13a3 3 0 0 1 0 5.74" />,
  promocao: <path d="M3 9a2 2 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 0 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1ZM9 15l6-6" />,
  vitrine: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  produto: <path d="M12 5v14M5 12h14" />,
  uso: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
  ia: <path d="M12 3v2M12 19v2M5.6 5.6 7 7M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
};
function Icone({ d }: { d: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-on-background">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
    </span>
  );
}


export type HomeViewProps = {
  saudacao: string;
  primeiroNome: string | null;
  b: { id: string; name: string; slug: string };
  shareUrl: string;
  shareTitle: string;
  shareReady: boolean;
  teste: { dias: number } | null;
  oportunidade: Oportunidade;
  proxima: Omit<ComponentProps<typeof ProximaAcao>, "pendencia">;
  marcos: ComponentProps<typeof Marcos>["contagem"];
  numeros: { rotulo: string; n: number; antes: number; href: string }[];
  orbiColors: string[] | null;
  progressoPct: number;
  mostrarConvite: boolean;
  pendencias: { title: string; href: string }[];
  /** Próxima pendência de cadastro, em linha fina embaixo do card principal quando ele está ocupado por uma oportunidade. */
  passoFaltando: { title: string; ctaLabel: string; href: string } | null;
};

/** A home do painel, só apresentação: os dados vêm prontos de page.tsx. */
export function HomeView({ saudacao, primeiroNome, b, shareUrl, shareTitle, shareReady, teste, oportunidade, proxima, marcos, numeros, orbiColors, progressoPct, mostrarConvite, pendencias, passoFaltando }: HomeViewProps) {
  const cartao = "flex min-h-[92px] flex-col justify-between gap-3 rounded-[22px] bg-surface-white p-4 text-left ring-1 ring-black/[0.05] transition-transform active:scale-[0.98]";

  return (
    <div className="relative flex flex-col">
      {/* Saudação */}
      <div className="mt-3">
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-tight tracking-[-0.02em]">
          {saudacao}, {primeiroNome ?? b.name}.
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-text-secondary">
          {primeiroNome && <span>{b.name}</span>}
          <Link href={`/${b.slug}`} target="_blank" className="underline underline-offset-2">Ver minha página ↗</Link>
          <QRCodeButton url={shareUrl} businessName={b.name} className="underline underline-offset-2">QR Code</QRCodeButton>
        </div>
      </div>

      {teste && (
        <Link
          href="/admin/planos"
          className={`mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[13.5px] ${teste.dias <= 2 ? "bg-[#FFF4E5] text-[#7A4A0B] ring-1 ring-[#F5DDB8]" : "bg-surface-soft text-text-secondary"}`}
        >
          <span>
            {teste.dias === 0 ? "Último dia do seu teste grátis." : `Teste grátis: ${teste.dias === 1 ? "falta 1 dia" : `faltam ${teste.dias} dias`}.`}{" "}
            <span className={teste.dias <= 2 ? "font-medium underline underline-offset-2" : "text-text-tertiary"}>Ver resultados</span>
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      {oportunidade.selo !== "Deixe sua página mais completa" && <OportunidadeCard o={oportunidade} shareUrl={shareUrl} shareTitle={shareTitle} shareReady={shareReady} />}

      <ProximaAcao {...proxima} pendencia={null} />

      {passoFaltando && (
        <Link href={passoFaltando.href} className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-white px-4 py-3 ring-1 ring-black/[0.06] active:opacity-70">
          <span className="h-2 w-2 shrink-0 rounded-full orbi-gradient" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[14px]">{passoFaltando.title}</span>
          <span className="shrink-0 text-[13px] text-text-secondary underline underline-offset-2">{passoFaltando.ctaLabel} →</span>
        </Link>
      )}

      <Marcos businessId={b.id} contagem={marcos} />

      {/* Só os 4 números que importam, da semana, com a comparação */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-medium">Últimos 7 dias</h2>
          <Link href="/admin/pulse" className="text-[13px] text-text-secondary">Ver tudo →</Link>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {numeros.map((m) => {
            const v = variacao(m.n, m.antes);
            return (
              <Link key={m.rotulo} href={m.href} className="flex flex-col rounded-[18px] bg-surface-white px-2.5 py-3 ring-1 ring-black/[0.05] active:opacity-70">
                <span className="font-[family-name:var(--font-manrope)] text-[22px] font-medium tabular-nums leading-none">{m.n.toLocaleString("pt-BR")}</span>
                <span className="mt-1.5 text-[11.5px] text-text-secondary">{m.rotulo}</span>
                <span className={`mt-0.5 h-4 text-[11px] font-medium ${v.sobe === true ? "text-[#1F7A3D]" : v.sobe === false ? "text-[#B4321F]" : "text-text-tertiary"}`}>{v.texto}</span>
              </Link>
            );
          })}
        </div>
        <p className="mt-2 text-[11.5px] text-text-tertiary">Conversões são toques no WhatsApp e ofertas resgatadas.</p>
      </section>

      {/* Próximas ações por intenção: as ferramentas continuam no menu */}
      <section className="mt-8">
        <h2 className="text-[15px] font-medium">O que você quer fazer hoje?</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ShareOrbiboxButton url={shareUrl} title={shareTitle} shareReady={shareReady} className={cartao}>
            <Icone d={I.clientes} />
            <span className="text-[14px] font-medium leading-tight">Ganhar mais clientes</span>
          </ShareOrbiboxButton>
          <Link href="/admin/vouchers?novo=1" className={cartao}>
            <Icone d={I.promocao} />
            <span className="text-[14px] font-medium leading-tight">Criar uma promoção</span>
          </Link>
          <Link href="/admin/boxes" className={cartao}>
            <Icone d={I.vitrine} />
            <span className="text-[14px] font-medium leading-tight">Melhorar minha vitrine</span>
          </Link>
          <Link href="/admin/vitrine?novo=1" className={cartao}>
            <Icone d={I.produto} />
            <span className="text-[14px] font-medium leading-tight">Adicionar produto ou serviço</span>
          </Link>
          <Link href="/admin/pulse" className={cartao}>
            <Icone d={I.uso} />
            <span className="text-[14px] font-medium leading-tight">Ver como meus clientes usam</span>
          </Link>
          <Link href="/admin/agent" className={cartao}>
            <Icone d={I.ia} />
            <span className="text-[14px] font-medium leading-tight">Melhorar minha IA</span>
          </Link>
        </div>
      </section>

      <PerguntaOrbi orbiColors={orbiColors} />

      {progressoPct < 100 && (
        <Link href="/admin/pendencias" className="mt-6 flex items-center gap-3 rounded-2xl bg-surface-soft px-4 py-3 active:opacity-70">
          <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white">
            <span className="orbi-gradient absolute inset-y-0 left-0 rounded-full" style={{ width: `${progressoPct}%` }} />
          </span>
          <span className="shrink-0 text-[12.5px] text-text-secondary">Página {progressoPct}% completa · ver o que falta</span>
        </Link>
      )}

      {mostrarConvite && <ConviteCard />}

      <WelcomeBackBanner businessName={b.name} pendencias={pendencias} />
    </div>
  );
}
