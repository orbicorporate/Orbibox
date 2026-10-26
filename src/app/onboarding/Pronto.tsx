"use client";

import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import type { ConversaoId, ObjetivoId } from "@/lib/conversao";

export type ProntoDados = {
  nome: string;
  slug: string;
  link: string;
  orbColors: string[] | null;
  objetivo: ObjetivoId;
  conversao: ConversaoId;
  botaoPrincipal: string | null;
  voucher: { titulo: string; quantidade: number } | null;
  demo: { pergunta: string; resposta: string } | null;
  importados: number;
  siteType: "ecommerce" | "institucional" | "links" | null;
  fetchError: string | null;
  resumo: string;
  pontos: { icon: string; title: string }[];
  paleta: string[];
  voz: string;
  ramo: string | null;
  diasTeste: number | null;
};

/**
 * Fim do cadastro: o Orbibox está no ar. Mostra o que a Orbi já deixou pronto
 * e leva para a página inicial, onde o tour curto explica as duas telas.
 */
export function Pronto({
  d,
  onTentarDeNovo,
  tentando,
}: {
  d: ProntoDados;
  onTentarDeNovo: () => void;
  tentando: boolean;
}) {
  // O que a Orbi já deixou pronto, cada coisa com sua cor.
  const feitos = [
    d.importados > 0 ? { t: `${d.importados} ${d.importados === 1 ? "item" : "itens"} no catálogo`, c: "#8758BE", i: "▦" } : null,
    d.paleta.length > 0 ? { t: "Cores da marca", c: "#E8508A", i: "●" } : null,
    { t: "Orbi atendendo", c: "#3B5BDB", i: "✦" },
    d.voucher ? { t: d.voucher.titulo, c: "#C4122F", i: "%" } : null,
  ].filter((x): x is { t: string; c: string; i: string } => !!x);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-[400px] flex-col items-center justify-center gap-7 text-center">
      <div className="orbi-linha-entra flex flex-col items-center">
        <div className="relative">
          <span aria-hidden className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(155,230,200,0.55),transparent_70%)] blur-xl" />
          <OrbiOrb size={96} colors={d.orbColors} />
        </div>
        <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">{d.nome}</p>
        <h1 className="mt-1.5 font-[family-name:var(--font-manrope)] text-[32px] font-medium leading-[1.08] tracking-[-0.02em]">Seu Orbibox<br />está no ar</h1>
      </div>

      <div className="orbi-linha-entra grid w-full grid-cols-2 gap-2" style={{ animationDelay: "0.15s" }}>
        {feitos.map((f) => (
          <div key={f.t} className="flex items-center gap-2.5 rounded-[18px] bg-white/80 p-2.5 text-left ring-1 ring-black/[0.06] backdrop-blur">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] text-white" style={{ backgroundColor: f.c }} aria-hidden>{f.i}</span>
            <span className="min-w-0 text-[12.5px] font-medium leading-tight">{f.t}</span>
          </div>
        ))}
      </div>

      {d.fetchError && (
        <p className="text-[13px] leading-snug text-text-secondary">
          Não consegui ler seu site agora.{" "}
          <button type="button" onClick={onTentarDeNovo} disabled={tentando} className="font-medium underline underline-offset-2 disabled:opacity-50">
            {tentando ? "Lendo de novo…" : "Tentar de novo"}
          </button>
        </p>
      )}

      <div className="orbi-linha-entra flex w-full flex-col items-center gap-3" style={{ animationDelay: "0.45s" }}>
        {/* Abre a própria Home já com o tour curto (bolinhas, tags, destaques, catálogo). */}
        <a href={`/${d.slug}?tour=1`} className="orbi-gradient w-full rounded-full py-4 text-center text-[16px] font-medium text-on-background transition-transform active:scale-[0.98]">
          Ver minha página →
        </a>
        <p className="text-[12.5px] text-text-tertiary">Mostramos rapidinho como deixar ela linda.</p>
        {d.diasTeste != null && d.diasTeste > 0 && <p className="text-[12.5px] text-text-tertiary">{d.diasTeste} dias grátis, sem cartão.</p>}
      </div>
    </div>
  );
}
