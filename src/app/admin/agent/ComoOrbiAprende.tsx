"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { OrbiEntrevista } from "./OrbiEntrevista";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { createClient } from "@/lib/supabase/client";

type Diferencial = { icon: string; title: string; description: string };
type Topico = { title: string; description: string };
type ResultadoImport = {
  about?: string;
  differentials?: Diferencial[];
  policies?: string;
  strengths?: Topico[];
  challenges?: Topico[];
  opportunities?: Topico[];
};

export function ComoOrbiAprende({ businessId, businessName, orbiColors, gapsPendentes = 0, baseFeita = false, siteSalvo = null, onDone }: { businessId: string; businessName: string; orbiColors?: string[] | null; gapsPendentes?: number; baseFeita?: boolean; siteSalvo?: string | null; onDone?: () => void }) {
  const router = useRouter();
  // O site já veio do cadastro: não pede de novo, só oferece ler outra vez.
  const [url, setUrl] = useState(siteSalvo ?? "");
  const dominio = (siteSalvo ?? "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  const [importando, setImportando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [site, setSite] = useState<"idle" | "form">("idle");
  const [feito, setFeito] = useState(baseFeita);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [analiseAberta, setAnaliseAberta] = useState(false);

  // Recupera a análise já salva, pra quem volta depois: o botão de ver
  // análise continua aparecendo em vez de sumir no refresh.
  useEffect(() => {
    let cancel = false;
    const supabase = createClient();
    supabase
      .from("businesses")
      .select("site_analysis")
      .eq("id", businessId)
      .single()
      .then(({ data }) => {
        if (cancel || !data?.site_analysis) return;
        setResultado(data.site_analysis as ResultadoImport);
      });
    return () => { cancel = true; };
  }, [businessId]);

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

      const analise: ResultadoImport = {
        about: data.about,
        differentials: data.differentials,
        strengths: data.strengths,
        policies: data.policies,
        challenges: data.challenges,
        opportunities: data.opportunities,
      };

      // Grava de fato no negócio: é isso que alimenta a página pública e
      // faz o passo continuar marcado como concluído depois do refresh.
      const supabase = createClient();
      const update: {
        site_analysis: ResultadoImport;
        about_business?: string;
        differentials_cards?: Diferencial[];
        differentials?: string;
        policies?: string;
      } = { site_analysis: analise };
      if (data.about) update.about_business = data.about;
      if (Array.isArray(data.differentials) && data.differentials.length > 0) {
        update.differentials_cards = data.differentials;
        update.differentials = data.differentials
          .map((d: Diferencial) => (d.description ? `${d.title}: ${d.description}` : d.title))
          .join("\n");
      }
      if (data.policies) update.policies = data.policies;
      await supabase.from("businesses").update(update).eq("id", businessId);

      setFeito(true);
      setResultado(analise);
      setSite("idle");
      onDone?.();
      router.refresh();
    } catch {
      setErro("Erro ao ler o site. Tente de novo.");
    } finally {
      setImportando(false);
    }
  }

  const temAnalise = !!resultado && (!!resultado.about || (resultado.differentials?.length ?? 0) > 0);

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
          titulo={dominio ? "Ler seu site" : "Importe seu site"}
          desc={
            dominio
              ? feito
                ? `Ela já leu ${dominio} no cadastro. Toque pra ler de novo.`
                : `${dominio}, do seu cadastro. Toque pra ela ler.`
              : feito
              ? "Base do negócio já registrada. Toque pra reforçar."
              : "O jeito mais rápido: ela lê em segundos."
          }
          onClick={() => setSite((s) => (s === "form" ? "idle" : "form"))}
        >
          {temAnalise && (
            <button
              onClick={(e) => { e.stopPropagation(); setAnaliseAberta(true); }}
              className="orbi-green-gradient mt-2.5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              ✓ Ver análise do site →
            </button>
          )}

          {site === "form" ? (
            <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
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
                  {importando ? "Lendo…" : dominio && url.trim() === (siteSalvo ?? "").trim() ? "Ler de novo" : "Ler"}
                </button>
              </div>
              {erro && <p className="mt-1.5 text-[12px] text-red-600">{erro}</p>}

              {importando && (
                <div className="mt-3 flex items-center gap-2.5 px-1 py-2">
                  <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
                    <OrbiParticleSphere size={24} colors={orbiColors ?? undefined} className="rounded-full" />
                  </span>
                  <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-divider/40">
                    <span className="orbi-progress-bar orbi-gradient block h-full rounded-full shadow-[0_0_8px_rgba(110,231,216,0.9)]" />
                  </span>
                  <span className="shrink-0 text-[11.5px] text-text-tertiary">analisando…</span>
                </div>
              )}
            </div>
          ) : temAnalise ? (
            <button
              onClick={(e) => { e.stopPropagation(); setSite("form"); }}
              className="ml-2 mt-2.5 inline-flex items-center rounded-full bg-surface-soft px-4 py-2.5 text-[13px] font-semibold text-text-secondary"
            >
              Enviar outro site
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
      feito ? "orbi-green-gradient text-white" : continuo ? "bg-[#FDEEDF] text-[#C2650A]" : "bg-surface-soft text-text-secondary"
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
          {badge && <span className="orbi-green-gradient flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white">{badge}</span>}
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

/** Tela cheia com a análise completa do site. Cada bloco vive no seu
 * próprio card, com ícone colorido e numeração, no mesmo espírito da
 * página pública do negócio. */
function AnaliseSiteModal({ aberto, onFechar, resultado, orbiColors }: { aberto: boolean; onFechar: () => void; resultado: ResultadoImport; orbiColors?: string[] | null }) {
  if (typeof document === "undefined" || !aberto) return null;

  // O texto vem com quebras duplas, um parágrafo por bloco.
  const paragrafos = (resultado.about ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return createPortal(
    <div className="fixed inset-0 z-[9999] mx-auto flex max-w-[440px] flex-col bg-background-main">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 border-b border-divider/50 bg-surface-white/70 px-4 py-3 backdrop-blur-xl">
        <button onClick={onFechar} aria-label="Voltar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <p className="min-w-0 flex-1 text-[15px] font-semibold leading-tight">Análise do site</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10" style={{ paddingTop: "66px", WebkitOverflowScrolling: "touch" }}>
        {/* Capa: a Orbi assinando a análise */}
        <div className="orbi-card-light relative overflow-hidden rounded-[30px] px-6 py-8">
          <span className="relative mx-auto block h-[72px] w-[72px] overflow-hidden rounded-full">
            <OrbiParticleSphere size={72} colors={orbiColors ?? undefined} vivid className="rounded-full" />
          </span>
          <p className="relative mt-5 text-center font-[family-name:var(--font-manrope)] text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-on-background">
            Li seu site inteiro
          </p>
          <p className="relative mt-3 text-center text-[15.5px] leading-relaxed text-text-secondary">
            Aqui está o que entendi do seu negócio e como vejo o seu mercado hoje.
          </p>
        </div>

        {paragrafos.length > 0 && (
          <Bloco titulo="Sobre o negócio" icone="◆" corIcone="#111318" fundoIcone="#ECEDE9">
            <div className="flex flex-col gap-4">
              {paragrafos.map((p, i) => (
                <p key={i} className="text-[16px] leading-[1.7] text-on-background">{p}</p>
              ))}
            </div>
          </Bloco>
        )}

        {resultado.differentials && resultado.differentials.length > 0 && (
          <Bloco titulo="Diferenciais" icone="✦" corIcone="#1F9E4C" fundoIcone="#DEF3E3">
            <ListaTopicos itens={resultado.differentials} corIcone="#1F9E4C" fundoIcone="#DEF3E3" usarIconeDoItem />
          </Bloco>
        )}

        {resultado.strengths && resultado.strengths.length > 0 && (
          <Bloco
            titulo="Pontos fortes"
            icone="◆"
            corIcone="#6D28D9"
            fundoIcone="#EDE6FC"
            legenda="A capacidade instalada que sustenta o negócio."
          >
            <ListaTopicos itens={resultado.strengths} corIcone="#6D28D9" fundoIcone="#EDE6FC" numerado />
          </Bloco>
        )}

        {resultado.challenges && resultado.challenges.length > 0 && (
          <Bloco
            titulo="Desafios do mercado"
            icone="▲"
            corIcone="#C2650A"
            fundoIcone="#FDEEDF"
            legenda="O que pressiona quem atua nesse segmento hoje."
          >
            <ListaTopicos itens={resultado.challenges} corIcone="#C2650A" fundoIcone="#FDEEDF" numerado />
          </Bloco>
        )}

        {resultado.opportunities && resultado.opportunities.length > 0 && (
          <Bloco
            titulo="Oportunidades"
            icone="↗"
            corIcone="#1D4ED8"
            fundoIcone="#E2EAFE"
            legenda="Por onde dá pra crescer a partir do que já existe."
          >
            <ListaTopicos itens={resultado.opportunities} corIcone="#1D4ED8" fundoIcone="#E2EAFE" numerado />
          </Bloco>
        )}

        {resultado.policies && (
          <Bloco titulo="Políticas identificadas" icone="◫" corIcone="#555960" fundoIcone="#ECEDE9">
            <p className="text-[15.5px] leading-[1.7] text-text-secondary">{resultado.policies}</p>
          </Bloco>
        )}

        <div className="mt-4 rounded-[26px] border border-divider bg-surface-white px-6 py-6">
          <p className="font-[family-name:var(--font-manrope)] text-[16.5px] font-semibold text-on-background">O que acontece agora</p>
          <p className="mt-2.5 text-[15px] leading-[1.65] text-text-secondary">
            Essas informações vão montar a página do seu negócio dentro do Orbibox. Você pode editar tudo depois, quando quiser, nas Configurações.
          </p>
        </div>

        <button
          onClick={onFechar}
          className="mt-5 w-full rounded-full bg-on-background py-4 text-[15.5px] font-semibold text-white"
        >
          Voltar à configuração da IA
        </button>
      </div>
    </div>,
    document.body
  );
}

/** Card branco de uma seção da análise, com título, ícone colorido e uma
 * legenda opcional explicando o que aquele bloco significa. */
function Bloco({ titulo, icone, corIcone, fundoIcone, legenda, children }: {
  titulo: string; icone: string; corIcone: string; fundoIcone: string; legenda?: string; children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-[26px] border border-divider bg-surface-white px-6 py-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px]"
          style={{ backgroundColor: fundoIcone, color: corIcone }}
        >
          {icone}
        </span>
        <p className="font-[family-name:var(--font-manrope)] text-[19px] font-semibold leading-tight tracking-[-0.01em]">{titulo}</p>
      </div>
      {legenda && <p className="mt-2 text-[13.5px] leading-snug text-text-tertiary">{legenda}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** Lista de tópicos (diferencial, ponto forte, desafio, oportunidade).
 * Cada item tem sua bolinha colorida, numerada ou com glifo. */
function ListaTopicos({ itens, corIcone, fundoIcone, numerado, usarIconeDoItem }: {
  itens: { title: string; description: string; icon?: string }[];
  corIcone: string;
  fundoIcone: string;
  numerado?: boolean;
  usarIconeDoItem?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {itens.map((t, i) => (
        <div key={i} className="flex items-start gap-3.5">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
            style={{ backgroundColor: fundoIcone, color: corIcone }}
          >
            {numerado ? i + 1 : usarIconeDoItem ? t.icon ?? "✦" : "✦"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold leading-snug tracking-[-0.01em] text-on-background">{t.title}</p>
            {t.description && <p className="mt-1.5 text-[15.5px] leading-[1.6] text-text-secondary">{t.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
