"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { homeCardShellClass, homeCardShellStyle, HomeOptionCardContent } from "@/components/orbi/HomeOptionCard";

/**
 * As duas telas "mágicas" do onboarding:
 * 1. AnaliseAoVivo: a Orbi conta o que está descobrindo enquanto lê a marca,
 *    as fotos aparecem, a paleta surge e a esfera incorpora as cores da marca.
 * 2. VitrineMontando: a vitrine se monta dentro de um celular, card por card,
 *    com as fotos e cores reais, e no fim diz quanto tempo levou.
 * Tudo que aparece aqui é real (vem da leitura e da análise), nada inventado.
 */

// Foto de qualquer origem: Instagram e Supabase passam pelo otimizador;
// fotos de sites (domínios variados) vão direto.
function Foto({ src, sizes }: { src: string; sizes: string }) {
  if (/(cdninstagram\.com|fbcdn\.net|supabase\.co\/storage)/i.test(src)) {
    return <Image src={src} alt="" fill sizes={sizes} className="object-cover" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />;
}

// ---------------------------------------------------------------------------
// Esfera que troca de cor com transição suave (duas camadas em crossfade).
// ---------------------------------------------------------------------------
export function BrandOrb({ colors, size = 120, brilho = false }: { colors: string[] | null; size?: number; brilho?: boolean }) {
  const ativa = !!colors && colors.length >= 2;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Halo na cor da marca quando ela "incorpora" a identidade. */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-2xl transition-opacity duration-[1600ms]"
        style={{
          opacity: ativa && brilho ? 0.55 : 0,
          background: ativa ? `radial-gradient(circle, ${colors![0]}, ${colors![1]} 60%, transparent 75%)` : undefined,
          transform: "scale(1.35)",
        }}
      />
      <div className={`absolute inset-0 transition-opacity duration-[1600ms] ${ativa ? "opacity-0" : "opacity-100"}`}>
        <OrbiOrb size={size} />
      </div>
      {ativa && (
        <div key={colors!.join(",")} className="orbi-orb-entra absolute inset-0">
          <OrbiOrb size={size} colors={colors} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Análise ao vivo
// ---------------------------------------------------------------------------
export type Descoberta =
  | { status: "pending" }
  | { status: "fail" }
  | { status: "ok"; palavras: number; imagens: string[]; fonte: "site" | "instagram"; host: string };

export type Analise =
  | { status: "pending" }
  | { status: "ok"; voice: string; font: string; paleta: string[]; orbColors: string[] | null };

type Linha = { id: string; texto: string; tipo?: "fotos" | "paleta" | "cores" };

export function AnaliseAoVivo({
  nome,
  alvo,
  descoberta,
  analise,
  onDone,
}: {
  nome: string;
  alvo: string | null;
  descoberta: Descoberta;
  analise: Analise;
  onDone: () => void;
}) {
  const marca = nome.trim() || "sua marca";

  // Linhas liberadas conforme os dados chegam (sempre nesta ordem).
  const linhas = useMemo<Linha[]>(() => {
    const l: Linha[] = [{ id: "abrir", texto: alvo ? `Abrindo ${alvo}…` : `Lendo o que você me contou sobre a ${marca}…` }];
    if (alvo) {
      if (descoberta.status === "pending") return l;
      if (descoberta.status === "ok") {
        l.push({ id: "palavras", texto: `Li ${descoberta.palavras.toLocaleString("pt-BR")} palavras sobre a ${marca}` });
        if (descoberta.imagens.length > 0) {
          l.push({ id: "fotos", texto: `Encontrei ${descoberta.imagens.length} fotos da marca`, tipo: "fotos" });
        }
      } else {
        l.push({ id: "falha", texto: "Não consegui abrir agora, sigo com o que você me contou" });
      }
    }
    if (analise.status === "ok") {
      if (analise.voice) l.push({ id: "voz", texto: `Tom de voz: ${analise.voice}` });
      if (analise.paleta.length > 0) l.push({ id: "paleta", texto: "Paleta da marca", tipo: "paleta" });
      l.push({ id: "cores", texto: `Incorporando as cores da ${marca}…`, tipo: "cores" });
    }
    return l;
  }, [alvo, descoberta, analise, marca]);

  // Revela uma linha por vez, com ritmo, mesmo que os dados cheguem juntos.
  const [reveladas, setReveladas] = useState(1);
  useEffect(() => {
    if (reveladas < linhas.length) {
      const t = setTimeout(() => setReveladas((r) => r + 1), reveladas === 1 ? 1300 : 1900);
      return () => clearTimeout(t);
    }
  }, [reveladas, linhas.length]);

  const visiveis = linhas.slice(0, reveladas);
  const incorporou = visiveis.some((x) => x.tipo === "cores");
  const terminou = analise.status === "ok" && reveladas >= linhas.length;

  // Fim: depois das descobertas, uns segundos só da esfera grande virando a
  // IA da marca, com um anel fino se completando e um check de concluído.
  const [final, setFinal] = useState(false);
  useEffect(() => {
    if (!terminou) return;
    const t = setTimeout(() => setFinal(true), 1800);
    return () => clearTimeout(t);
  }, [terminou]);
  useEffect(() => {
    if (!final) return;
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [final, onDone]);

  const orbColors = incorporou && analise.status === "ok" ? analise.orbColors : null;

  if (final) {
    const cor = orbColors?.[0] ?? "#111318";
    const cor2 = orbColors?.[1] ?? cor;
    const TAM = 196;
    const R = TAM / 2 + 14;
    const C = 2 * Math.PI * R;
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <div className="orbi-final-entra relative" style={{ width: R * 2 + 4, height: R * 2 + 4 }}>
          {/* Halo suave na cor da marca */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${cor}55, ${cor2}33 55%, transparent 72%)` }}
          />
          <div className="absolute" style={{ left: R + 2 - TAM / 2, top: R + 2 - TAM / 2 }}>
            <OrbiOrb size={TAM} colors={orbColors} />
          </div>
          {/* Anel fino se completando */}
          <svg className="absolute inset-0 -rotate-90" width={R * 2 + 4} height={R * 2 + 4} aria-hidden>
            <circle cx={R + 2} cy={R + 2} r={R} fill="none" stroke={cor} strokeOpacity={0.12} strokeWidth={1.5} />
            <circle
              cx={R + 2}
              cy={R + 2}
              r={R}
              fill="none"
              stroke={cor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C}
              className="orbi-anel-completa"
              style={{ ["--anel" as string]: `${C}` }}
            />
          </svg>
          {/* Check de concluído */}
          <span className="orbi-check-entra absolute flex h-8 w-8 items-center justify-center" style={{ right: 16, bottom: 16 }}>
            {/* Halo que pulsa em volta, sem parar */}
            <span className="orbi-check-halo absolute inset-0 rounded-full" style={{ backgroundColor: cor }} />
            <span
              className="orbi-check-bate relative flex h-8 w-8 items-center justify-center rounded-full text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
              style={{ backgroundColor: cor }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </span>
        </div>
        <p className="orbi-final-texto mt-8 font-[family-name:var(--font-manrope)] text-[24px] font-medium tracking-[-0.01em]">
          Sua IA está pronta
        </p>
        <p className="orbi-final-texto mt-1.5 text-[15px] text-text-secondary" style={{ animationDelay: "2.7s" }}>
          Já com a cara da {marca}
        </p>
      </div>
    );
  }
  const imagens = descoberta.status === "ok" ? descoberta.imagens : [];
  const paleta = analise.status === "ok" ? analise.paleta : [];

  return (
    <div className="flex flex-col items-center pb-8 text-center">
      <BrandOrb colors={orbColors} size={150} brilho />
      <p className="mt-7 font-[family-name:var(--font-manrope)] text-[27px] font-medium tracking-[-0.01em]">
        {terminou ? `Essa é a ${marca}` : "Conhecendo sua marca"}
      </p>

      <div className="mt-8 flex w-full max-w-md flex-col gap-5 text-left">
        {visiveis.map((linha, i) => {
          const ultima = i === visiveis.length - 1 && !terminou;
          return (
            <div key={linha.id} className="orbi-linha-entra">
              <div className="flex items-start gap-3">
                <span className={`mt-[9px] h-2 w-2 shrink-0 rounded-full ${ultima ? "animate-pulse bg-orbi-gradient-start" : "bg-on-background"}`} />
                <p className={`text-[17px] leading-snug ${ultima ? "text-on-background" : "text-text-secondary"}`}>{linha.texto}</p>
              </div>

              {linha.tipo === "fotos" && (
                <div className="mt-3 flex gap-2 overflow-hidden pl-5">
                  {imagens.slice(0, 6).map((src, k) => (
                    <div
                      key={`${src}-${k}`}
                      className="orbi-foto-entra relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-2xl bg-surface-soft"
                      style={{ animationDelay: `${k * 220}ms` }}
                    >
                      <Foto src={src} sizes="68px" />
                    </div>
                  ))}
                </div>
              )}

              {linha.tipo === "paleta" && (
                <div className="mt-3 flex gap-2.5 pl-5">
                  {paleta.slice(0, 6).map((hex, k) => (
                    <span
                      key={hex + k}
                      className="orbi-foto-entra h-10 w-10 rounded-full border border-black/5 shadow-sm"
                      style={{ backgroundColor: hex, animationDelay: `${k * 240}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!terminou && reveladas >= linhas.length && (
          <div className="flex gap-1.5 pl-5 pt-1" aria-hidden>
            {[0, 1, 2].map((k) => (
              <span key={k} className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-tertiary" style={{ animationDelay: `${k * 150}ms` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Vitrine montando dentro de um celular
// ---------------------------------------------------------------------------
export type ItemMontado = { title: string; image_url: string | null; bg: string; fg: string };

const ETAPAS = [
  (alvo: string) => `Lendo ${alvo}`,
  () => "Separando produtos e serviços",
  () => "Escolhendo as melhores fotos",
  () => "Escrevendo as descrições",
  (_: string, marca: string) => `Aplicando as cores da ${marca}`,
];

export function VitrineMontando({
  nome,
  alvo,
  orbColors,
  status,
  segundos,
  onContinuar,
}: {
  nome: string;
  alvo: string;
  orbColors: string[] | null;
  status: "pending" | "ok";
  itens: ItemMontado[];
  segundos: number | null;
  onContinuar: () => void;
}) {
  const marca = nome.trim() || "sua marca";

  // Enquanto a importação roda, as etapas avançam (sem passar da última).
  const [etapa, setEtapa] = useState(0);
  useEffect(() => {
    if (status !== "pending" || etapa >= ETAPAS.length - 1) return;
    const t = setTimeout(() => setEtapa((e) => e + 1), 2800);
    return () => clearTimeout(t);
  }, [etapa, status]);

  // Os cards reais não aparecem aqui: uma miniatura nunca faz jus à vitrine
  // de verdade. O celular fica cinza "pensando" e, quando termina, fica fosco
  // com o aviso de pronto. A pessoa vê o resultado real ao abrir a vitrine.
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    if (status !== "ok") return;
    const t = setTimeout(() => setPronto(true), 700);
    return () => clearTimeout(t);
  }, [status]);

  const textoEtapa = status === "ok" ? "Finalizando sua vitrine" : ETAPAS[etapa](alvo, marca);

  return (
    <div className="flex flex-col items-center py-4 text-center">
      {/* Celular */}
      <div className="relative w-[260px] rounded-[40px] bg-on-background p-2.5 shadow-[0_24px_60px_-20px_rgba(17,19,24,0.45)]">
        <div className="relative h-[470px] overflow-hidden rounded-[32px] bg-background-main">
          <div className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-on-background" />
          <div className="flex h-full flex-col px-3 pb-3 pt-10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                <OrbiOrb size={32} colors={orbColors} />
              </div>
              <p className="truncate text-left font-[family-name:var(--font-manrope)] text-[15px] font-semibold">{marca}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 overflow-hidden">
              {[0, 1, 2, 3, 4, 5, 6].map((k) => (
                <div
                  key={k}
                  className={`orbi-shimmer rounded-2xl bg-surface-soft ${k === 0 ? "col-span-2 h-[118px]" : "h-[96px]"}`}
                  style={{ animationDelay: `${k * 140}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Pronto: vidro fosco por cima com o aviso */}
          {pronto && (
            <div className="orbi-fosco-entra absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/45 px-6 backdrop-blur-md">
              <span style={{ animationDelay: "0.15s" }} className="orbi-check-entra flex h-12 w-12 items-center justify-center rounded-full bg-on-background text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <p className="orbi-linha-entra mt-4 font-[family-name:var(--font-manrope)] text-[21px] font-medium leading-tight tracking-[-0.01em]" style={{ animationDelay: "0.35s" }}>
                Sua vitrine está pronta
              </p>
              <p className="orbi-linha-entra mt-1.5 text-[15px] leading-snug text-text-secondary" style={{ animationDelay: "0.6s" }}>
                Visite e edite à vontade.
              </p>
            </div>
          )}
        </div>
      </div>

      {!pronto ? (
        <div className="mt-6 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orbi-gradient-start" />
          <p key={textoEtapa} className="orbi-linha-entra text-[15px] text-text-secondary">
            {textoEtapa}…
          </p>
        </div>
      ) : (
        <>
          {segundos != null && (
            <p className="orbi-linha-entra mt-6 text-[15px] text-text-secondary" style={{ animationDelay: "0.8s" }}>
              Montada em {segundos} segundos
            </p>
          )}
          <button
            onClick={onContinuar}
            className="orbi-linha-entra orbi-gradient mt-5 w-full max-w-sm rounded-full py-3.5 text-[15px] font-medium text-on-background"
            style={{ animationDelay: "1s" }}
          >
            Continuar →
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Essência da marca: resumo em 3 linhas + 3 pontos fortes, editáveis
// ---------------------------------------------------------------------------
export type PontoForte = { icon: string; title: string; description: string };

export function EssenciaDaMarca({
  nome,
  orbColors,
  resumo,
  onResumo,
  pontos,
  onPontos,
  onContinuar,
}: {
  nome: string;
  orbColors: string[] | null;
  resumo: string;
  onResumo: (v: string) => void;
  pontos: PontoForte[];
  onPontos: (v: PontoForte[]) => void;
  onContinuar: () => void;
}) {
  const marca = nome.trim() || "sua marca";
  const cor = orbColors?.[0] ?? "#111318";

  // O resumo aparece como se a Orbi estivesse escrevendo; depois vira editável.
  const [letras, setLetras] = useState(0);
  const digitando = letras < resumo.length;
  useEffect(() => {
    if (!digitando) return;
    const t = setTimeout(() => setLetras((n) => Math.min(resumo.length, n + 3)), 16);
    return () => clearTimeout(t);
  }, [letras, digitando, resumo.length]);

  // Pontos fortes entram um por vez depois do resumo.
  const [cards, setCards] = useState(0);
  useEffect(() => {
    if (digitando || cards >= pontos.length) return;
    const t = setTimeout(() => setCards((c) => c + 1), cards === 0 ? 350 : 700);
    return () => clearTimeout(t);
  }, [digitando, cards, pontos.length]);
  const pronto = !digitando && cards >= pontos.length;

  // Campo cresce com o texto, sem cortar a última linha.
  function crescer(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function editarPonto(i: number, campo: "title" | "description", v: string) {
    onPontos(pontos.map((p, k) => (k === i ? { ...p, [campo]: v } : p)));
  }

  // Tons derivados da cor da marca: um mais fechado pro botão e pro check
  // (cor clara, tipo amarelo, perde contraste no branco) e véus suaves pro fundo.
  const corForte = luminancia(cor) > 0.55 ? misturar(cor, "#000000", 0.4) : cor;
  const corBotao = misturar(corForte, "#000000", 0.28);
  const cor2 = orbColors?.[1] ?? cor;

  return (
    <div className="relative flex flex-col py-2">
      <FundoDaMarca cor={cor} cor2={cor2} />

      <div className="relative z-[1] flex flex-col">
        <div className="flex items-start gap-4">
          <div className="mt-1 h-14 w-14 shrink-0 overflow-hidden rounded-full">
            <OrbiOrb size={56} colors={orbColors} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] text-text-tertiary">A Orbi entendeu assim</p>
            <p className="truncate font-[family-name:var(--font-manrope)] text-[32px] font-semibold leading-tight tracking-[-0.02em] text-on-background">{marca}</p>
            <p className="mt-0.5 text-[15px] text-text-secondary">Revise as informações da sua marca.</p>
          </div>
        </div>

        {/* Sobre o negócio */}
        <div className="orbi-linha-entra relative mt-7 rounded-[24px] border border-white/80 bg-white/70 p-5 shadow-[0_4px_24px_rgba(17,19,24,0.06)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Sobre o negócio</p>
            {!digitando && <BotaoEditar alvo="ess-resumo" />}
          </div>
          {digitando ? (
            <p className="mt-2 min-h-[96px] text-[16.5px] leading-[1.6] text-on-background">
              {resumo.slice(0, letras)}
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse" style={{ backgroundColor: corForte }} />
            </p>
          ) : (
            <textarea
              id="ess-resumo"
              value={resumo}
              onChange={(e) => { onResumo(e.target.value); crescer(e.target); }}
              ref={crescer}
              rows={3}
              maxLength={360}
              className="-mx-1.5 mt-1.5 w-[calc(100%+12px)] resize-none rounded-xl bg-transparent px-1.5 py-0.5 text-[16.5px] leading-[1.6] text-on-background outline-none transition-colors focus:bg-white/80"
            />
          )}
        </div>

        {/* Pontos fortes */}
        {cards > 0 && (
          <div className="orbi-linha-entra mt-8 flex items-baseline justify-between gap-3">
            <p className="font-[family-name:var(--font-manrope)] text-[21px] font-semibold tracking-[-0.01em] text-on-background">Pontos fortes</p>
            <p className="text-[13.5px] text-text-secondary">
              {pontos.length} {pontos.length === 1 ? "diferencial" : "diferenciais"}
            </p>
          </div>
        )}
        <div className="mt-3 flex flex-col gap-3">
          {pontos.slice(0, cards).map((p, i) => (
            <div
              key={i}
              className="orbi-card-cai relative flex items-center gap-4 rounded-[22px] border border-white/80 bg-white/70 py-4 pl-4 pr-12 shadow-[0_4px_24px_rgba(17,19,24,0.06)] backdrop-blur-xl"
            >
              <div className="flex w-10 shrink-0 justify-center">
                <CheckAnimado cor={corForte} />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  id={`ess-ponto-${i}`}
                  value={p.title}
                  onChange={(e) => editarPonto(i, "title", e.target.value)}
                  maxLength={60}
                  className="-mx-1.5 w-[calc(100%+12px)] rounded-lg bg-transparent px-1.5 py-0.5 text-[16px] font-semibold text-on-background outline-none transition-colors focus:bg-white/80"
                />
                <textarea
                  value={p.description}
                  onChange={(e) => editarPonto(i, "description", e.target.value)}
                  maxLength={140}
                  rows={2}
                  className="-mx-1.5 mt-0.5 w-[calc(100%+12px)] resize-none rounded-lg bg-transparent px-1.5 py-0.5 text-[14px] leading-snug text-text-secondary outline-none transition-colors focus:bg-white/80"
                />
              </div>
              <div className="absolute right-2.5 top-3">
                <BotaoEditar alvo={`ess-ponto-${i}`} />
              </div>
            </div>
          ))}
        </div>

        {pronto && (
          <>
            <div className="orbi-linha-entra mt-6 px-1">
              <p className="text-[13.5px] text-on-background/85">Toque no lápis ou no texto para ajustar.</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">Essas informações vão para sua página e ajudam a Orbi a conhecer sua marca.</p>
            </div>
            <button
              onClick={onContinuar}
              className="orbi-linha-entra relative mt-5 w-full rounded-full py-4 text-[16px] font-medium text-white transition-transform active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${corForte} 0%, ${corBotao} 100%)`,
                boxShadow: `0 10px 26px ${comAlfa(corBotao, 0.32)}`,
              }}
            >
              Está certo, continuar
              <svg className="absolute right-6 top-1/2 -translate-y-1/2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Fundo com manchas bem suaves na paleta do cliente. */
function FundoDaMarca({ cor, cor2 }: { cor: string; cor2: string }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl" style={{ backgroundColor: comAlfa(cor, 0.16) }} />
      <div className="absolute -left-32 top-[38%] h-80 w-80 rounded-full blur-3xl" style={{ backgroundColor: comAlfa(cor2, 0.12) }} />
      <div className="absolute -bottom-28 right-[-10%] h-96 w-96 rounded-full blur-3xl" style={{ backgroundColor: comAlfa(cor, 0.12) }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Contato: WhatsApp e endereço (opcionais), já viram boxes prontos
// ---------------------------------------------------------------------------
export function formatarWhatsapp(v: string): string {
  let d = v.replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function ContatoDaMarca({
  nome,
  orbColors,
  whatsapp,
  onWhatsapp,
  endereco,
  onEndereco,
  onContinuar,
}: {
  nome: string;
  orbColors: string[] | null;
  whatsapp: string;
  onWhatsapp: (v: string) => void;
  endereco: string;
  onEndereco: (v: string) => void;
  onContinuar: () => void;
}) {
  const cor = orbColors?.[0] ?? "#111318";
  const cor2 = orbColors?.[1] ?? cor;
  const corForte = luminancia(cor) > 0.55 ? misturar(cor, "#000000", 0.4) : cor;
  const corBotao = misturar(corForte, "#000000", 0.28);

  const waOk = whatsapp.replace(/\D/g, "").length >= 10;
  const endOk = endereco.trim().length >= 6;
  const algum = waOk || endOk;

  const campo =
    "w-full rounded-2xl border border-white/80 bg-white/75 px-4 py-3.5 text-[16px] text-on-background shadow-[0_4px_24px_rgba(17,19,24,0.05)] outline-none backdrop-blur-xl transition-colors placeholder:text-text-tertiary focus:bg-white";

  return (
    <div className="relative flex flex-col py-2">
      <FundoDaMarca cor={cor} cor2={cor2} />
      <div className="relative z-[1] flex flex-col">
        <div className="flex items-start gap-4">
          <div className="mt-1 h-14 w-14 shrink-0 overflow-hidden rounded-full">
            <OrbiOrb size={56} colors={orbColors} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] text-text-tertiary">{nome.trim() || "Sua marca"}</p>
            <p className="font-[family-name:var(--font-manrope)] text-[28px] font-semibold leading-tight tracking-[-0.02em] text-on-background">Como te encontram</p>
            <p className="mt-0.5 text-[15px] text-text-secondary">Opcional. O que preencher vira botão pronto na sua página.</p>
          </div>
        </div>

        <label className="orbi-linha-entra mt-7 block">
          <span className="mb-1.5 flex items-center gap-2 px-1 text-[13px] font-medium text-on-background">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2z" />
            </svg>
            WhatsApp da empresa
          </span>
          <input
            value={whatsapp}
            onChange={(e) => onWhatsapp(formatarWhatsapp(e.target.value))}
            placeholder="(11) 99999-9999"
            inputMode="tel"
            autoComplete="tel"
            className={campo}
          />
        </label>

        <label className="orbi-linha-entra mt-4 block" style={{ animationDelay: "0.1s" }}>
          <span className="mb-1.5 flex items-center gap-2 px-1 text-[13px] font-medium text-on-background">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={corForte} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            Endereço
          </span>
          <input
            value={endereco}
            onChange={(e) => onEndereco(e.target.value)}
            placeholder="Rua, número, bairro, cidade"
            autoComplete="street-address"
            maxLength={200}
            className={campo}
          />
          <span className="mt-1.5 block px-1 text-[12px] text-text-tertiary">Deixe em branco se atende só online.</span>
        </label>

        {/* Prévia ao vivo: os boxes do jeito que vão aparecer na página */}
        {algum && (
          <div className="mt-7">
            <p className="px-1 text-[12px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Na sua página</p>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {waOk && (
                <div key="wa" className={`orbi-card-cai ${homeCardShellClass("largo", false, false, "transparent")}`} style={homeCardShellStyle("transparent")}>
                  <HomeOptionCardContent layout="largo" icon="__wadisc__" color="transparent" orbiColors={orbColors} title="Fale no WhatsApp" description="Atendimento rápido" />
                </div>
              )}
              {endOk && (
                <div key="end" className={`orbi-card-cai ${homeCardShellClass("largo", false, false, "transparent")}`} style={homeCardShellStyle("transparent")}>
                  <HomeOptionCardContent layout="largo" icon="__pin__" color="transparent" orbiColors={orbColors} title="Como chegar" description={endereco.trim()} addressIndicator="▸" />
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onContinuar}
          className="relative mt-8 w-full rounded-full py-4 text-[16px] font-medium text-white transition-transform active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${corForte} 0%, ${corBotao} 100%)`,
            boxShadow: `0 10px 26px ${comAlfa(corBotao, 0.32)}`,
          }}
        >
          {algum ? "Continuar" : "Pular por agora"}
          <svg className="absolute right-6 top-1/2 -translate-y-1/2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Utilitários de cor pra derivar tons da paleta do cliente.
function hexRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminancia(hex: string): number {
  const c = hexRgb(hex);
  if (!c) return 0;
  return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
}
function misturar(a: string, b: string, t: number): string {
  const x = hexRgb(a), y = hexRgb(b);
  if (!x || !y) return a;
  const r = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `#${r.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function comAlfa(hex: string, a: number): string {
  const c = hexRgb(hex);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${a})` : `rgba(17,19,24,${a})`;
}

/** Lápis que leva o cursor direto pro campo, deixa claro que dá pra editar. */
function BotaoEditar({ alvo }: { alvo: string }) {
  return (
    <button
      type="button"
      aria-label="Editar"
      onClick={() => {
        const el = document.getElementById(alvo) as HTMLInputElement | HTMLTextAreaElement | null;
        if (!el) return;
        el.focus();
        const fim = el.value.length;
        el.setSelectionRange(fim, fim);
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-background/75 transition-transform active:scale-90"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    </button>
  );
}

/** Check contornado na cor da marca: o círculo se desenha, depois o visto,
 * e uma onda suave se espalha em volta. */
function CheckAnimado({ cor }: { cor: string }) {
  return (
    <span className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center">
      <span className="orbi-check-onda absolute inset-0 rounded-full" style={{ backgroundColor: comAlfa(cor, 0.5) }} />
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke={cor} strokeLinecap="round" strokeLinejoin="round" className="relative" aria-hidden>
        <circle cx="15" cy="15" r="13.5" strokeWidth="1.8" strokeDasharray="85" strokeDashoffset="85" transform="rotate(-90 15 15)" className="orbi-mini-anel" />
        <path d="M10 15.5l3.3 3.3L20 12" strokeWidth="2" strokeDasharray="16" strokeDashoffset="16" className="orbi-mini-check" />
      </svg>
    </span>
  );
}
