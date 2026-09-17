"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { GiftArt } from "@/components/mobile/GiftArt";
import { HomeOptionCardPreview } from "@/components/orbi/HomeOptionCard";
import { VITRINE_THEMES, type ThemePhoto } from "@/lib/vitrineThemes";
import { tamanhosSemBuraco } from "@/lib/inspireGrid";

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
                  style={{ animationDuration: `${AUTO_MS}ms` }}
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
            <div className="mb-3 text-center">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{s.rotulo}</p>
              <h2 className="mt-1 font-[family-name:var(--font-manrope)] text-[23px] font-semibold leading-tight tracking-[-0.02em] text-on-background">
                {s.titulo}
              </h2>
              <p className="mx-auto mt-1 max-w-[300px] text-[13px] leading-snug text-text-secondary">{s.frase}</p>
            </div>
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
        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-background-main">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Roteiro dos slides ---------- */

type Slide = { rotulo: string; titulo: string; frase: string; cena?: () => ReactNode; livre?: ReactNode };

/** Slide de vitrine com as fotos reais do tema do Inspire-se. Se o tema
 * ainda não tiver fotos cadastradas, cai na versão ilustrada (gradientes). */
function vitrineSlide(inspire: InspireParaApresentacao, temaId: string, nome: string, titulo: string, frase: string): Slide {
  const fotos = inspire[temaId]?.photos ?? [];
  const fallback: Record<string, keyof typeof VITRINES> = { restaurante: "cafe", fitness: "pilates", moda: "moda", doceria: "doceria", arquitetura: "arquitetura" };
  const Cena = fotos.length >= 4
    ? function CenaVitrineReal() { return <CenaVitrineFotos temaId={temaId} nome={nome} photos={fotos} titleStyle={inspire[temaId].titleStyle} />; }
    : function CenaVitrineIlustrada() { return <CenaVitrine tema={fallback[temaId] ?? "cafe"} />; };
  return { rotulo: "Vitrine", titulo, frase, cena: Cena };
}

