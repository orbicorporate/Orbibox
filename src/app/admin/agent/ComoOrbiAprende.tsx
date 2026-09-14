"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { OrbiEntrevista } from "./OrbiEntrevista";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type Diferencial = { icon: string; title: string; description: string };
type Topico = { title: string; description: string };
type ResultadoImport = {
  about?: string;
  differentials?: Diferencial[];
  policies?: string;
  challenges?: Topico[];
  opportunities?: Topico[];
};

export function ComoOrbiAprende({ businessId, businessName, orbiColors, gapsPendentes = 0, baseFeita = false, onDone }: { businessId: string; businessName: string; orbiColors?: string[] | null; gapsPendentes?: number; baseFeita?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [site, setSite] = useState<"idle" | "form">("idle");
  const [feito, setFeito] = useState(baseFeita);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [analiseAberta, setAnaliseAberta] = useState(false);

  async function importar() {
    if (!url.trim() || importando) return;
    setImportando(true);
    setErro(null);
    try {
      const res = await fetch("/api/import-about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Não consegui ler esse site."); return; }
      setFeito(true);
      setResultado({ about: data.about, differentials: data.differentials, policies: data.policies, challenges: data.challenges, opportunities: data.opportunities });
      setSite("idle");
      onDone?.();
      router.refresh();
    } catch {
      setErro("Erro ao ler o site. Tente de novo.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-divider bg-surface-white p-5">
      <div>
        <p className="font-[family-name:var(--font-manrope)] text-[19px] font-semibold leading-tight">Ensine a Orbi</p>
        <p className="text-[12.5px] text-text-tertiary">{feito ? "Ela já conhece seu negócio. Você pode reforçar abaixo." : "Faça o passo 1 ou 2 pra ela conhecer seu negócio."}</p>
      </div>

      <div className="mt-4 flex flex-col">
        {/* PASSO 1 — site */}
        <Passo
          n={1}
          feito={feito}
          titulo="Importe seu site"
          desc={feito ? "Base do negócio já registrada. Toque pra reforçar." : "O jeito mais rápido: ela lê em segundos."}
          onClick={() => setSite((s) => (s === "form" ? "idle" : "form"))}
        >
          {site === "form" ? (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") importar(); }}
                  placeholder="www.seusite.com.br"
                  autoFocus
                  className="min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-4 py-2 text-[13.5px] outline-none focus:border-on-background"
                />
                <button onClick={importar} disabled={importando || !url.trim()} className="shrink-0 rounded-full bg-button-primary px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40">
                  {importando ? "Lendo…" : "Ler"}
                </button>
              </div>
              {erro && <p className="mt-1.5 text-[12px] text-red-600">{erro}</p>}

              {importando && (
                <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-surface-soft px-3.5 py-3">
                  <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
                    <OrbiParticleSphere size={24} colors={orbiColors ?? undefined} className="rounded-full" />
                  </span>
                  <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-divider">
                    <span className="orbi-progress-bar block h-full rounded-full bg-on-background" />
                  </span>
                  <span className="shrink-0 text-[11.5px] text-text-tertiary">analisando…</span>
                </div>
              )}
            </div>
          ) : resultado && (resultado.about || (resultado.differentials?.length ?? 0) > 0) ? (
            <button
              onClick={(e) => { e.stopPropagation(); setAnaliseAberta(true); }}
              className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-[#1F9E4C] px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              ✓ Ver análise do site →
            </button>
          ) : null}
        </Passo>

        <Divisor />

        {/* PASSO 2 — entrevista */}
        <Passo n={2} feito={feito} titulo="Ou responda 5 perguntas" desc={feito ? "Se quiser, refaça pra atualizar." : "Um papo rápido; ela preenche tudo sozinha."}>
          <div className="mt-2">
            <OrbiEntrevista businessId={businessId} orbiColors={orbiColors} onDone={() => { onDone?.(); router.refresh(); }} compact />
          </div>
        </Passo>

        <Divisor />

        {/* PASSO 3 — aprende com conversas (contínuo) */}
        <Passo
          n={3}
          feito={false}
          continuo
          titulo="Ela aprende com as conversas"
          desc={gapsPendentes > 0 ? `${gapsPendentes} ${gapsPendentes === 1 ? "dúvida" : "dúvidas"} que ela não soube. Ensine ela.` : "Automático, conforme os visitantes conversam."}
          href="/admin/agent/aprendizado"
          badge={gapsPendentes > 0 ? gapsPendentes : undefined}
        />
      </div>

      {!feito && (
        <p className="mt-4 rounded-2xl bg-surface-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text-secondary">
          💡 Faça pelo menos um dos dois primeiros pra a Orbi começar bem.
        </p>
      )}

      {resultado && (
        <AnaliseSiteModal aberto={analiseAberta} onFechar={() => setAnaliseAberta(false)} resultado={resultado} orbiColors={orbiColors} />
      )}
    </div>
  );
}

function Divisor() {
  return <div className="ml-[11px] h-3 w-px bg-divider" />;
}

function Passo({ n, feito, continuo, titulo, desc, children, href, badge, onClick }: {
  n: number; feito: boolean; continuo?: boolean; titulo: string; desc: string; children?: React.ReactNode; href?: string; badge?: number; onClick?: () => void;
}) {
  const bolinha = (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-150 ${
      feito ? "bg-[#1F9E4C] text-white" : continuo ? "bg-[#FDEEDF] text-[#C2650A]" : "bg-surface-soft text-text-secondary"
    }`}>
      <span className={feito ? "orbi-check-pop" : ""} key={feito ? "check" : "pending"}>
        {feito ? "✓" : continuo ? "∞" : n}
      </span>
    </span>
  );

  const conteudo = (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      {bolinha}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-[15px] font-semibold ${feito ? "text-text-tertiary line-through" : ""}`}>{titulo}</p>
          {badge && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1F9E4C] px-1.5 text-[11px] font-bold text-white">{badge}</span>}
          {(href || onClick) && <span className="ml-auto text-text-tertiary">→</span>}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">{desc}</p>
        {children}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="py-1">{conteudo}</Link>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} className="w-full py-1 text-left">{conteudo}</button>;
  }
  return <div className="py-1">{conteudo}</div>;
}

/** Tela cheia com a análise completa do site: o que a Orbi entendeu do
 * negócio, mais uma leitura de mercado (desafios e oportunidades), num
 * tom de consultoria. Cada bloco vive no seu próprio card, com ícone
 * colorido, pra ficar parecido com a página pública do negócio. */
function AnaliseSiteModal({ aberto, onFechar, resultado, orbiColors }: { aberto: boolean; onFechar: () => void; resultado: ResultadoImport; orbiColors?: string[] | null }) {
  if (typeof document === "undefined" || !aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] mx-auto flex max-w-[440px] flex-col bg-background-main">
      <header className="flex shrink-0 items-center gap-3 border-b border-divider bg-surface-white px-4 py-3">
        <button onClick={onFechar} aria-label="Voltar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <p className="min-w-0 flex-1 text-[15px] font-semibold leading-tight">Análise do site</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Capa: a Orbi assinando a análise */}
        <div className="orbi-card-light relative overflow-hidden rounded-[28px] px-6 py-7">
          <span className="relative mx-auto block h-16 w-16 overflow-hidden rounded-full">
            <OrbiParticleSphere size={64} colors={orbiColors ?? undefined} vivid className="rounded-full" />
          </span>
          <p className="relative mt-4 text-center font-[family-name:var(--font-manrope)] text-[26px] font-semibold leading-[1.15] tracking-[-0.01em] text-on-background">
            Li seu site inteiro
          </p>
          <p className="relative mt-2 text-center text-[14.5px] leading-relaxed text-text-secondary">
            Aqui está o que entendi do seu negócio e como vejo o seu mercado hoje.
          </p>
        </div>

        {resultado.about && (
          <Bloco titulo="Sobre o negócio" icone="◆" corIcone="#111318" fundoIcone="#ECEDE9">
            <p className="text-[15.5px] leading-[1.65] text-on-background">{resultado.about}</p>
          </Bloco>
        )}

        {resultado.differentials && resultado.differentials.length > 0 && (
          <Bloco titulo="Diferenciais" icone="✦" corIcone="#1F9E4C" fundoIcone="#DEF3E3">
            <ListaTopicos
              itens={resultado.differentials}
              corIcone="#1F9E4C"
              fundoIcone="#DEF3E3"
              usarIconeDoItem
            />
          </Bloco>
        )}

        {resultado.challenges && resultado.challenges.length > 0 && (
          <Bloco titulo="Desafios do mercado" icone="▲" corIcone="#C2650A" fundoIcone="#FDEEDF">
            <ListaTopicos itens={resultado.challenges} corIcone="#C2650A" fundoIcone="#FDEEDF" iconePadrao="▲" />
          </Bloco>
        )}

        {resultado.opportunities && resultado.opportunities.length > 0 && (
          <Bloco titulo="Oportunidades" icone="↗" corIcone="#1D4ED8" fundoIcone="#E2EAFE">
            <ListaTopicos itens={resultado.opportunities} corIcone="#1D4ED8" fundoIcone="#E2EAFE" iconePadrao="↗" />
          </Bloco>
        )}

        {resultado.policies && (
          <Bloco titulo="Políticas identificadas" icone="◫" corIcone="#555960" fundoIcone="#ECEDE9">
            <p className="text-[15px] leading-[1.65] text-text-secondary">{resultado.policies}</p>
          </Bloco>
        )}

        {/* Aviso de uso, no fim: já viu tudo, agora sabe o que acontece com isso */}
        <div className="mt-4 rounded-[24px] border border-divider bg-surface-white px-5 py-5">
          <p className="text-[14.5px] font-semibold text-on-background">O que acontece agora</p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            Essas informações vão montar a página do seu negócio dentro do Orbibox. Você pode editar tudo depois, quando quiser, nas Configurações.
          </p>
        </div>

        <button
          onClick={onFechar}
          className="mt-5 w-full rounded-full bg-on-background py-4 text-[15px] font-semibold text-white"
        >
          Voltar à configuração da IA
        </button>
      </div>
    </div>,
    document.body
  );
}

