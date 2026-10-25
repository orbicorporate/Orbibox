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

const PASSOS = [
  { n: 1, t: "Categorias", d: "Monte o menu do catálogo" },
  { n: 2, t: "Produtos e serviços", d: "Preencha cada categoria" },
  { n: 3, t: "Página inicial", d: "Botões, contato e endereço" },
  { n: 4, t: "Divulgar", d: "Coloque no ar" },
];

/**
 * Fim do cadastro: curto e sem dúvida do que fazer agora. Diz o que a Orbi
 * já fez e leva direto para o passo a passo, em vez de soltar a pessoa numa
 * página vazia.
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
  const feitos = [
    d.importados > 0 ? `${d.importados} ${d.importados === 1 ? "item trazido" : "itens trazidos"} do seu site` : null,
    d.paleta.length > 0 ? "Cores da sua marca" : null,
    "Orbi pronta para conversar",
    d.voucher ? `Voucher: ${d.voucher.titulo}` : null,
  ].filter((x): x is string => !!x);

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col items-center gap-6 text-center">
      <div className="orbi-linha-entra flex flex-col items-center gap-3">
        <OrbiOrb size={72} colors={d.orbColors} />
        <div>
          <p className="text-[13px] font-medium text-text-tertiary">{d.nome}</p>
          <h1 className="mt-1 font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.1] tracking-[-0.02em]">Seu Orbibox foi criado</h1>
          <p className="mt-2 text-[15px] text-text-secondary">Falta pouco. Vamos montar juntos, em 4 passos.</p>
        </div>
      </div>

      <div className="orbi-linha-entra flex flex-wrap justify-center gap-2" style={{ animationDelay: "0.15s" }}>
        {feitos.map((f) => (
          <span key={f} className="rounded-full bg-surface-white px-3.5 py-1.5 text-[12.5px] font-medium ring-1 ring-black/[0.06]">✓ {f}</span>
        ))}
      </div>

      <ol className="orbi-linha-entra flex w-full flex-col gap-2 text-left" style={{ animationDelay: "0.3s" }}>
        {PASSOS.map((p) => (
          <li key={p.n} className="flex items-center gap-3 rounded-[20px] bg-surface-white p-3.5 ring-1 ring-black/[0.06]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-background text-[14px] font-semibold text-white">{p.n}</span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-tight">{p.t}</span>
              <span className="block text-[12.5px] text-text-tertiary">{p.d}</span>
            </span>
          </li>
        ))}
      </ol>

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
        {d.diasTeste != null && d.diasTeste > 0 && <p className="text-[12.5px] text-text-tertiary">{d.diasTeste} dias grátis, sem cartão.</p>}
      </div>
    </div>
  );
}
