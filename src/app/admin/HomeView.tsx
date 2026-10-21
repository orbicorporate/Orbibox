import Link from "next/link";
import { ShareOrbiboxButton } from "@/components/mobile/ShareOrbiboxButton";
import { QRCodeButton } from "@/components/ui/QRCodeButton";
import { WelcomeBackBanner } from "./WelcomeBackBanner";
import { ProximaAcao } from "./ProximaAcao";
import { Marcos } from "./Marcos";
import { ConviteCard } from "./ConviteCard";
import { OportunidadeCard } from "./OportunidadeCard";
import { LinhaExpansivel } from "./LinhaExpansivel";
import { PerguntaOrbi } from "./PerguntaOrbi";
import { CartaoTour } from "./CartaoTour";
import { PerguntaRede } from "@/components/rede/PerguntaRede";
import type { Oportunidade } from "@/lib/copiloto";
import type { ComponentProps } from "react";

const TEMA_PADRAO = { de: "#F3F4F6", ate: "#E4E6EB", cor: "#2A2F3A", icone: "M4 12h16", dica: "" };
const TEMAS_NUMERO: Record<string, { de: string; ate: string; cor: string; icone: string; dica: string }> = {
  Visitas: { de: "#EEFCCB", ate: "#D8F59A", cor: "#2F6B00", icone: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z", dica: "Pessoas que abriram seu link" },
  Conversas: { de: "#E3EBFF", ate: "#C4D3FF", cor: "#2F4FB3", icone: "M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z", dica: "Papos com a Orbi" },
  Contatos: { de: "#EFE6FF", ate: "#D2BDFF", cor: "#6A3FC4", icone: "M16 19c0-2.8-2.2-5-5-5s-5 2.2-5 5M11 11a3 3 0 100-6 3 3 0 000 6zM19 8v6M22 11h-6", dica: "Quem deixou o contato" },
  WhatsApp: { de: "#DDF9F4", ate: "#B5EDE3", cor: "#00695F", icone: "M5 19l1.2-3.6A8 8 0 1112 20a8 8 0 01-3.8-1L5 19z", dica: "Toques no botão de WhatsApp" },
  Resgates: { de: "#FFEAD7", ate: "#FFCFA6", cor: "#A8481A", icone: "M3 9a2 2 0 010 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 010-4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2zM13 5v14", dica: "Pessoas que pegaram um voucher" },
};

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
  numeros: { rotulo: string; n: number; antes: number; href: string; conversao?: boolean }[];
  orbiColors: string[] | null;
  progressoPct: number;
  mostrarConvite: boolean;
  /** Dono com a Orbi (plano ou teste): vê a pergunta sobre rede de lojas até dispensar. */
  perguntaRede?: boolean;
  pendencias: { title: string; href: string }[];
  /** Próxima pendência de cadastro, em linha fina embaixo do card principal quando ele está ocupado por uma oportunidade. */
  passoFaltando: { title: string; description: string; ctaLabel: string; href: string } | null;
};

