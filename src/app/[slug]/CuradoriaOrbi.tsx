"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { formatPrice } from "@/lib/showcase";
import { OrbiInsightCard, OrbiInsightHeader, OrbiSparkle } from "@/components/orbi/OrbiInsightCard";

type Product = { id: string; title: string; price: number | null; price_type: string | null; price_max: number | null; image_url: string | null };

export function CuradoriaOrbi({
  businessId,
  slug,
  orbiColors,
  products,
  agentName = "Orbi",
  onAskOrbi,
  compact = false,
}: {
  businessId: string;
  slug: string;
  orbiColors: string[] | null;
  products: Product[];
  agentName?: string;
  onAskOrbi?: (question?: string) => void;
  compact?: boolean;
}) {
  const [pergunta, setPergunta] = useState<string | null>(null);
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [frase, setFrase] = useState<string | null>(null);
  const [curados, setCurados] = useState<Product[]>([]);
  const [curating, setCurating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Tela cheia com a frase em destaque — abre ao tocar no resultado pronto.
  // Renderizada via portal (direto no body) porque, dentro da árvore normal,
  // um ancestral com transform/overflow quebra o "fixed" e a tela cheia
  // aparecia duplicada, empurrada pra baixo do card em vez de cobrir tudo.
  const [expanded, setExpanded] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancel = false;
    fetch("/api/curate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, mode: "questions" }) })
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        setPergunta(d.pergunta ?? null);
        setOpcoes(d.opcoes ?? []);
        setLoadingQ(false);
      })
      .catch(() => { if (!cancel) setLoadingQ(false); });
    return () => { cancel = true; };
  }, [businessId]);

  async function escolher(opcao: string) {
    setEscolhida(opcao);
    setCurating(true);
    setFrase(null);
    setCurados([]);
    try {
      const r = await fetch("/api/curate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, mode: "curate", question: opcao }) });
      const d = await r.json();
      setFrase(d.frase ?? null);
      const map = new Map(products.map((p) => [p.id, p]));
      setCurados((d.ids ?? []).map((id: string) => map.get(id)).filter(Boolean));
    } catch {
      setFrase("Não consegui montar agora, mas dá uma olhada na vitrine abaixo!");
    } finally {
      setCurating(false);
    }
  }

  function resetar() {
    setEscolhida(null);
    setFrase(null);
    setCurados([]);
    setExpanded(false);
  }

  function enviarPergunta(e: FormEvent) {
    e.preventDefault();
    const q = followUp.trim();
    setExpanded(false);
    onAskOrbi?.(q || undefined);
  }

  // Sem pergunta gerada (catálogo vazio ou falha) — não mostra nada.
  if (!loadingQ && !pergunta) return null;

  const pronto = !!escolhida && !curating && !!frase;

  return (
    <>
      <OrbiInsightCard className={compact ? "" : ""}>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2" onClick={() => { if (pronto) setExpanded(true); }}>
            <OrbiInsightHeader />
          </div>
          <button
            onClick={() => setShowHelp((v) => !v)}
            aria-label="Como funciona"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/50 text-[11px] font-bold text-text-secondary"
          >
            ?
          </button>
        </div>
        {showHelp && (
          <p className="mt-2 rounded-2xl bg-white/40 p-3 text-[13px] leading-relaxed text-text-secondary">
            A Orbi é a inteligência artificial daqui. Ela entende o que você procura e separa, do catálogo, as opções que
            mais combinam com você — como um atendente que já te conhece.
          </p>
        )}

        {loadingQ ? (
          <p className="mt-3 text-[15px] text-text-tertiary">Pensando na melhor pergunta pra você…</p>
        ) : !escolhida ? (
          <>
            <p className="mt-3 font-[family-name:var(--font-manrope)] text-[20px] font-medium leading-tight tracking-[-0.01em]">{pergunta}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {opcoes.map((o) => (
                <button
                  key={o}
                  onClick={() => escolher(o)}
                  className="rounded-full border border-divider bg-white/50 px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-on-background"
                >
                  {o}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-3 flex items-start justify-between gap-3">
              <p className="text-[15px] font-medium leading-snug">{escolhida}</p>
              <button onClick={resetar} className="shrink-0 text-[12px] text-text-tertiary underline">trocar</button>
            </div>

            {curating ? (
              <div className="mt-3 flex items-center gap-2.5">
                <OrbiParticleSphere size={30} colors={orbiColors ?? undefined} vivid className="rounded-full" />
                <span className="text-[13px] text-text-tertiary">Separando as melhores pra você…</span>
              </div>
            ) : (
              <>
                {/* Prévia curta — a fonte grande só entra quando abre a tela cheia. */}
                {frase && (
                  <button onClick={() => setExpanded(true)} className="mt-3 flex w-full items-start gap-2 text-left">
                    <span className="flex-1 text-[14px] leading-relaxed text-text-secondary">{frase}</span>
                    <span className="mt-0.5 shrink-0 text-[13px] text-text-tertiary">⤢</span>
                  </button>
                )}
                {curados.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2.5">
                    {curados.map((p) => (
                      <a
                        key={p.id}
                        href={`/${slug}/p/${p.id}`}
                        className="flex items-center gap-3.5 rounded-2xl bg-white/40 p-2.5"
                      >
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.title} className="shrink-0 rounded-xl object-cover" style={{ height: 64, width: 64 }} />
                        ) : (
                          <span className="flex shrink-0 items-center justify-center rounded-xl bg-white/60 text-[20px]" style={{ height: 64, width: 64 }}>✦</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{p.title}</span>
                          <span className="block text-[13px] text-text-secondary">{formatPrice(p) || "Ver detalhes"}</span>
                        </span>
                        <span className="shrink-0 pr-1 text-[18px] text-text-tertiary">→</span>
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </OrbiInsightCard>

      {/* Tela cheia — mesma referência que a Orbi usava como "Zara IA":
          seta de voltar, frase em destaque, e campo pra continuar perguntando.
          Portal pro body: garante "fixed" cobrindo a tela de verdade, sem
          depender de nenhum ancestral não-transformado. */}
      {mounted && expanded && frase && createPortal(
        <div className="orbi-card-light fixed inset-0 z-[9999] mx-auto flex max-w-[440px] flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-8">
            <button
              onClick={() => setExpanded(false)}
              aria-label="Voltar"
              className="flex h-11 w-11 items-center justify-center rounded-full orbi-gradient"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111318" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">{agentName} IA</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-8" style={{ WebkitOverflowScrolling: "touch" }}>
            <p className="font-[family-name:var(--font-manrope)] text-[32px] font-medium leading-[1.15] tracking-[-0.01em] text-on-background">
              &ldquo;{frase}&rdquo;
            </p>
            <span className="mt-6 flex gap-1.5" aria-hidden>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-tertiary/50" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-tertiary/50" style={{ animationDelay: "0.15s" }} />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-tertiary/50" style={{ animationDelay: "0.3s" }} />
            </span>

            {curados.length > 0 && (
              <div className="mt-8 flex flex-col gap-2.5">
                {curados.map((p) => (
                  <a
                    key={p.id}
                    href={`/${slug}/p/${p.id}`}
                    className="flex items-center gap-3.5 rounded-2xl bg-white/50 p-2.5"
                  >
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.title} className="shrink-0 rounded-xl object-cover" style={{ height: 64, width: 64 }} />
                    ) : (
                      <span className="flex shrink-0 items-center justify-center rounded-xl bg-white/60 text-[20px]" style={{ height: 64, width: 64 }}>
                        <OrbiSparkle size={20} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{p.title}</span>
                      <span className="block text-[13px] text-text-secondary">{formatPrice(p) || "Ver detalhes"}</span>
                    </span>
                    <span className="shrink-0 pr-1 text-[18px] text-text-tertiary">→</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={enviarPergunta} className="px-6 pb-8 pt-3">
            <div className="flex items-center gap-2 rounded-full bg-white/70 px-5 py-3.5 shadow-[0_8px_30px_rgba(17,19,24,0.10)]">
              <input
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder={`Perguntar algo à ${agentName}…`}
                className="flex-1 bg-transparent text-[14px] outline-none"
              />
              <button type="submit" aria-label="Perguntar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-tertiary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.5 8.5 0 01-12.8 7.3L3 20l1.2-5.2A8.5 8.5 0 1121 11.5z" />
                </svg>
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </>
  );
}