function montarSlides(finalHref: string, finalLabel: string, inspire: InspireParaApresentacao): Slide[] {
  return [
    {
      rotulo: "Orbibox",
      titulo: "Um link que se adapta a quem entra",
      frase: "A pessoa chega, diz o que quer, e o seu negócio responde na hora.",
      cena: CenaInicio,
    },
    vitrineSlide(inspire, "doceria", "Doce Ateliê", "Delicada, pra doceria", "Encomenda, cardápio do dia, bolo de aniversário. Tudo num toque."),
    vitrineSlide(inspire, "fitness", "Fit Store", "Direta, pra loja", "Produtos, fotos e preços que a Orbi já conhece de cor."),
    vitrineSlide(inspire, "arquitetura", "Studio Design", "Sóbria, pra serviço", "Portfólio, serviços e um jeito fácil de pedir orçamento."),
    {
      rotulo: "IA pessoal",
      titulo: "Uma Orbi que responde por você",
      frase: "Tira dúvida, indica produto e fecha venda, 24 horas por dia.",
      cena: CenaChat,
    },
    {
      rotulo: "Pulse",
      titulo: "Saiba de onde vem cada cliente",
      frase: "Quantos entraram, de onde vieram e o que fizeram. E o que fazer a seguir.",
      cena: CenaPulse,
    },
    {
      rotulo: "Vouchers",
      titulo: "Ofertas que trazem gente hoje",
      frase: "Cupom com estoque controlado, QR pra resgatar no balcão.",
      cena: CenaVouchers,
    },
    {
      rotulo: "Gift",
      titulo: "Deixe seus clientes presentearem",
      frase: "Vale-presente com a sua cara, liberado pelo WhatsApp.",
      cena: CenaGift,
    },
    {
      rotulo: "Conversas",
      titulo: "Cada contato vira um lead",
      frase: "Quem chegou, quem esfriou, quem pediu aviso. A Orbi escreve, você manda.",
      cena: CenaConversas,
    },
    {
      rotulo: "Comece agora",
      titulo: "Seu Orbibox em 5 minutos",
      frase: "3 dias grátis. Cancela quando quiser.",
      livre: <CenaFinal href={finalHref} label={finalLabel} />,
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
      <div className="apr-scroll-up px-5 pt-14" style={{ animationDuration: "8s" }}>
        <div className="apr-pop flex flex-col items-center" style={d(0)}>
          <OrbiParticleSphere size={110} colors={cor} className="rounded-full" />
          <p className="mt-4 text-[15px] text-text-secondary">O que trouxe você aqui hoje?</p>
          <p className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold tracking-[-0.01em]">Studio Design</p>
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
function ScrollLento({ children }: { children: ReactNode }) {
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
      <div ref={dentro} className="apr-scroll-to" style={{ "--apr-to": `${ate}px` } as CSSProperties}>
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

function CenaChat() {
  return (
    <div className="flex h-full flex-col px-3.5 pt-11">
      <div className="apr-pop flex items-center gap-2.5" style={d(0)}>
        <OrbiParticleSphere size={34} className="rounded-full" />
        <div>
          <p className="text-[13px] font-semibold leading-tight">Orbi</p>
          <p className="text-[10.5px] text-text-tertiary">IA do Café Mirante</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        <Bolha lado="dir" delay={2}>Vocês têm opção sem lactose?</Bolha>
        <Digitando delay={4} />
        <Bolha lado="esq" delay={7}>
          Temos sim! O cappuccino e o chai latte saem com leite de aveia sem custo extra. Quer que eu separe um pra você retirar?
        </Bolha>
        <div className="apr-pop ml-1 flex items-center gap-2.5 rounded-[14px] bg-surface-white p-2 shadow-[0_4px_14px_rgba(17,19,24,0.08)]" style={d(10)}>
          <div className="h-11 w-11 shrink-0 rounded-[10px]" style={{ background: "linear-gradient(135deg,#E8C9A6,#A86B3C)" }} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight">Chai latte, aveia</p>
            <p className="text-[11px] text-text-secondary">R$ 15 · pronto em 5 min</p>
          </div>
        </div>
        <Bolha lado="dir" delay={12}>Quero sim!</Bolha>
      </div>
    </div>
  );
}

function Bolha({ lado, delay, children }: { lado: "esq" | "dir"; delay: number; children: ReactNode }) {
  return (
    <div
      style={d(delay)}
      className={`apr-pop max-w-[86%] rounded-[16px] px-3 py-2 text-[12.5px] leading-snug ${
        lado === "dir" ? "self-end rounded-br-[6px] bg-on-background text-white" : "self-start rounded-bl-[6px] bg-surface-white text-on-background shadow-[0_4px_14px_rgba(17,19,24,0.06)]"
      }`}
    >
      {children}
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

function CenaPulse() {
  const alvo = 68;
  const raio = 44;
  const circ = 2 * Math.PI * raio;
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0 - 300) / 1600);
      if (p >= 0) setN(Math.round(alvo * (1 - Math.pow(1 - Math.max(0, p), 3))));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, []);
  const fontes = [
    { n: "Instagram", v: 62, c: "#B0309E" },
    { n: "WhatsApp", v: 44, c: "#1EA66B" },
    { n: "Google", v: 28, c: "#2F63C9" },
  ];
  return (
    <div className="flex h-full flex-col px-4 pt-11">
      <p className="apr-pop text-[11px] uppercase tracking-wide text-text-tertiary" style={d(0)}>Pulse · 30 dias</p>
      <div className="apr-pop mt-3 flex items-center gap-3 rounded-[18px] bg-surface-white p-3.5 shadow-[0_6px_18px_rgba(17,19,24,0.08)]" style={d(1)}>
        <svg width="104" height="104" viewBox="0 0 104 104" className="shrink-0 -rotate-90">
          <circle cx="52" cy="52" r={raio} stroke="rgba(17,19,24,0.08)" strokeWidth="9" fill="none" />
          <circle
            cx="52" cy="52" r={raio} strokeWidth="9" fill="none" strokeLinecap="round"
            stroke="url(#aprPulseGrad)"
            strokeDasharray={circ}
            strokeDashoffset={circ}
            className="apr-ring"
            style={{ "--apr-ring-to": `${circ * (1 - alvo / 100)}` } as CSSProperties}
          />
          <defs>
            <linearGradient id="aprPulseGrad" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#B7F34A" />
              <stop offset="1" stopColor="#6EE7D8" />
            </linearGradient>
          </defs>
        </svg>
        <div>
          <p className="font-[family-name:var(--font-manrope)] text-[34px] font-medium leading-none tabular-nums">{n}%</p>
          <p className="mt-1 text-[11.5px] text-text-secondary">de quem entra, age</p>
        </div>
      </div>
      <div className="apr-pop mt-3 rounded-[18px] bg-surface-white p-3.5 shadow-[0_6px_18px_rgba(17,19,24,0.08)]" style={d(3)}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">De onde vêm</p>
        <div className="mt-2 flex flex-col gap-2">
          {fontes.map((f, i) => (
            <div key={f.n}>
              <div className="flex justify-between text-[11.5px]"><span>{f.n}</span><span className="tabular-nums text-text-secondary">{f.v}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-soft">
                <div className="apr-grow-x h-full rounded-full" style={{ width: `${f.v}%`, background: f.c, animationDelay: `${0.6 + i * 0.2}s` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="apr-pop orbi-card-light mt-3 rounded-[18px] p-3.5" style={d(8)}>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-secondary">✦ Orbi Insights</p>
        <p className="mt-1 text-[12.5px] font-semibold leading-tight">Instagram traz, mas poucos compram</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-text-secondary">Crie um voucher só pra quem vem de lá.</p>
      </div>
    </div>
  );
}

function CenaVouchers() {
  return (
    <div className="flex h-full flex-col px-4 pt-11">
      <p className="apr-pop text-[11px] uppercase tracking-wide text-text-tertiary" style={d(0)}>Vouchers</p>
      <div className="apr-pop cupom-box mt-3 rounded-[20px] p-4 text-white" style={d(1)}>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-white/80">Só hoje · 12 restantes</p>
        <p className="mt-1 font-[family-name:var(--font-manrope)] text-[24px] font-semibold leading-tight">20% no cappuccino</p>
        <p className="mt-1 text-[12px] text-white/85">Apresente no balcão e pronto.</p>
        <div className="mt-3 flex items-center justify-between rounded-[14px] bg-white/15 px-3 py-2">
          <span className="text-[12px] font-semibold tracking-widest">MIRANTE20</span>
          <span className="text-[11px] text-white/80">válido até 23h</span>
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
      <p className="apr-pop mt-3 text-center text-[11.5px] text-text-tertiary" style={d(14)}>✓ Resgatado · 11 restantes</p>
    </div>
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
    const t = window.setTimeout(() => setLiberado(true), 2600);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="flex h-full flex-col px-4 pt-11">
      <p className="apr-pop text-[11px] uppercase tracking-wide text-text-tertiary" style={d(0)}>Gift card</p>
      <div className="apr-pop mt-3" style={d(1)}>
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
      <div className="apr-pop mt-3 rounded-[18px] bg-surface-white p-3.5 shadow-[0_6px_18px_rgba(17,19,24,0.08)]" style={d(3)}>
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
  );
}

function CenaConversas() {
  const leads = [
    { n: "Ana Souza", s: "Fechou", c: "#1F7A45", bg: "#E4F7EA", t: "voucher resgatado" },
    { n: "Bruno Lima", s: "Conversando", c: "#2F63C9", bg: "#E6EEFF", t: "perguntou preço" },
    { n: "Carla Dias", s: "Novo", c: "#B0309E", bg: "#FBE7F6", t: "entrou pelo Instagram" },
    { n: "Diego Reis", s: "Esfriou", c: "#B45309", bg: "#FFF1DC", t: "12 dias sem voltar" },
  ];
  return (
    <div className="flex h-full flex-col px-4 pt-11">
      <p className="apr-pop text-[11px] uppercase tracking-wide text-text-tertiary" style={d(0)}>Conversas</p>
      <div className="mt-3 flex flex-col gap-2">
        {leads.map((l, i) => (
          <div key={l.n} style={d(i + 1)} className="apr-pop flex items-center justify-between rounded-[16px] bg-surface-white px-3 py-2.5 shadow-[0_4px_14px_rgba(17,19,24,0.06)]">
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold leading-tight">{l.n}</p>
              <p className="text-[11px] text-text-secondary">{l.t}</p>
            </div>
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: l.c, background: l.bg }}>{l.s}</span>
          </div>
        ))}
      </div>
      <div className="apr-pop orbi-card-light mt-3 rounded-[18px] p-3.5" style={d(7)}>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-secondary">✦ Orbi escreveu pro Diego</p>
        <p className="mt-1 text-[12px] leading-snug">Oi Diego! Sentimos sua falta no Café Mirante. Essa semana tem chai latte novo, e um cupom de 20% te esperando ☕</p>
      </div>
      <button type="button" className="apr-pop mt-2.5 rounded-full bg-[#25D366] py-2.5 text-[13px] font-semibold text-white" style={d(10)}>
        Mandar pelo WhatsApp
      </button>
    </div>
  );
}

function CenaFinal({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <OrbiParticleSphere size={120} vivid className="rounded-full" />
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link href={href} className="orbi-gradient rounded-full px-8 py-4 text-[16px] font-semibold text-on-background shadow-[0_10px_30px_rgba(110,231,216,0.35)]">
          {label} ✦
        </Link>
        <p className="text-[12px] text-text-tertiary">Sem cartão pra começar a montar.</p>
      </div>
    </div>
  );
}
