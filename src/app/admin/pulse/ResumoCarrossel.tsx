"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { ResumoSemanal } from "@/lib/resumoSemanal";

type Cartao = { id: string; fundo: string; fundo2: string; cor: string; corpo: ReactNode };

/** Explica de onde a pessoa veio, em palavras simples. */
function explicarOrigem(origem: string): string {
  const o = origem.toLowerCase();
  if (o === "link direto")
    return "Acontece quando alguém toca num link que você mandou por mensagem, escaneia seu QR Code ou digita o endereço. Nesses casos o navegador não informa de onde a pessoa veio.";
  if (o === "instagram") return "Gente que chegou pelo link da sua bio, dos Stories ou de um post.";
  if (o === "whatsapp") return "Gente que abriu seu link a partir de uma conversa no WhatsApp.";
  if (o === "google") return "Gente que encontrou você numa busca do Google.";
  return "Sites e apps que levaram pessoas até a sua página.";
}

/** Cartões que deslizam de lado, um assunto por cartão. */
export function ResumoCarrossel({ resumo }: { resumo: ResumoSemanal }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);

  const dif = resumo.visitasAntes > 0 ? Math.round(((resumo.visitas - resumo.visitasAntes) / resumo.visitasAntes) * 100) : null;
  const cartoes: Cartao[] = [];

  cartoes.push({
    id: "visitas",
    fundo: "#EEFCCB",
    fundo2: "#D8F59A",
    cor: "#2F6B00",
    corpo: (
      <>
        <p className="text-[12.5px] opacity-80">Visitas, 7 dias</p>
        <p className="mt-1 font-[family-name:var(--font-manrope)] text-[56px] font-medium leading-none tabular-nums">{resumo.visitas}</p>
        <p className="mt-2 text-[14px] leading-snug">
          {resumo.visitas === 0 ? "Ninguém abriu seu link nos últimos 7 dias." : resumo.visitas === 1 ? "pessoa abriu seu link." : "pessoas abriram seu link."}
        </p>
        {dif !== null && resumo.visitas > 0 && (
          <span className="mt-auto inline-flex w-fit rounded-full bg-white/70 px-2.5 py-1 text-[12px]">
            {dif > 0 ? `${dif}% a mais` : dif < 0 ? `${Math.abs(dif)}% a menos` : "Igual"} que na semana anterior
          </span>
        )}
      </>
    ),
  });

  cartoes.push({
    id: "toques",
    fundo: "#DDF9F4",
    fundo2: "#B5EDE3",
    cor: "#00695F",
    corpo: (
      <>
        <p className="text-[12.5px] opacity-80">Toques</p>
        <p className="mt-1 font-[family-name:var(--font-manrope)] text-[56px] font-medium leading-none tabular-nums">{resumo.acoes}</p>
        <p className="mt-2 text-[14px] leading-snug">
          {resumo.acoes === 0 ? "Ninguém tocou em nenhum botão ainda." : resumo.acoes === 1 ? "vez que tocaram em algo." : "vezes que tocaram em algo."}
        </p>
        {resumo.whatsapp > 0 && (
          <span className="mt-auto inline-flex w-fit rounded-full bg-white/70 px-2.5 py-1 text-[12px]">
            {resumo.whatsapp} {resumo.whatsapp === 1 ? "foi" : "foram"} para o WhatsApp
          </span>
        )}
      </>
    ),
  });

  if (resumo.topTitulo) {
    cartoes.push({
      id: "top",
      fundo: "#FFEAD7",
    fundo2: "#FFCFA6",
      cor: "#A8481A",
      corpo: (
        <>
          <p className="text-[12.5px] opacity-80">O mais procurado</p>
          <p className="mt-2 font-[family-name:var(--font-manrope)] text-[24px] font-medium leading-tight">{resumo.topTitulo}</p>
          <p className="mt-2 text-[14px] leading-snug">É o que mais chamou atenção esta semana.</p>
        </>
      ),
    });
  }

  if (resumo.origem) {
    cartoes.push({
      id: "origem",
      fundo: "#EFE6FF",
      fundo2: "#D2BDFF",
      cor: "#6A3FC4",
      corpo: (
        <>
          <p className="text-[12.5px] opacity-80">De onde vieram</p>
          <p className="mt-2 font-[family-name:var(--font-manrope)] text-[24px] font-medium leading-tight">{resumo.origem}</p>
          <p className="mt-2 text-[14px] leading-snug">A maioria chegou por aqui.</p>
          <p className="mt-auto rounded-2xl bg-white/60 px-3 py-2.5 text-[12.5px] leading-snug">{explicarOrigem(resumo.origem)}</p>
        </>
      ),
    });
  }

  function aoRolar() {
    const el = trilho.current;
    if (!el) return;
    const filho = el.firstElementChild as HTMLElement | null;
    const passo = filho ? filho.offsetWidth + 12 : el.clientWidth;
    setAtual(Math.min(cartoes.length, Math.round(el.scrollLeft / passo)));
  }

  const total = cartoes.length + 1;

  return (
    <div className="mt-4">
      <div ref={trilho} onScroll={aoRolar} className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1 no-scrollbar">
        {cartoes.map((c) => (
          <div key={c.id} className="flex min-h-[290px] w-[62%] max-w-[250px] shrink-0 snap-start flex-col rounded-[26px] p-5" style={{ backgroundImage: `linear-gradient(170deg, ${c.fundo} 0%, ${c.fundo2} 100%)`, color: c.cor }}>
            {c.corpo}
          </div>
        ))}
        <div className="flex min-h-[290px] w-[62%] max-w-[250px] shrink-0 snap-start flex-col rounded-[26px] bg-[linear-gradient(170deg,#1B1E26_0%,#0D0F14_100%)] p-5 text-white">
          <p className="text-[12.5px] text-white/60">O que fazer agora</p>
          <p className="mt-2 text-[15px] leading-snug">{resumo.dica.texto}</p>
          <Link href={resumo.dica.href} className="mt-auto inline-flex min-h-[42px] w-fit items-center gap-1.5 rounded-full bg-white px-5 text-[14px] text-on-background active:scale-[0.98]">
            {resumo.dica.rotulo} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all duration-200 ${i === atual ? "w-5 bg-on-background" : "w-1.5 bg-divider"}`} />
        ))}
      </div>
    </div>
  );
}
