"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

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
          <span
            className="orbi-check-entra absolute flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
            style={{ backgroundColor: cor, right: 10, bottom: 10 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 13l4 4L19 7" />
            </svg>
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
  itens,
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

  // Quando chega, os cards caem um por um.
  const [mostrados, setMostrados] = useState(0);
  useEffect(() => {
    if (status !== "ok" || mostrados >= itens.length) return;
    const t = setTimeout(() => setMostrados((m) => m + 1), mostrados === 0 ? 300 : 380);
    return () => clearTimeout(t);
  }, [status, mostrados, itens.length]);

  const pronto = status === "ok" && mostrados >= itens.length;
  const textoEtapa = status === "ok" ? (pronto ? "Pronto" : "Montando sua vitrine") : ETAPAS[etapa](alvo, marca);

  return (
    <div className="flex flex-col items-center py-4 text-center">
      {/* Celular */}
      <div className="relative w-[260px] rounded-[40px] bg-on-background p-2.5 shadow-[0_24px_60px_-20px_rgba(17,19,24,0.45)]">
        <div className="relative h-[470px] overflow-hidden rounded-[32px] bg-background-main">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-on-background" />
          <div className="flex h-full flex-col px-3 pb-3 pt-10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                <OrbiOrb size={32} colors={orbColors} />
              </div>
              <p className="truncate text-left font-[family-name:var(--font-manrope)] text-[15px] font-semibold">{marca}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 overflow-hidden">
              {status === "pending"
                ? [0, 1, 2, 3, 4, 5].map((k) => (
                    <div
                      key={k}
                      className={`orbi-shimmer rounded-2xl bg-surface-soft ${k === 0 ? "col-span-2 h-[118px]" : "h-[96px]"}`}
                      style={{ animationDelay: `${k * 120}ms` }}
                    />
                  ))
                : itens.slice(0, mostrados).map((it, k) => (
                    <div
                      key={k}
                      className={`orbi-card-cai relative overflow-hidden rounded-2xl ${k === 0 ? "col-span-2 h-[118px]" : "h-[96px]"}`}
                      style={{ backgroundColor: it.bg }}
                    >
                      {it.image_url && <Foto src={it.image_url} sizes="240px" />}
                      <div className={`absolute inset-x-0 bottom-0 p-2 text-left ${it.image_url ? "bg-gradient-to-t from-black/65 to-transparent pt-6" : ""}`}>
                        <p className="line-clamp-2 text-[11.5px] font-semibold leading-tight" style={{ color: it.image_url ? "#fff" : it.fg }}>
                          {it.title}
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {!pronto && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orbi-gradient-start" />}
        <p key={textoEtapa} className="orbi-linha-entra text-[15px] text-text-secondary">
          {pronto ? `Essa é a página da ${marca}.` : `${textoEtapa}…`}
        </p>
      </div>
      {pronto && (
        <>
          {segundos != null && (
            <p className="orbi-linha-entra mt-1 font-[family-name:var(--font-manrope)] text-[20px] font-medium">
              Levou {segundos} segundos.
            </p>
          )}
          <button
            onClick={onContinuar}
            className="orbi-linha-entra orbi-gradient mt-5 w-full max-w-sm rounded-full py-3.5 text-[15px] font-medium text-on-background"
          >
            Continuar →
          </button>
        </>
      )}
    </div>
  );
}
