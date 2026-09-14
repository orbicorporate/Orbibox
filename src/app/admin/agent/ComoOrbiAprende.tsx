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
 * tom de consultoria. Fecha com um botão grande de volta pra configuração. */
function AnaliseSiteModal({ aberto, onFechar, resultado, orbiColors }: { aberto: boolean; onFechar: () => void; resultado: ResultadoImport; orbiColors?: string[] | null }) {
  if (typeof document === "undefined" || !aberto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] mx-auto flex max-w-[440px] flex-col bg-background-main">
      <header className="flex items-center gap-3 border-b border-divider bg-surface-white px-4 py-3">
        <button onClick={onFechar} aria-label="Voltar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <OrbiParticleSphere size={32} colors={orbiColors ?? undefined} className="rounded-full" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight">Análise do site</p>
          <p className="text-[12px] text-text-tertiary">feita pela Orbi</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="rounded-2xl bg-surface-soft px-4 py-3.5">
          <p className="text-[12.5px] leading-relaxed text-text-secondary">
            Essas informações vão ser usadas pra montar a página do seu negócio dentro do Orbibox. Você pode editar tudo depois, a qualquer momento, nas Configurações.
          </p>
        </div>

        {resultado.about && (
          <Secao titulo="Sobre o negócio">
            <p className="text-[14.5px] leading-relaxed text-on-background">{resultado.about}</p>
          </Secao>
        )}

        {resultado.differentials && resultado.differentials.length > 0 && (
          <Secao titulo="Diferenciais">
            <div className="flex flex-col gap-3">
              {resultado.differentials.map((d, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-[14px]">{d.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-on-background">{d.title}</p>
                    {d.description && <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">{d.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Secao>
        )}

        {resultado.challenges && resultado.challenges.length > 0 && (
          <Secao titulo="Desafios do mercado" tom="alerta">
            <div className="flex flex-col gap-3">
              {resultado.challenges.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-[14px]">▲</span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-on-background">{t.title}</p>
                    {t.description && <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">{t.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Secao>
        )}

        {resultado.opportunities && resultado.opportunities.length > 0 && (
          <Secao titulo="Oportunidades" tom="positivo">
            <div className="flex flex-col gap-3">
              {resultado.opportunities.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-[14px]">↗</span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-on-background">{t.title}</p>
                    {t.description && <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">{t.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Secao>
        )}

        {resultado.policies && (
          <Secao titulo="Políticas identificadas">
            <p className="text-[14px] leading-relaxed text-text-secondary">{resultado.policies}</p>
          </Secao>
        )}

        <button
          onClick={onFechar}
          className="mt-8 w-full rounded-full bg-on-background py-4 text-[15px] font-semibold text-white"
        >
          ← Voltar à configuração da IA
        </button>
      </div>
    </div>,
    document.body
  );
}

function Secao({ titulo, children, tom }: { titulo: string; children: React.ReactNode; tom?: "alerta" | "positivo" }) {
  const cor = tom === "alerta" ? "text-[#C2650A]" : tom === "positivo" ? "text-[#1F9E4C]" : "text-text-tertiary";
  return (
    <div className="mt-6 border-t border-divider pt-6 first:mt-5 first:border-t-0 first:pt-5">
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${cor}`}>{titulo}</p>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}