/** Card branco de uma seção da análise, com título e ícone colorido. */
function Bloco({ titulo, icone, corIcone, fundoIcone, children }: {
  titulo: string; icone: string; corIcone: string; fundoIcone: string; children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-[24px] border border-divider bg-surface-white px-5 py-5">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px]"
          style={{ backgroundColor: fundoIcone, color: corIcone }}
        >
          {icone}
        </span>
        <p className="font-[family-name:var(--font-manrope)] text-[17px] font-semibold leading-tight">{titulo}</p>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Lista de tópicos (diferencial, desafio, oportunidade) com bolinha colorida. */
function ListaTopicos({ itens, corIcone, fundoIcone, iconePadrao, usarIconeDoItem }: {
  itens: { title: string; description: string; icon?: string }[];
  corIcone: string;
  fundoIcone: string;
  iconePadrao?: string;
  usarIconeDoItem?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {itens.map((t, i) => (
        <div key={i} className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]"
            style={{ backgroundColor: fundoIcone, color: corIcone }}
          >
            {usarIconeDoItem ? t.icon ?? "✦" : iconePadrao ?? "✦"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-semibold leading-snug text-on-background">{t.title}</p>
            {t.description && <p className="mt-1 text-[14.5px] leading-[1.6] text-text-secondary">{t.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
