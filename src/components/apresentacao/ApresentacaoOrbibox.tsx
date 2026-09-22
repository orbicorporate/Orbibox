"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { GiftArt } from "@/components/mobile/GiftArt";
import { HomeOptionCardPreview } from "@/components/orbi/HomeOptionCard";
import { VITRINE_THEMES, type ThemePhoto } from "@/lib/vitrineThemes";
import { tamanhosSemBuraco } from "@/lib/inspireGrid";
import { TaxaConversao } from "@/app/admin/pulse/TaxaConversao";
import { PulseDetails } from "@/app/admin/pulse/PulseDetails";
import { PulseAudience } from "@/app/admin/pulse/PulseAudience";

/** Fotos reais do Inspire-se, por tema, passadas pela página (servidor). */
export type InspireParaApresentacao = Record<string, { photos: ThemePhoto[]; titleStyle: "faixa" | "sobre" }>;

/**
 * Apresentação do Orbibox: carrossel de tela cheia, um slide por feature,
 * cada um com um celular desenhado rodando uma cena animada do produto.
 *
 * Como funciona a navegação:
 * - rolagem horizontal nativa com scroll-snap (arrasta liso no celular);
 * - barra de progresso em cima (estilo Stories): a barra do slide ativo
 *   enche em 6,5s e, ao terminar, avança sozinha; segurar o dedo pausa;
 * - dica de "arraste" embaixo, que some depois do primeiro gesto.
 *
 * As cenas usam peças reais do app (esfera da Orbi, arte do gift, tokens
 * de cor e tipografia), então evoluem junto com o produto, sem print.
 */

type Props = {
  /** Fotos reais do Inspire-se (restaurante, moda, doceria, arquitetura, fitness). */
  inspire?: InspireParaApresentacao;
  /** Pra onde vai o botão final. */
  finalHref: string;
  finalLabel: string;
  /** Link do "Pular" no canto. Se vazio, não mostra. */
  skipHref?: string;
  skipLabel?: string;
};

const AUTO_MS = 6500;