/** A home do painel, só apresentação: os dados vêm prontos de page.tsx. */
export function HomeView({ saudacao, primeiroNome, b, shareUrl, shareTitle, shareReady, teste, oportunidade, proxima, marcos, numeros, orbiColors, progressoPct, mostrarConvite, perguntaRede, pendencias, passoFaltando }: HomeViewProps) {
  const cartao = "flex min-h-[92px] flex-col justify-between gap-3 rounded-[22px] bg-surface-white p-4 text-left ring-1 ring-black/[0.05] transition-transform active:scale-[0.98]";

  return (
    <div className="relative flex flex-col">
      {/* Saudação */}
      <div className="mt-3">
        <h1 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-tight tracking-[-0.02em]">
          {saudacao}, {primeiroNome ?? b.name}.
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Link href={`/${b.slug}`} target="_blank" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-on-background px-5 text-[14px] font-medium text-white transition-transform active:scale-[0.98]">
            Ver minha página <span aria-hidden>↗</span>
          </Link>
          <QRCodeButton url={shareUrl} businessName={b.name} className="inline-flex min-h-[44px] items-center rounded-full border border-divider px-4 text-[14px] text-text-secondary">QR Code</QRCodeButton>
        </div>
      </div>

      {teste && (teste.dias <= 2 ? (
        <Link href="/admin/planos" className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#FFF4E5] px-4 py-2.5 text-[13.5px] text-[#7A4A0B] ring-1 ring-[#F5DDB8]">
          <span>{teste.dias === 0 ? "Último dia do teste grátis" : teste.dias === 1 ? "Falta 1 dia do teste grátis" : `Faltam ${teste.dias} dias do teste grátis`} <span className="font-medium underline underline-offset-2">Ver resultados</span></span>
          <span aria-hidden>→</span>
        </Link>
      ) : (
        <Link href="/admin/planos" className="mt-3 inline-flex min-h-[32px] w-fit items-center gap-1.5 rounded-full bg-surface-soft px-3 text-[12.5px] text-text-secondary">
          Teste grátis: {teste.dias} dias <span aria-hidden>→</span>
        </Link>
      ))}

      {oportunidade.selo !== "Deixe sua página mais completa" && <OportunidadeCard o={oportunidade} shareUrl={shareUrl} shareTitle={shareTitle} shareReady={shareReady} />}

      <ProximaAcao {...proxima} pendencia={null} compacto={oportunidade.selo !== "Deixe sua página mais completa"} />

      {progressoPct < 70 && <CartaoTour />}

      {/* Só os 4 números que importam, da semana, com a comparação */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-medium">Últimos 7 dias</h2>
          <Link href="/admin/pulse" className="text-[13px] text-text-secondary">Ver tudo →</Link>
        </div>
        <div className="no-scrollbar -mx-6 mt-3 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-1">
          {[...numeros.filter((m) => !m.conversao), ...numeros.filter((m) => m.conversao)].map((m) => {
            const v = variacao(m.n, m.antes);
            const tema = TEMAS_NUMERO[m.rotulo] ?? TEMA_PADRAO;
            return (
              <Link
                key={m.rotulo}
                href={m.href}
                className="flex aspect-[4/5] w-[44%] max-w-[190px] shrink-0 snap-start flex-col rounded-[24px] p-4 ring-1 ring-black/[0.05] transition-transform active:scale-[0.98]"
                style={{ backgroundImage: `linear-gradient(165deg, ${tema.de} 0%, ${tema.ate} 100%)`, color: tema.cor }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/60">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={tema.icone} /></svg>
                </span>
                <span className="mt-auto font-[family-name:var(--font-manrope)] text-[44px] font-medium tabular-nums leading-none">{m.n.toLocaleString("pt-BR")}</span>
                <span className="mt-1.5 text-[14px] font-medium leading-tight">{m.rotulo}</span>
                <span className="mt-0.5 text-[11.5px] leading-snug opacity-75">{tema.dica}</span>
                <span className={`mt-2 inline-flex h-6 w-fit items-center rounded-full bg-white/65 px-2.5 text-[11px] font-medium ${v.texto ? "" : "invisible"}`} style={{ color: v.sobe === false ? "#B4321F" : v.sobe === true ? "#1F7A3D" : tema.cor }}>{v.texto || "-"}</span>
              </Link>
            );
          })}
        </div>
        {numeros.every((m) => m.n === 0) && (
          <p className="mt-3 px-1 text-[12.5px] leading-snug text-text-tertiary">
            Suas próprias visitas não entram na conta. Mande o link para um amigo e ele aparece aqui.
          </p>
        )}
      </section>

      {passoFaltando && (
        <LinhaExpansivel
          className="mt-3"
          marcador={<span className="h-2 w-2 rounded-full orbi-gradient" />}
          titulo={passoFaltando.title}
          texto={passoFaltando.description}
          rotulo={passoFaltando.ctaLabel}
          href={passoFaltando.href}
        />
      )}

      <Marcos businessId={b.id} contagem={marcos} />

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
          <Link href="/admin/vitrine" className={cartao}>
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

      {perguntaRede && <PerguntaRede chave={`orbibox:pergunta-rede:${b.id}`} href="/admin/rede" className="mt-8" />}

      {mostrarConvite && <ConviteCard />}

      <WelcomeBackBanner businessName={b.name} pendencias={pendencias} />
    </div>
  );
}
