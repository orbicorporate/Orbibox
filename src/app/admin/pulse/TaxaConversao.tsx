"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

// Contexto do número: o que significa e PASSOS concretos do que fazer, cada
// um apontando pra onde fazer no app. Faixas realistas pra link-in-bio.
function contexto(taxa: number, visitas: number) {
  if (visitas < 10) {
    return {
      cor: "#9AA0AA",
      grad: "linear-gradient(135deg, #C7CCD4, #9AA0AA)",
      titulo: "Ainda são poucas visitas",
      resumo: "Com pouca gente entrando, esse número ainda não é confiável. Primeiro, traga visitas:",
      passos: [
        "Compartilhe seu link nos stories do Instagram.",
        "Coloque o link do Orbibox na bio do seu perfil.",
        "Mande o link nos grupos de WhatsApp que você participa.",
      ],
      link: null as { label: string; href: string } | null,
    };
  }
  if (taxa >= 60) {
    return {
      cor: "#3BC471",
      grad: "linear-gradient(135deg, #86E6A8, #3BC471)",
      titulo: "Excelente. Sua página convence.",
      resumo: "A maioria de quem entra faz alguma ação. Pra manter esse nível:",
      passos: [
        "Mantenha os produtos e preços da Vitrine sempre atualizados.",
        "Confira de vez em quando se o WhatsApp e os contatos estão certos.",
      ],
      link: { label: "Revisar Vitrine", href: "/admin/vitrine" },
    };
  }
  if (taxa >= 35) {
    return {
      cor: "#43BA71",
      grad: "linear-gradient(135deg, #9DEAB6, #43BA71)",
      titulo: "Está num bom caminho.",
      resumo: "Boa parte age ao entrar. Pra subir mais, faça isto:",
      passos: [
        "Em Boxes, arraste o box mais importante (WhatsApp ou Vitrine) pra ficar em primeiro.",
        "Dê a ele um nome que convide a tocar, tipo \"Falar agora no WhatsApp\".",
        "Tire da frente qualquer box que você não usa, pra não distrair.",
      ],
      link: { label: "Organizar Boxes", href: "/admin/boxes" },
    };
  }
  if (taxa >= 15) {
    return {
      cor: "#E0912F",
      grad: "linear-gradient(135deg, #F5C97E, #E0912F)",
      titulo: "Dá pra melhorar.",
      resumo: "Muita gente entra e sai sem tocar em nada. Deixe a primeira tela mais direta:",
      passos: [
        "Abra sua página e veja a primeira tela: dá pra entender o que fazer em 3 segundos?",
        "Deixe UM botão principal bem no topo (ex: WhatsApp) e nomeie com clareza.",
        "Reduza o número de boxes: menos opções, decisão mais fácil.",
      ],
      link: { label: "Ajustar Boxes", href: "/admin/boxes" },
    };
  }
  return {
    cor: "#E24B6B",
    grad: "linear-gradient(135deg, #F5A3B5, #E24B6B)",
    titulo: "Vale ajustar a página.",
    resumo: "Quase ninguém age ao entrar. Provavelmente falta um caminho claro. Comece por aqui:",
    passos: [
      "Garanta que existe um box de ação no topo (WhatsApp ou Vitrine).",
      "Preencha a Vitrine com pelo menos alguns produtos ou serviços.",
      "Deixe só uma ação óbvia na primeira tela, sem poluição.",
    ],
    link: { label: "Revisar minha página", href: "/admin/boxes" },
  };
}

export function TaxaConversao({ taxa, visitas, totalCliques, orbiColors }: { taxa: number; visitas: number; totalCliques: number; orbiColors?: string[] | null }) {
  // Anima o número e o arco de 0 até o valor real, ao montar.
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    let raf = 0;
    const inicio = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - inicio) / dur);
      // ease-out
      const eased = 1 - Math.pow(1 - p, 3);
      setAnim(Math.round(taxa * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [taxa]);

  const ctx = contexto(taxa, visitas);
  const circ = 289;
  // Sem visitas suficientes o número não significa nada, então o anel fica
  // cinza apagado em vez de brilhar como se fosse um bom resultado.
  const semDados = visitas < 10;

  return (
    <div className="flex flex-col items-center">
      <div className="relative mt-6 flex h-56 w-56 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
          <defs>
            {/* Degradê padrão da Orbi no anel, com um reflexo claro que
                percorre o traço de ponta a ponta, dando o brilho vivo. */}
            <linearGradient id="anelOrbi" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--orbi-gradient-start)" />
              <stop offset="50%" stopColor="var(--orbi-gradient-end)" />
              <stop offset="100%" stopColor="var(--orbi-gradient-start)" />
              <animate attributeName="x1" values="-1;1;-1" dur="4s" repeatCount="indefinite" />
              <animate attributeName="x2" values="0;2;0" dur="4s" repeatCount="indefinite" />
            </linearGradient>
            <filter id="anelGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--divider)" strokeWidth="2" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke={semDados ? ctx.cor : "url(#anelOrbi)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${(anim / 100) * circ} ${circ}`}
            filter={semDados ? undefined : "url(#anelGlow)"}
            style={{ transition: "stroke 0.4s ease" }}
          />
        </svg>
        <div className="text-center">
          <p className="font-[family-name:var(--font-manrope)] text-[52px] font-medium leading-none tabular-nums">{anim}%</p>
          <p className="mt-1 text-[13px] text-text-secondary">de quem entra, age</p>
        </div>
      </div>

      {/* Contexto + passos concretos do que fazer, com a Orbi "pensando" */}
      <div className="mt-3 w-full overflow-hidden rounded-[24px] bg-surface-white shadow-[0_6px_22px_rgba(17,19,24,0.06)]">
        <div className="flex items-start gap-3 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center">
            <OrbiParticleSphere size={44} colors={orbiColors ?? undefined} vivid className="rounded-full" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Leitura da Orbi</span>
            </div>
            <p className="mt-0.5 text-[16px] font-normal leading-tight" style={{ color: ctx.cor }}>{ctx.titulo}</p>
          </div>
        </div>

        <div className="border-t border-divider px-5 py-4">
          <p className="text-[13.5px] leading-relaxed text-text-secondary">{ctx.resumo}</p>
          <ol className="mt-3 flex flex-col gap-2.5">
            {ctx.passos.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundImage: ctx.grad }}>{i + 1}</span>
                <span className="text-on-background">{p}</span>
              </li>
            ))}
          </ol>

          {ctx.link && (
            <Link href={ctx.link.href} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-button-primary px-5 py-2.5 text-[13.5px] font-semibold text-white">
              {ctx.link.label} <span aria-hidden>→</span>
            </Link>
          )}

          {visitas >= 10 && (
            <p className="mt-3 text-[12px] text-text-tertiary">
              Baseado em {totalCliques} {totalCliques === 1 ? "ação" : "ações"} em {visitas} {visitas === 1 ? "visita" : "visitas"} no período.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
