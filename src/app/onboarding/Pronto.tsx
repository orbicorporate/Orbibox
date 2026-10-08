"use client";

import { useState } from "react";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { ShareOrbiboxButton } from "@/components/mobile/ShareOrbiboxButton";
import { conversaoPorId, type ConversaoId, type ObjetivoId } from "@/lib/conversao";

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
 * A primeira coisa depois da criação não é o painel: é o próprio Orbibox,
 * num celular, funcionando. Embaixo, o que a Orbi já preparou de acordo
 * com o objetivo escolhido (oferta, vitrine ou conversa), e só então o
 * convite pra divulgar e pro painel.
 */
export function Pronto({
  d,
  onPainel,
  onTentarDeNovo,
  tentando,
}: {
  d: ProntoDados;
  onPainel: (destino?: string) => void;
  onTentarDeNovo: () => void;
  tentando: boolean;
}) {
  const [carregou, setCarregou] = useState(false);
  const conv = conversaoPorId(d.conversao);
  const mostraOferta = !!d.voucher && (d.objetivo === "vender" || d.objetivo === "tudo" || d.conversao === "oferta");
  const mostraConversa = !!d.demo && (d.objetivo === "atender" || d.objetivo === "tudo");
  const mostraVitrine = !mostraOferta && !mostraConversa;
  const linkCurto = d.link.replace(/^https?:\/\//, "");

  return (
    <div className="mx-auto grid w-full max-w-[920px] items-start gap-x-14 gap-y-8 lg:grid-cols-[320px_1fr]">
      {/* Título: no celular vem antes do aparelho; no computador, ao lado. */}
      <div className="text-center lg:col-start-2 lg:row-start-1 lg:text-left">
        <p className="orbi-linha-entra text-[13px] font-medium text-text-tertiary">{d.nome}</p>
        <h1 className="orbi-linha-entra mt-1 font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-[1.1] tracking-[-0.02em]" style={{ animationDelay: "0.1s" }}>
          Seu Orbibox está pronto <span className="orbi-gradient-text">✦</span>
        </h1>
        <p className="orbi-linha-entra mt-2 text-[15px] leading-relaxed text-text-secondary" style={{ animationDelay: "0.2s" }}>
          É assim que seus clientes vão ver. Toque e explore como se fosse um deles.
        </p>
      </div>

      {/* O Orbibox de verdade, num celular */}
      <div className="orbi-linha-entra mx-auto lg:col-start-1 lg:row-span-3 lg:row-start-1" style={{ animationDelay: "0.3s" }}>
        <div className="relative w-[300px] rounded-[46px] bg-on-background p-[9px] shadow-[0_30px_70px_-28px_rgba(17,19,24,0.55)]">
          <div className="relative h-[600px] overflow-hidden rounded-[38px] bg-background-main">
            {!carregou && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <OrbiOrb size={56} colors={d.orbColors} />
                <span className="text-[13px] text-text-tertiary">Abrindo seu Orbibox…</span>
              </div>
            )}
            <iframe
              src={`/${d.slug}?preview=1`}
              title={`Prévia do Orbibox de ${d.nome}`}
              onLoad={() => setCarregou(true)}
              className={`h-full w-full border-0 transition-opacity duration-500 ${carregou ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        </div>
        <a
          href={`/${d.slug}?preview=1`}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex w-[300px] items-center justify-center gap-2 rounded-full bg-on-background py-3.5 text-[15px] font-medium text-white transition-transform active:scale-[0.98]"
        >
          Ver como meus clientes verão <span aria-hidden>→</span>
        </a>
      </div>

      <div className="flex flex-col gap-4 lg:col-start-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-text-tertiary">O que a Orbi já preparou</p>

        {mostraConversa && d.demo && <ConversaDemo nome={d.nome} demo={d.demo} cores={d.orbColors} />}

        {mostraOferta && d.voucher && (
          <div className="orbi-linha-entra rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]" style={{ animationDelay: "0.5s" }}>
            <p className="text-[15px] font-medium">Criamos sua primeira oferta</p>
            <p className="mt-0.5 text-[13.5px] text-text-secondary">Já está no ar na sua página. Quem resgatar deixa o contato com você.</p>
            <div className="relative mt-4 overflow-hidden rounded-[18px] bg-[#111318] px-5 py-4 text-white">
              <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-surface-white" aria-hidden />
              <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-surface-white" aria-hidden />
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">Voucher · {d.nome}</p>
              <p className="mt-1 font-[family-name:var(--font-manrope)] text-[22px] font-medium leading-tight tracking-[-0.01em]">{d.voucher.titulo}</p>
              <p className="mt-2 text-[12.5px] text-white/60">{d.voucher.quantidade} unidades · resgate pelo celular</p>
            </div>
            <button type="button" onClick={() => onPainel("/admin/vouchers")} className="mt-3 text-[13px] font-medium text-text-secondary underline underline-offset-2">
              Ajustar oferta
            </button>
          </div>
        )}

        {mostraVitrine && (
          <div className="orbi-linha-entra rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]" style={{ animationDelay: "0.5s" }}>
            <p className="text-[15px] font-medium">
              {d.importados > 0
                ? d.siteType === "ecommerce"
                  ? `Sua vitrine ficou com ${d.importados} ${d.importados === 1 ? "categoria" : "categorias"}`
                  : `Sua vitrine ficou com ${d.importados} ${d.importados === 1 ? "item" : "itens"}`
                : "Sua apresentação está pronta"}
            </p>
            {d.resumo && <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">{d.resumo}</p>}
            {d.pontos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {d.pontos.map((p) => (
                  <span key={p.title} className="rounded-full bg-surface-soft px-3 py-1.5 text-[12.5px] font-medium">
                    {p.icon} {p.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {d.botaoPrincipal && conv && (
          <div className="orbi-linha-entra flex items-start gap-3 rounded-[20px] bg-surface-soft px-4 py-3.5" style={{ animationDelay: "0.65s" }}>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-on-background text-[13px] text-white" aria-hidden>1</span>
            <p className="text-[13.5px] leading-snug text-text-secondary">
              <span className="font-medium text-on-background">Primeiro botão: {d.botaoPrincipal}.</span> Quem abrir seu link vê primeiro o caminho pra {conv.rotulo.toLowerCase()}.
            </p>
          </div>
        )}

        {d.fetchError && (
          <div className="rounded-[20px] border border-divider px-4 py-3.5">
            <p className="text-[13.5px] leading-snug text-text-secondary">
              Não consegui trazer os produtos do seu site agora. {d.fetchError}
            </p>
            <button type="button" onClick={onTentarDeNovo} disabled={tentando} className="mt-2 text-[13px] font-medium underline underline-offset-2 disabled:opacity-50">
              {tentando ? "Lendo de novo…" : "Tentar de novo"}
            </button>
          </div>
        )}

        {/* Divulgar: o passo que transforma página pronta em visitas. */}
        <div className="orbi-linha-entra mt-2 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]" style={{ animationDelay: "0.8s" }}>
          <p className="text-[15px] font-medium">Coloque no ar onde seus clientes já estão</p>
          <p className="mt-0.5 text-[13.5px] leading-snug text-text-secondary">Na bio do Instagram, nos stories e no WhatsApp. Seu Orbibox não substitui esses canais, ele deixa cada um mais inteligente.</p>
          <div className="mt-3.5 flex items-center gap-2 rounded-full bg-surface-soft p-1.5 pl-4">
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{linkCurto}</span>
            <ShareOrbiboxButton url={d.link} title={d.nome} className="shrink-0 rounded-full bg-on-background px-4 py-2 text-[13px] font-medium text-white">
              Divulgar
            </ShareOrbiboxButton>
          </div>
        </div>

        <button type="button" onClick={() => onPainel()} className="orbi-gradient mt-1 w-full rounded-full py-3.5 text-[15px] font-medium text-on-background transition-transform active:scale-[0.98]">
          Ir para o meu painel →
        </button>
        {d.diasTeste != null && d.diasTeste > 0 && (
          <p className="-mt-1 text-center text-[12.5px] text-text-tertiary">
            {d.diasTeste} dias grátis, sem cartão. Você decide depois de ver o resultado.
          </p>
        )}

        <details className="group rounded-[20px] bg-surface-soft px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[13.5px] font-medium">
            O que a Orbi entendeu da sua marca
            <span className="text-text-tertiary transition-transform group-open:rotate-180" aria-hidden>⌄</span>
          </summary>
          <div className="mt-3 flex flex-col gap-3 pb-1 text-[13.5px] leading-relaxed text-text-secondary">
            {d.ramo && <p><span className="text-on-background">Ramo:</span> {d.ramo}</p>}
            {d.voz && <p><span className="text-on-background">Jeito de falar:</span> {d.voz}</p>}
            {d.paleta.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-on-background">Cores:</span>
                {d.paleta.map((c) => (
                  <span key={c} className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: c }} />
                ))}
              </div>
            )}
            <button type="button" onClick={() => onPainel("/admin/config/marca")} className="self-start text-[13px] font-medium text-on-background underline underline-offset-2">
              Ajustar em Sua marca
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}

function ConversaDemo({ nome, demo, cores }: { nome: string; demo: { pergunta: string; resposta: string }; cores: string[] | null }) {
  return (
    <div className="rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
      <p className="orbi-linha-entra text-[15px] font-medium" style={{ animationDelay: "0.4s" }}>Sua IA já atende assim</p>
      <p className="orbi-linha-entra mt-0.5 text-[13.5px] text-text-secondary" style={{ animationDelay: "0.45s" }}>
        Com o que ela leu sobre a {nome}. Nada foi digitado por você.
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        <div className="orbi-linha-entra ml-10 self-end rounded-[20px] rounded-br-md bg-on-background px-4 py-2.5 text-[14px] leading-snug text-white" style={{ animationDelay: "0.9s" }}>
          {demo.pergunta}
        </div>
        <div className="orbi-linha-entra flex items-end gap-2" style={{ animationDelay: "1.6s" }}>
          <span className="shrink-0"><OrbiOrb size={28} colors={cores} /></span>
          <div className="mr-6 rounded-[20px] rounded-bl-md bg-surface-soft px-4 py-2.5 text-[14px] leading-relaxed">{demo.resposta}</div>
        </div>
      </div>
    </div>
  );
}