export function ApresentacaoOrbibox({ inspire = {}, finalHref, finalLabel, skipHref, skipLabel = "Pular" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [jaArrastou, setJaArrastou] = useState(false);

  const slides = useMemo(() => montarSlides(finalHref, finalLabel, inspire), [finalHref, finalLabel, inspire]);
  const total = slides.length;
  const ultimo = ativo === total - 1;

  function irPara(i: number) {
    const el = trackRef.current;
    if (!el) return;
    const alvo = Math.max(0, Math.min(total - 1, i));
    el.scrollTo({ left: alvo * el.clientWidth, behavior: "smooth" });
  }

  // Índice ativo a partir da posição da rolagem (throttle por rAF).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth);
        setAtivo((prev) => {
          if (prev !== i) setJaArrastou(true);
          return i;
        });
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Pausa enquanto o dedo/mouse está segurando a tela.
  const segurar = () => setPausado(true);
  const soltar = () => setPausado(false);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-background-main select-none"
      onPointerDown={segurar}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onPointerLeave={soltar}
    >
      {/* Fundo: dois brilhos suaves no degradê da Orbi */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full orbi-gradient opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full orbi-gradient opacity-20 blur-3xl" />

      {/* Barras de progresso + Pular */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="flex flex-1 gap-1.5">
          {slides.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-on-background/10">
              {i < ativo ? (
                <div className="h-full w-full rounded-full bg-on-background" />
              ) : i === ativo && !ultimo ? (
                <div
                  key={`fill-${ativo}`}
                  className={`apr-fill h-full rounded-full bg-on-background ${pausado ? "apr-paused" : ""}`}
                  style={{ animationDuration: `${slides[ativo].duracaoMs ?? AUTO_MS}ms` }}
                  onAnimationEnd={() => irPara(ativo + 1)}
                />
              ) : i === ativo ? (
                <div className="h-full w-full rounded-full bg-on-background" />
              ) : null}
            </div>
          ))}
        </div>
        {skipHref && (
          <Link href={skipHref} className="shrink-0 rounded-full bg-surface-white/80 px-3 py-1 text-[12px] font-semibold text-text-secondary backdrop-blur">
            {skipLabel}
          </Link>
        )}
      </div>

      {/* Trilho dos slides */}
      <div ref={trackRef} className="apr-track relative z-10 flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden">
        {slides.map((s, i) => (
          <section key={i} className="flex w-full shrink-0 snap-start flex-col items-center justify-center px-6 pb-4">
            {!s.full && (
              <div className="mb-5 flex flex-col items-center text-center">
                <span
                  className="rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]"
                  style={{ background: `${s.cor ?? "#111318"}17`, color: s.cor ?? "#111318" }}
                >
                  {s.rotulo}
                </span>
                <h2 className="mt-3 font-[family-name:var(--font-manrope)] text-[21px] font-semibold leading-[1.2] tracking-[-0.02em] text-on-background">
                  {s.titulo}
                </h2>
                {s.checks && s.checks.length > 0 ? (
                  <div className="mt-4 flex w-full max-w-[320px] flex-col gap-3 rounded-2xl bg-surface-white/80 px-4 py-3.5 shadow-[0_2px_12px_rgba(17,19,24,0.05)]">
                    {s.checks.map((c, ci) => (
                      <div key={ci} className="flex items-start gap-2.5">
                        <span className="mt-[1px]">
                          <CheckTag cor={s.cor ?? "#111318"} />
                        </span>
                        <span className="text-left text-[13px] font-medium leading-snug text-text-secondary">{c}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-snug text-text-secondary">{s.frase}</p>
                )}
              </div>
            )}
            {s.cena ? (
              <Celular>{i === ativo ? <s.cena key={`cena-${i}-${ativo}`} /> : <s.cena />}</Celular>
            ) : (
              s.livre
            )}
          </section>
        ))}
      </div>

      {/* Dica de arraste, some depois do primeiro gesto; pontinhos + posição */}
      <div className="relative z-10 flex flex-col items-center gap-2 px-6 pb-[max(16px,env(safe-area-inset-bottom))]">
        {!jaArrastou && !ultimo ? (
          <p className="flex items-center gap-2 text-[12px] font-medium text-text-tertiary">
            Arraste pro lado <span className="apr-hint inline-block">→</span>
          </p>
        ) : (
          <p className="text-[12px] text-text-tertiary tabular-nums">{ativo + 1} de {total}</p>
        )}
      </div>
    </div>
  );
}

/* ---------- Moldura do celular ---------- */

function Celular({ children }: { children: ReactNode }) {
  return (
    <div className="apr-float relative" style={{ height: "min(66vh, 660px)" }}>
      <div className="relative aspect-[9/18.5] h-full rounded-[40px] border-[6px] border-[#111318] bg-[#111318] shadow-[0_24px_60px_rgba(17,19,24,0.28)]">
        {/* dynamic island */}
        <div className="absolute left-1/2 top-2.5 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-[#111318]" />
        <div className="pointer-events-none relative h-full w-full overflow-hidden rounded-[34px] bg-background-main">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Roteiro dos slides ---------- */

type Slide = { rotulo: string; titulo: string; frase: string; checks?: string[]; cor?: string; cena?: () => ReactNode; livre?: ReactNode; duracaoMs?: number; full?: boolean };

/** Slide de vitrine com as fotos reais do tema do Inspire-se. Se o tema
 * ainda não tiver fotos cadastradas, cai na versão ilustrada (gradientes). */
function vitrineSlide(inspire: InspireParaApresentacao, temaId: string, nome: string, titulo: string, frase: string, cor: string, checks: string[]): Slide {
  const fotos = inspire[temaId]?.photos ?? [];
  const fallback: Record<string, keyof typeof VITRINES> = { restaurante: "cafe", fitness: "pilates", moda: "moda", doceria: "doceria", arquitetura: "arquitetura" };
  const Cena = fotos.length >= 4
    ? function CenaVitrineReal() { return <CenaVitrineFotos temaId={temaId} nome={nome} photos={fotos} titleStyle={inspire[temaId].titleStyle} />; }
    : function CenaVitrineIlustrada() { return <CenaVitrine tema={fallback[temaId] ?? "cafe"} />; };
  return { rotulo: "Vitrine", titulo, frase, checks, cor, cena: Cena, duracaoMs: 9000 };
}

/** Slide de detalhe do produto, logo depois do Portfólio: mostra a página
 * que abre quando o visitante toca num item da vitrine. Usa uma foto real
 * do tema arquitetura quando existe. */
function produtoSlide(inspire: InspireParaApresentacao): Slide {
  const fotos = inspire["arquitetura"]?.photos ?? [];
  const idx = fotos.findIndex((f) => f.title === "Living Panorâmico Integrado");
  const escolhidas = idx >= 0 ? fotos.slice(idx, idx + 3) : fotos.slice(0, 3);
  return {
    rotulo: "Produto",
    titulo: "Cada item, sua própria página",
    frase: "Fotos, preço, diferenciais e botão de contato, tudo num só lugar.",
    checks: ["Diferenciais em destaque, não só a foto", "Botão direto pro WhatsApp ou pro site"],
    cor: "#5B4B3A",
    cena: () => <CenaProdutoDetalhe fotos={escolhidas} />,
    duracaoMs: 11500,
  };
}

function montarSlides(finalHref: string, finalLabel: string, inspire: InspireParaApresentacao): Slide[] {
  return [
    {
      rotulo: "Orbibox",
      titulo: "A IA da sua marca com site inteligente",
      frase: "A pessoa chega, diz o que quer, e o seu negócio responde na hora.",
      checks: ["Apresenta seu negócio e seus produtos", "Responde dúvidas dos seus clientes"],
      cor: "#111318",
      cena: CenaInicio,
      duracaoMs: 9500,
    },
    vitrineSlide(
      inspire, "doceria", "Doce Ateliê", "Organize como quiser",
      "Encomenda, cardápio do dia, bolo de aniversário. Tudo num toque.",
      "#B0309E", ["Mostre opções, fotos e preços", "Facilite para o seu cliente"],
    ),
    vitrineSlide(
      inspire, "fitness", "Fit Store", "Vitrine de produtos",
      "Produtos, fotos e preços que a Orbi já conhece de cor.",
      "#2F5D50", ["Organize seus produtos em um só lugar", "A IA ajuda o cliente a escolher"],
    ),
    vitrineSlide(
      inspire, "arquitetura", "Studio Design", "Portfólio",
      "Portfólio, serviços e um jeito fácil de pedir orçamento.",
      "#5B4B3A", ["Apresente seus trabalhos", "Página exclusiva por item"],
    ),
    produtoSlide(inspire),
    {
      rotulo: "IA pessoal",
      titulo: "Agente IA da sua marca",
      frase: "Tira dúvida, indica produto e fecha venda, 24 horas por dia.",
      checks: ["Conversa com seu cliente", "Recomenda produtos, 24 horas por dia"],
      cor: "#0E9488",
      cena: CenaChat,
      duracaoMs: 15500,
    },
    {
      rotulo: "Pulse",
      titulo: "Resultados",
      frase: "Quantos entraram, de onde vieram e o que fizeram. E o que fazer a seguir.",
      checks: ["Saiba de onde vêm suas visitas", "Painel de insights valiosos"],
      cor: "#6D5EF5",
      cena: CenaPulse,
      duracaoMs: 13000,
    },
    {
      rotulo: "Vouchers",
      titulo: "Cupons de desconto",
      frase: "Cupom com estoque controlado, QR pra resgatar no balcão.",
      checks: ["Conquiste clientes novos a qualquer momento", "Valide o uso por QR Code"],
      cor: "#B45309",
      cena: CenaVouchers,
      duracaoMs: 9500,
    },
    {
      rotulo: "Gift",
      titulo: "Vale-presente",
      frase: "Vale-presente com a sua cara, liberado pelo WhatsApp.",
      checks: ["Ofereça vales com a sua marca", "O cliente escolhe o valor e quem vai receber"],
      cor: "#C9932B",
      cena: CenaGift,
      duracaoMs: 10500,
    },
    {
      rotulo: "Conversas",
      titulo: "Captura de contatos",
      frase: "Quem chegou, quem esfriou, quem pediu aviso. A Orbi escreve, você manda.",
      checks: ["Seu agente armazena o contato", "Monta estratégia e busca o visitante de volta pelo WhatsApp"],
      cor: "#2F63C9",
      cena: CenaConversas,
      duracaoMs: 10000,
    },
    {
      rotulo: "Comece agora",
      titulo: "Crie a IA da sua marca com site inteligente",
      frase: "3 dias grátis. Cancela quando quiser.",
      checks: ["Teste grátis por 3 dias", "Sem cartão para começar"],
      cor: "#1F7A45",
      full: true,
      livre: <CenaFinal href={finalHref} label={finalLabel} rotulo="Comece agora" titulo="Crie a IA da sua marca com site inteligente" checks={["Teste grátis por 3 dias", "Sem cartão para começar"]} />,
    },
  ];
}

/* ---------- Cenas ---------- */

const d = (i: number) => ({ animationDelay: `${i * 0.14}s` });

/** Renderiza o conteúdo na largura real da Home (390px) e só reduz com
 * escala pra caber na tela do celular desenhado. Assim a proporção entre
 * fonte, ícone, padding e card fica idêntica ao site de verdade. */
function TelaReal({ children }: { children: ReactNode }) {
  const REAL = 390;
  const ref = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: REAL, h: 800 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setDim({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const escala = dim.w / REAL;
  return (
    <div ref={ref} className="h-full w-full overflow-hidden">
      <div style={{ width: REAL, height: dim.h / escala, transform: `scale(${escala})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

function CenaInicio() {
  const cor = ["#B7F34A", "#6EE7D8"];
  const boxes: { layout: "largo" | "medio"; icon: string; t: string; s: string; color?: string; ai?: boolean; cupom?: boolean; stars?: boolean }[] = [
    { layout: "largo", icon: "◆", t: "Comprar", s: "Explore nosso catálogo completo.", color: "#111318" },
    { layout: "medio", icon: "◇", t: "Conhecer", s: "Nossa história e espaço." },
    { layout: "medio", icon: "__orb__", t: "Falar com a Orbi", s: "Tira dúvida na hora.", ai: true },
    { layout: "largo", icon: "🎟️", t: "Vouchers", s: "Resgate agora e aproveite.", cupom: true },
    { layout: "medio", icon: "__google__", t: "Avaliar", s: "Deixe sua nota no Google.", stars: true },
    { layout: "medio", icon: "__pin__", t: "Como chegar", s: "Waze e Google Maps." },
    { layout: "largo", icon: "__wadisc__", t: "WhatsApp", s: "Fala direto com a gente." },
    { layout: "medio", icon: "__gift__", t: "Presentear", s: "Monte um vale-presente." },
    { layout: "medio", icon: "__money__", t: "Cartão fidelidade", s: "A cada 10, um grátis." },
  ];
  return (
    <TelaReal>
      <div className="apr-scroll-up px-5 pt-14" style={{ animationDuration: "9s" }}>
        <div className="apr-pop flex flex-col items-center" style={d(0)}>
          <OrbiParticleSphere size={110} colors={cor} className="rounded-full" />
          <p className="mt-4 text-[15px] font-medium text-text-tertiary">Studio Design</p>
          <p className="font-[family-name:var(--font-manrope)] text-[24px] font-semibold tracking-[-0.01em]">O que trouxe você aqui hoje?</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {boxes.map((b, i) => (
            <div key={b.t} className={`apr-pop ${b.layout === "largo" ? "col-span-2" : "col-span-1"}`} style={d(i + 2)}>
              <HomeOptionCardPreview
                layout={b.layout}
                icon={b.icon}
                color={b.color}
                orbiColors={cor}
                title={b.t}
                description={b.s}
                ai={b.ai}
                cupom={b.cupom}
                stars={b.stars}
              />
            </div>
          ))}
        </div>
        <div className="h-24" />
      </div>
    </TelaReal>
  );
}

const VITRINES = {
  cafe: {
    nome: "Café Mirante",
    cor: "#5B3A29",
    fundo: "#F6EFE7",
    itens: [
      { n: "Cappuccino da casa", p: "R$ 14", g: "linear-gradient(135deg,#D9B99B,#8C5A3C)" },
      { n: "Pão de queijo recheado", p: "R$ 9", g: "linear-gradient(135deg,#F3D9A4,#C98A1F)" },
      { n: "Bolo de cenoura", p: "R$ 12", g: "linear-gradient(135deg,#F0A35A,#B85C1E)" },
      { n: "Cold brew 500ml", p: "R$ 16", g: "linear-gradient(135deg,#6B4B3A,#2B1A12)" },
      { n: "Croissant de amêndoas", p: "R$ 13", g: "linear-gradient(135deg,#F5E1C4,#D19A5C)" },
      { n: "Chai latte", p: "R$ 15", g: "linear-gradient(135deg,#E8C9A6,#A86B3C)" },
    ],
  },
  pilates: {
    nome: "Studio Leve",
    cor: "#2F5D50",
    fundo: "#EEF4F0",
    itens: [
      { n: "Aula experimental", p: "Grátis", g: "linear-gradient(135deg,#BFE3D0,#4E9C7C)" },
      { n: "Plano 2x por semana", p: "R$ 290/mês", g: "linear-gradient(135deg,#A8D5C2,#2F7D62)" },
      { n: "Plano 3x por semana", p: "R$ 390/mês", g: "linear-gradient(135deg,#8DC8B0,#1E6A4D)" },
      { n: "Pilates para gestantes", p: "R$ 120/aula", g: "linear-gradient(135deg,#F3D9E1,#C97B94)" },
      { n: "Avaliação postural", p: "R$ 150", g: "linear-gradient(135deg,#D7E9DF,#6FA88F)" },
      { n: "Pacote 10 aulas", p: "R$ 1.100", g: "linear-gradient(135deg,#B8DCCB,#3B8A6C)" },
    ],
  },
  // Paletas reais dos temas do Inspire-se (vitrineThemes.ts)
  moda: {
    nome: "Ateliê Norte",
    cor: "#2E2A26",
    fundo: "#EFE8DC",
    itens: [
      { n: "Vestido linho cru", p: "R$ 389", g: "linear-gradient(135deg,#E6DCCB,#A8927A)" },
      { n: "Camisa oversized", p: "R$ 249", g: "linear-gradient(135deg,#F3EEE6,#C9BBA8)" },
      { n: "Calça alfaiataria", p: "R$ 329", g: "linear-gradient(135deg,#8C7A66,#2E2A26)" },
      { n: "Blazer de lã", p: "R$ 590", g: "linear-gradient(135deg,#C9BBA8,#6B5C4C)" },
      { n: "Lenço de seda", p: "R$ 149", g: "linear-gradient(135deg,#E9DFD0,#B79E82)" },
      { n: "Bolsa couro natural", p: "R$ 720", g: "linear-gradient(135deg,#A8927A,#4E4036)" },
    ],
  },
  doceria: {
    nome: "Doce Mel",
    cor: "#4A3A34",
    fundo: "#F0E6E0",
    itens: [
      { n: "Bolo red velvet", p: "R$ 140", g: "linear-gradient(135deg,#E8B6AE,#C98F84)" },
      { n: "Brigadeiro gourmet", p: "R$ 4,50", g: "linear-gradient(135deg,#8A6A5E,#4A3A34)" },
      { n: "Macarons (6 un.)", p: "R$ 42", g: "linear-gradient(135deg,#F2D9D2,#D8A6A0)" },
      { n: "Torta de limão", p: "R$ 98", g: "linear-gradient(135deg,#F5EBC8,#D8C3AE)" },
      { n: "Cookie de nutella", p: "R$ 12", g: "linear-gradient(135deg,#D8C3AE,#8F6F5C)" },
      { n: "Bolo de aniversário", p: "sob encomenda", g: "linear-gradient(135deg,#F0D6CF,#C98F84)" },
    ],
  },
  arquitetura: {
    nome: "Studio Traço",
    cor: "#2A2926",
    fundo: "#EDEBE7",
    itens: [
      { n: "Projeto residencial", p: "a partir de R$ 8 mil", g: "linear-gradient(135deg,#D9D6CF,#9C8163)" },
      { n: "Reforma de apartamento", p: "sob consulta", g: "linear-gradient(135deg,#B8B5AD,#5E5A54)" },
      { n: "Interiores comerciais", p: "sob consulta", g: "linear-gradient(135deg,#E2DFD8,#B8B5AD)" },
      { n: "Consultoria de 2h", p: "R$ 600", g: "linear-gradient(135deg,#9C8163,#4E4438)" },
      { n: "Projeto de fachada", p: "a partir de R$ 4 mil", g: "linear-gradient(135deg,#CFCBC3,#7A7269)" },
      { n: "Acompanhamento de obra", p: "mensal", g: "linear-gradient(135deg,#B7A58C,#2A2926)" },
    ],
  },
};


function CenaVitrine({ tema }: { tema: keyof typeof VITRINES }) {
  const v = VITRINES[tema];
  return (
    <div className="flex h-full flex-col" style={{ background: v.fundo }}>
      <div className="px-4 pt-11 pb-3">
        <p className="text-[11px] uppercase tracking-wide" style={{ color: v.cor, opacity: 0.7 }}>Vitrine</p>
        <p className="font-[family-name:var(--font-manrope)] text-[19px] font-semibold tracking-[-0.01em]" style={{ color: v.cor }}>{v.nome}</p>
      </div>
      <div className="relative flex-1 overflow-hidden px-4">
        <div className="apr-scroll-up grid grid-cols-2 gap-2.5">
          {v.itens.map((it, i) => (
            <div key={it.n} style={d(i)} className="apr-pop overflow-hidden rounded-[16px] bg-white shadow-[0_4px_14px_rgba(17,19,24,0.08)]">
              <div className="aspect-square w-full" style={{ background: it.g }} />
              <div className="px-2.5 py-2">
                <p className="truncate text-[11.5px] font-semibold leading-tight text-on-background">{it.n}</p>
                <p className="text-[11px]" style={{ color: v.cor }}>{it.p}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Rola o conteúdo até o fim, devagar, medindo a altura real (não um
 * percentual fixo), então nunca corta o começo nem sobra vazio embaixo. */
function ScrollLento({ children, dur = 7.5 }: { children: ReactNode; dur?: number }) {
  const fora = useRef<HTMLDivElement>(null);
  const dentro = useRef<HTMLDivElement>(null);
  const [ate, setAte] = useState(0);
  useEffect(() => {
    const medir = () => {
      const f = fora.current, d = dentro.current;
      if (!f || !d) return;
      setAte(Math.min(0, f.clientHeight - d.scrollHeight));
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (fora.current) ro.observe(fora.current);
    if (dentro.current) ro.observe(dentro.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={fora} className="h-full w-full overflow-hidden">
      <div ref={dentro} className="apr-scroll-to" style={{ "--apr-to": `${ate}px`, animationDuration: `${dur}s` } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}

/** Vitrine com as fotos reais do Inspire-se, na mesma grade sem buraco e no
 * mesmo visual (faixa branca ou nome sobre a foto) que a pessoa vai ver lá. */
function CenaVitrineFotos({ temaId, nome, photos, titleStyle }: { temaId: string; nome: string; photos: ThemePhoto[]; titleStyle: "faixa" | "sobre" }) {
  const tema = VITRINE_THEMES.find((t) => t.id === temaId);
  const fundo = tema?.bg ?? "#F7F7F4";
  const contraste = tema?.colors[1]?.hex ?? "#111318";
  const suave = tema?.colors[3]?.hex ?? "#E5E5E5";
  const objPos = tema?.objectPosition ?? "center";
  const fotos = photos.slice(0, 9);
  const sizes = tamanhosSemBuraco(fotos.length, { semAlto: titleStyle === "faixa" });
  const ratio = { destaque: "aspect-[16/9]", largo: "aspect-[1920/830]", medio: "aspect-square", alto: "aspect-[4/5]" } as const;
  return (
    <TelaReal>
      <div className="flex h-full flex-col" style={{ background: fundo }}>
        <div className="px-5 pt-14 pb-4">
          <p className="text-[12px] uppercase tracking-wide" style={{ color: contraste, opacity: 0.6 }}>Vitrine</p>
          <p className="font-[family-name:var(--font-manrope)] text-[26px] font-semibold tracking-[-0.01em]" style={{ color: contraste }}>{nome}</p>
        </div>
        <div className="min-h-0 flex-1 px-5">
          <ScrollLento>
            <div className="grid grid-cols-2 gap-3 pb-6">
              {fotos.map((f, i) => {
                const size = sizes[i];
                const span = size === "destaque" || size === "largo" ? "col-span-2" : size === "alto" && titleStyle === "sobre" ? "col-span-1 row-span-2" : "col-span-1";
                const title = f.title?.trim();
                const price = f.price?.trim();
                if (titleStyle === "faixa") {
                  const med = size === "medio";
                  return (
                    <div key={i} style={d(i)} className={`apr-pop overflow-hidden rounded-[24px] bg-white shadow-[0_2px_14px_rgba(17,19,24,0.06)] ${span}`}>
                      <div className={`relative w-full ${ratio[size]}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.url} alt={title || ""} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: objPos }} />
                      </div>
                      <div className={med ? "h-[60px] px-3 py-2.5" : "h-[70px] px-4 py-3"}>
                        <p className={`truncate font-[family-name:var(--font-manrope)] font-medium leading-tight text-on-background ${med ? "text-[14px]" : "text-[17px]"}`}>{title || "\u00a0"}</p>
                        <p className={`mt-0.5 truncate font-[family-name:var(--font-manrope)] font-medium text-text-secondary ${med ? "text-[13px]" : "text-[15px]"}`}>{price || "\u00a0"}</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ ...d(i), backgroundColor: suave }} className={`apr-pop relative overflow-hidden rounded-[24px] ${span} ${ratio[size]}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={title || ""} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: objPos }} />
                    {title && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <p className="text-[14px] font-semibold leading-tight text-white">{title}</p>
                        {price && <p className="text-[12px] text-white/85">{price}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollLento>
        </div>
      </div>
    </TelaReal>
  );
}

/** Página de detalhe do item, no mesmo layout de verdade da ProductView:
 * carrossel de fotos girando de verdade, marca, título, preço, selos de
 * diferenciais rápidos, a lista completa de diferenciais e os botões de
 * contato. Reaproveita fotos reais do Inspire-se quando existem, senão
 * cai num degradê no lugar da imagem. O botão de IA aqui diz "Falar com a
 * IA da marca" só nesta apresentação (no produto de verdade continua
 * "Falar com a Orbi", já que é assim que a pessoa vai conhecer a marca). */
function CenaProdutoDetalhe({ fotos }: { fotos: ThemePhoto[] }) {
  const [ativo, setAtivo] = useState(0);
  useEffect(() => {
    if (fotos.length <= 1) return;
    const iv = window.setInterval(() => setAtivo((a) => (a + 1) % fotos.length), 2600);
    return () => window.clearInterval(iv);
  }, [fotos.length]);
  const titulo = fotos[0]?.title || "Living Panorâmico Integrado";
  const selos = ["Sob medida", "Entrega em 45 dias", "Garantia de 2 anos"];
  const diferenciais = [
    "Vidro do piso ao teto, com vista panorâmica",
    "Marcenaria sob medida em madeira nobre",
    "Projeto de iluminação e automação inclusos",
  ];
  return (
    <TelaReal>
      <ScrollLento dur={10.5}>
        <div className="flex min-h-full flex-col bg-background-main pb-7">
          <div className="apr-pop flex items-center px-4 pt-4" style={d(0)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[16px]">←</div>
          </div>
          <div className="apr-pop px-4 pt-3" style={d(1)}>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[22px] bg-surface-soft">
              {fotos.length > 0 ? (
                fotos.map((f, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={f.url}
                    src={f.url}
                    alt={f.title || titulo}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === ativo ? "opacity-100" : "opacity-0"}`}
                  />
                ))
              ) : (
                <div className="h-full w-full" style={{ background: "linear-gradient(135deg,#CFCBC3,#5B4B3A)" }} />
              )}
            </div>
            {fotos.length > 1 && (
              <div className="mt-3 flex justify-center gap-1.5">
                {fotos.map((f, i) => (
                  <span key={f.url} className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${i === ativo ? "bg-on-background" : "bg-on-background/25"}`} />
                ))}
              </div>
            )}
          </div>
          <div className="px-6 pt-5">
            <p className="apr-pop text-[12px] uppercase tracking-wide text-text-tertiary" style={d(2)}>Studio Design</p>
            <h1 className="apr-pop mt-1 font-[family-name:var(--font-manrope)] text-[22px] font-medium leading-tight" style={d(2.5)}>{titulo}</h1>
            <p className="apr-pop mt-2 font-[family-name:var(--font-manrope)] text-[18px] font-medium" style={d(3)}>Sob consulta</p>

            <div className="apr-pop mt-3 flex flex-wrap gap-1.5" style={d(3.5)}>
              {selos.map((selo) => (
                <span key={selo} className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-medium text-text-secondary">{selo}</span>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {diferenciais.map((diferencial, i) => (
                <div key={diferencial} className="apr-pop flex items-start gap-2" style={d(4.5 + i * 0.6)}>
                  <span className="mt-[1px]">
                    <CheckTag cor="#5B4B3A" />
                  </span>
                  <p className="text-[13px] leading-snug text-text-secondary">{diferencial}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2.5">
              <div className="apr-pop rounded-full orbi-gradient py-3 text-center text-[13.5px] font-medium text-on-background" style={d(7)}>
                ✦ Falar com a IA da marca
              </div>
              <div className="apr-pop rounded-full bg-button-primary py-3 text-center text-[13.5px] font-medium text-white" style={d(7.5)}>
                Ver no site ↗
              </div>
              <div className="apr-pop rounded-full border border-divider py-3 text-center text-[13.5px] font-medium" style={d(8)}>
                WhatsApp
              </div>
            </div>
          </div>
        </div>
      </ScrollLento>
    </TelaReal>
  );
}

function CenaChat() {
  const [numero, setNumero] = useState("");
  const alvo = "(15) 99812-3456";
  useEffect(() => {
    let i = 0;
    let intervalo: number | undefined;
    const inicio = window.setTimeout(() => {
      intervalo = window.setInterval(() => {
        i++;
        setNumero(alvo.slice(0, i));
        if (i >= alvo.length) window.clearInterval(intervalo);
      }, 45);
    }, 3300); // espera a bolha aparecer (pop-in termina por volta de 3,2s)
    return () => { window.clearTimeout(inicio); window.clearInterval(intervalo); };
  }, []);
  return (
    <TelaReal>
      <ScrollLento dur={13.5}>
        <div className="relative flex min-h-full flex-col overflow-hidden bg-background-main px-4 pt-12 pb-8">
          {/* mancha de luz decorativa, dá profundidade ao topo do chat */}
          <div
            aria-hidden
            className="apr-blob pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
            style={{ background: "linear-gradient(135deg, var(--orbi-gradient-start), var(--orbi-gradient-end))" }}
          />

          <div className="apr-pop relative flex items-center gap-2.5" style={d(0)}>
            <div className="relative">
              <OrbiParticleSphere size={36} className="rounded-full" />
              <span className="apr-online-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#25D366]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-tight">Sua IA</p>
              <p className="text-[11px] text-text-tertiary">IA do Café Mirante · online agora</p>
            </div>
          </div>
          <div className="relative mt-4 flex flex-col gap-2.5">
            <Bolha lado="dir" delay={2} check checkDelay={3.6}>Vocês têm opção sem lactose?</Bolha>
            <Digitando delay={4} />
            <Bolha lado="esq" delay={7}>
              Temos sim! O cappuccino e o chai latte saem com leite de aveia sem custo extra. Quer que eu separe um pra você retirar?
            </Bolha>
            <div className="apr-pop apr-card-shine ml-1 flex items-center gap-3 rounded-[16px] bg-surface-white p-2.5 shadow-[0_6px_20px_rgba(17,19,24,0.1)] ring-1 ring-black/5" style={d(10)}>
              <FotoLatte />
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold leading-tight">Chai latte, aveia</p>
                <p className="mt-0.5 text-[11.5px] text-text-secondary">R$ 15 · pronto em 5 min</p>
              </div>
            </div>
            <Bolha lado="dir" delay={12} check checkDelay={13.6}>Quero sim!</Bolha>
            <Digitando delay={14} />
            <Bolha lado="esq" delay={16.5}>
              Perfeito! Me confirma seu WhatsApp que eu já deixo separado e aviso assim que tiver pronto.
            </Bolha>

            <div className="apr-pop ml-1 flex items-center gap-2 rounded-[14px] border border-divider bg-surface-white px-3 py-2.5 shadow-[0_2px_10px_rgba(17,19,24,0.04)]" style={d(19)}>
              <span className="text-[15px]">📱</span>
              <span className="min-w-[124px] text-[13px] tabular-nums text-on-background">
                {numero}
                <span className="apr-caret">|</span>
              </span>
            </div>

            <Bolha lado="esq" delay={22}>Show, já te aviso por aqui. Obrigada! 🎉</Bolha>

            <button
              type="button"
              className="apr-pop apr-press mt-1 flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 text-[13.5px] font-semibold text-white shadow-[0_6px_18px_rgba(37,211,102,0.35)]"
              style={d(24.5)}
            >
              <span aria-hidden>💬</span> Continuar no WhatsApp
            </button>

            <div className="apr-badge-pop mt-2 flex items-center gap-2 self-start rounded-full bg-[#E4F7EA] px-3 py-1.5" style={d(27)}>
              <span className="text-[12px] font-semibold text-[#1F7A45]">✓ Novo lead salvo em Conversas</span>
            </div>
          </div>
        </div>
      </ScrollLento>
    </TelaReal>
  );
}

/** Bolinha de check colorida (cor do slide), usada nos destaques do
 * cabeçalho de cada tela pra deixar a leitura rápida, tipo checklist. */
function CheckTag({ cor }: { cor: string }) {
  return (
    <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full" style={{ background: cor }}>
      <svg viewBox="0 0 12 12" width="9" height="9" fill="none">
        <path d="M2.4 6.2 L5 8.8 L9.6 3.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Bolha({
  lado,
  delay,
  children,
  check,
  checkDelay,
}: {
  lado: "esq" | "dir";
  delay: number;
  children: ReactNode;
  check?: boolean;
  checkDelay?: number;
}) {
  return (
    <div
      style={d(delay)}
      className={`apr-pop flex max-w-[86%] items-end gap-1.5 rounded-[16px] px-3 py-2 text-[12.5px] leading-snug ${
        lado === "dir" ? "self-end rounded-br-[6px] bg-on-background text-white" : "self-start rounded-bl-[6px] bg-surface-white text-on-background shadow-[0_4px_14px_rgba(17,19,24,0.06)]"
      }`}
    >
      <span>{children}</span>
      {check && (
        <span className="apr-check-in shrink-0 text-[11px] leading-none text-[#6EE7D8]" style={checkDelay ? d(checkDelay) : undefined}>
          ✓✓
        </span>
      )}
    </div>
  );
}

function Digitando({ delay }: { delay: number }) {
  return (
    <div style={d(delay)} className="apr-pop flex w-14 items-center justify-center gap-1 self-start rounded-[16px] rounded-bl-[6px] bg-surface-white px-3 py-2.5 shadow-[0_4px_14px_rgba(17,19,24,0.06)]">
      {[0, 1, 2].map((i) => (
        <span key={i} className="apr-dot h-1.5 w-1.5 rounded-full bg-text-tertiary" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  );
}

/** Fotinho real do latte pro card de produto da CenaChat, no lugar do
 * ícone ilustrado — fica mais claro que é o produto de verdade sendo
 * indicado, não um placeholder genérico. */
function FotoLatte() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/chai-latte.webp" alt="Chai latte, aveia" className="h-16 w-16 shrink-0 rounded-[14px] object-cover" />
  );
}

/** Pulse com o design exato do painel: os mesmos componentes da página
 * real (TaxaConversao, PulseDetails, PulseAudience) com dados de exemplo,
 * na largura real, rolando pra baixo com cada bloco entrando em sequência
 * e o gráfico se desenhando no fim. */
function CenaPulse() {
  const cor = ["#B7F34A", "#6EE7D8"];
  const serie = [12, 18, 15, 26, 31, 28, 44, 39, 52, 61, 58, 74, 69, 88];
  const w = 320, h = 90, max = Math.max(...serie), pts = serie.length - 1;
  const path = serie.map((v, i) => `${i === 0 ? "M" : "L"}${((i / pts) * w).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(" ");
  const labels = ["4/9", "", "6/9", "", "8/9", "", "10/9", "", "12/9", "", "14/9", "", "16/9", "17/9"];
  return (
    <TelaReal>
      <ScrollLento dur={12}>
        <div className="flex flex-col px-5 pt-12 pb-8">
          <p className="apr-pop mt-2 text-center text-[13px] uppercase tracking-wide text-text-tertiary" style={d(0)}>Orbi Pulse</p>

          <div className="apr-pop" style={d(1)}>
            <TaxaConversao taxa={68} visitas={1240} totalCliques={843} businessId="apresentacao" orbiColors={cor} />
          </div>

          <p className="apr-pop mt-6 text-[12px] uppercase tracking-wide text-text-tertiary" style={d(4)}>Período</p>
          <div className="apr-pop mt-2 flex gap-2" style={d(4)}>
            {["7 dias", "30 dias", "90 dias", "Este ano"].map((p, i) => (
              <span key={p} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${i === 1 ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{p}</span>
            ))}
          </div>

          <div className="apr-pop mt-4 flex items-center justify-between rounded-[22px] bg-surface-soft px-5 py-4" style={d(5)}>
            <span className="text-[14px] text-text-secondary">Visitas</span>
            <span className="font-[family-name:var(--font-manrope)] text-[22px] font-medium">1.240</span>
          </div>

          <div className="apr-pop" style={d(6)}>
            <PulseDetails
              porTipo={{ whatsapp: 312, produto: 268, zara: 141, categoria: 77, link: 45 }}
              porTipoItem={{}}
              itemMap={{}}
              topItems={[]}
              paginas={[]}
              slug="studio-design"
            />
          </div>

          <div className="apr-pop" style={d(8)}>
            <PulseAudience
              origens={[
                { nome: "Instagram", count: 612 },
                { nome: "WhatsApp", count: 437 },
                { nome: "Google", count: 118 },
                { nome: "Link direto", count: 73 },
              ]}
              dispositivos={[
                { nome: "Celular", count: 1104 },
                { nome: "Computador", count: 136 },
              ]}
              totalSessoes={1240}
            />
          </div>

          <div className="apr-pop mt-8 rounded-[28px] border border-divider bg-surface-white p-6" style={d(10)}>
            <p className="text-[14px] text-text-secondary">Últimos 14 dias</p>
            <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 w-full overflow-visible">
              <path d={path} pathLength={1} fill="none" stroke="var(--on-background)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="apr-draw" />
            </svg>
            <div className="mt-3 flex justify-between text-[11px] text-text-tertiary">
              {labels.map((l, i) => <span key={i}>{l}</span>)}
            </div>
          </div>

          <div className="apr-pop orbi-card-light mt-4 rounded-[24px] p-5" style={d(12)}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">✦ Orbi Insights</p>
            <p className="mt-1.5 font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight">Instagram traz, mas poucos compram</p>
            <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">Crie um voucher só pra quem vem de lá e meça em 7 dias.</p>
          </div>
        </div>
      </ScrollLento>
    </TelaReal>
  );
}

function CenaVouchers() {
  const [restantes, setRestantes] = useState(12);
  useEffect(() => {
    const t = window.setTimeout(() => setRestantes(11), 3400);
    return () => window.clearTimeout(t);
  }, []);
  const resgatado = restantes < 12;
  const outros = [
    { t: "Leve 2, pague 1 no brownie", cod: "DUPLO", cor: "#B45309" },
    { t: "Frete grátis acima de R$ 80", cod: "FRETE80", cor: "#2F63C9" },
  ];
  return (
    <TelaReal>
      <ScrollLento dur={8.5}>
        <div className="flex flex-col px-4 pt-11 pb-7">
          <p className="apr-pop text-[11px] uppercase tracking-wide text-text-tertiary" style={d(0)}>Vouchers</p>
          <div className="apr-pop cupom-box mt-3 rounded-[20px] p-4 text-white" style={d(1)}>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/80">Só hoje · {restantes} restantes</p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-[24px] font-semibold leading-tight">20% no cappuccino</p>
            <p className="mt-1 text-[12px] text-white/85">Apresente no balcão e pronto.</p>
            <div className="mt-3 flex items-center justify-between rounded-[14px] bg-white/15 px-3 py-2">
              <span className="text-[12px] font-semibold tracking-widest">MIRANTE20</span>
              <span className="text-[11px] text-white/80">válido até 23h</span>
            </div>
            <div className="mt-3 flex items-center gap-[3px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-700 ${i < restantes ? "bg-white/70" : "bg-white/20"}`} />
              ))}
            </div>
          </div>
          <div className="apr-pop mt-3 flex items-center gap-3 rounded-[18px] bg-surface-white p-3.5 shadow-[0_6px_18px_rgba(17,19,24,0.08)]" style={d(4)}>
            <QRFalso />
            <div>
              <p className="text-[12.5px] font-semibold leading-tight">Mostre esse QR</p>
              <p className="mt-0.5 text-[11.5px] text-text-secondary">A loja escaneia e o cupom baixa do estoque.</p>
            </div>
          </div>
          <button type="button" className="apr-pop apr-press mt-3 rounded-full bg-button-primary py-3 text-[14px] font-semibold text-white" style={d(6)}>
            Resgatar agora
          </button>
          <p className={`apr-pop mt-2.5 text-center text-[11.5px] font-medium transition-opacity ${resgatado ? "opacity-100 text-[#1F7A45]" : "opacity-0"}`} style={d(7)}>
            ✓ Resgatado · 11 restantes
          </p>

          <p className="apr-pop mt-5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary" style={d(8)}>Outros cupons ativos</p>
          <div className="mt-2 flex flex-col gap-2">
            {outros.map((o, i) => (
              <div key={o.cod} className="apr-pop flex items-center justify-between rounded-[14px] bg-surface-white px-3 py-2.5 shadow-[0_4px_14px_rgba(17,19,24,0.06)]" style={d(9 + i * 0.8)}>
                <p className="text-[12px] font-medium">{o.t}</p>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: o.cor, background: `${o.cor}17` }}>{o.cod}</span>
              </div>
            ))}
          </div>
        </div>
      </ScrollLento>
    </TelaReal>
  );
}

function QRFalso() {
  // Padrão fixo pra parecer um QR de verdade sem depender de biblioteca.
  const cels = [
    "1111111010111111", "1000001011100001", "1011101000101110", "1011101101101110",
    "1011101011001110", "1000001110100001", "1111111010111111", "0000000101000000",
    "1101011101101011", "0110100011010110", "1010111100111010", "0000000111100011",
    "1111111010101110", "1000001100011010", "1011101011010110", "1011101101100011",
  ];
  return (
    <div className="grid shrink-0 grid-cols-[repeat(16,1fr)] gap-[1px] rounded-[8px] bg-white p-1.5" style={{ width: 66, height: 66 }}>
      {cels.flatMap((row, y) => row.split("").map((c, x) => <span key={`${x}-${y}`} className={c === "1" ? "bg-on-background" : "bg-white"} />))}
    </div>
  );
}

function CenaGift() {
  const [liberado, setLiberado] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLiberado(true), 4600);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <TelaReal>
      <ScrollLento dur={9.5}>
        <div className="flex flex-col px-4 pt-11 pb-7">
          <p className="apr-pop text-[11px] uppercase tracking-wide text-text-tertiary" style={d(0)}>Gift card</p>

          <div className="mt-3 flex flex-col gap-2">
            <Bolha lado="dir" delay={1}>Quero mandar um vale de R$ 100 pro Lucas, presente de aniversário 🎁</Bolha>
            <Bolha lado="esq" delay={3}>Perfeito! Confirmo R$ 100 em nome do Café Mirante, libero assim que o pagamento cair.</Bolha>
            {!liberado && <Digitando delay={4.6} />}
          </div>

          <div className="apr-pop mt-4" style={d(6.5)}>
            <GiftArt
              valorCents={10000}
              paraQuem="Ana"
              deQuem="Lucas"
              mensagem="Feliz aniversário!"
              negocio="Café Mirante"
              codigo="GIFT-7K2M9"
              artUrl={null}
              artTheme="dourado"
              bloqueado={!liberado}
            />
          </div>
          <div className="apr-pop mt-3 rounded-[18px] bg-surface-white p-3.5 shadow-[0_6px_18px_rgba(17,19,24,0.08)]" style={d(7)}>
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-semibold">R$ 100 · Lucas → Ana</p>
              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition-colors duration-500 ${liberado ? "bg-[#E4F7EA] text-[#1F7A45]" : "bg-surface-soft text-text-secondary"}`}>
                {liberado ? "✓ Liberado" : "Aguardando"}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-text-secondary">
              {liberado ? "Pago via WhatsApp. Ana já pode usar." : "Lucas acerta o valor com a loja pelo WhatsApp."}
            </p>
          </div>
        </div>
      </ScrollLento>
    </TelaReal>
  );
}

function CenaConversas() {
  const leads = [
    { n: "Ana Souza", s: "Fechou", c: "#1F7A45", bg: "#E4F7EA", t: "voucher resgatado" },
    { n: "Bruno Lima", s: "Conversando", c: "#2F63C9", bg: "#E6EEFF", t: "perguntou preço" },
    { n: "Carla Dias", s: "Novo", c: "#B0309E", bg: "#FBE7F6", t: "entrou pelo Instagram" },
    { n: "Diego Reis", s: "Esfriou", c: "#B45309", bg: "#FFF1DC", t: "12 dias sem voltar" },
  ];
  const resumo = [
    { label: "Novos", valor: 6, cor: "#B0309E" },
    { label: "Conversando", valor: 4, cor: "#2F63C9" },
    { label: "Fecharam", valor: 9, cor: "#1F7A45" },
  ];
  return (
    <TelaReal>
      <ScrollLento dur={9}>
        <div className="flex flex-col px-4 pt-11 pb-7">
          <p className="apr-pop text-[11px] uppercase tracking-wide text-text-tertiary" style={d(0)}>Conversas</p>

          <div className="apr-pop mt-3 grid grid-cols-3 gap-2" style={d(0.6)}>
            {resumo.map((r) => (
              <div key={r.label} className="rounded-[14px] bg-surface-white px-2 py-2.5 text-center shadow-[0_4px_14px_rgba(17,19,24,0.06)]">
                <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold leading-none" style={{ color: r.cor }}>{r.valor}</p>
                <p className="mt-1 text-[9.5px] leading-tight text-text-tertiary">{r.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {leads.map((l, i) => (
              <div key={l.n} style={d(1.4 + i * 0.7)} className="apr-pop flex items-center justify-between rounded-[16px] bg-surface-white px-3 py-2.5 shadow-[0_4px_14px_rgba(17,19,24,0.06)]">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold leading-tight">{l.n}</p>
                  <p className="text-[11px] text-text-secondary">{l.t}</p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: l.c, background: l.bg }}>{l.s}</span>
              </div>
            ))}
          </div>
          <div className="apr-pop orbi-card-light mt-3 rounded-[18px] p-3.5" style={d(5)}>
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-secondary">✦ Orbi escreveu pro Diego</p>
            <p className="mt-1 text-[12px] leading-snug">Oi Diego! Sentimos sua falta no Café Mirante. Essa semana tem chai latte novo, e um cupom de 20% te esperando ☕</p>
          </div>
          <button type="button" className="apr-pop mt-2.5 rounded-full bg-[#25D366] py-2.5 text-[13px] font-semibold text-white" style={d(6)}>
            Mandar pelo WhatsApp
          </button>
        </div>
      </ScrollLento>
    </TelaReal>
  );
}

function CenaFinal({
  href,
  label,
  rotulo,
  titulo,
  checks,
}: {
  href: string;
  label: string;
  rotulo: string;
  titulo: string;
  checks: string[];
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <p className="apr-pop font-[family-name:var(--font-manrope)] text-[17px] font-semibold tracking-[-0.01em] text-on-background" style={d(0)}>
        orbibox
      </p>

      <div className="apr-pop apr-float mt-6" style={d(1.5)}>
        <OrbiParticleSphere size={128} vivid className="rounded-full" />
      </div>

      <span className="apr-pop mt-7 text-[11px] font-bold uppercase tracking-[0.14em] text-text-tertiary" style={d(4)}>
        {rotulo}
      </span>
      <h2 className="apr-pop mt-2 max-w-[300px] font-[family-name:var(--font-manrope)] text-[27px] font-bold leading-[1.15] tracking-[-0.02em] text-on-background" style={d(5)}>
        {titulo}
      </h2>

      <div className="mt-6 flex flex-col items-start gap-2.5 self-center">
        {checks.map((c, i) => (
          <div key={c} className="apr-pop flex items-center gap-2.5" style={d(7 + i * 1)}>
            <CheckTag cor="#1F7A45" />
            <span className="text-left text-[14px] font-medium text-text-secondary">{c}</span>
          </div>
        ))}
      </div>

      <Link
        href={href}
        className="apr-pop apr-press orbi-gradient mt-8 flex items-center gap-2 rounded-full px-8 py-4 text-[16px] font-semibold text-on-background shadow-[0_10px_30px_rgba(110,231,216,0.35)]"
        style={d(10)}
      >
        {label} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
