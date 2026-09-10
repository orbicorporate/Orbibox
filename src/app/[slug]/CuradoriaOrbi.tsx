"use client";

import { useState, useEffect } from "react";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { formatPrice } from "@/lib/showcase";

type Product = { id: string; title: string; price: number | null; price_type: string | null; price_max: number | null; image_url: string | null };

export function CuradoriaOrbi({
  businessId,
  slug,
  orbiColors,
  products,
  compact = false,
}: {
  businessId: string;
  slug: string;
  orbiColors: string[] | null;
  products: Product[];
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
  }

  // Sem pergunta gerada (catálogo vazio ou falha) — não mostra nada.
  if (!loadingQ && !pergunta) return null;

  return (
    <div className={`rounded-[24px] bg-surface-white p-5 shadow-[0_2px_14px_rgba(17,19,24,0.06)] ${compact ? "" : ""}`}>
      <div className="flex items-center gap-2.5">
        <OrbiParticleSphere size={32} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        <span className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Orbi recomenda</span>
        <button
          onClick={() => setShowHelp((v) => !v)}
          aria-label="Como funciona"
          className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-soft text-[11px] font-bold text-text-secondary"
        >
          ?
        </button>
      </div>
      {showHelp && (
        <p className="mt-2 rounded-2xl bg-surface-soft p-3 text-[13px] leading-relaxed text-text-secondary">
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
                className="rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-on-background"
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
              {frase && <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{frase}</p>}
              {curados.length > 0 && (
                <div className="mt-3 flex flex-col gap-2.5">
                  {curados.map((p) => (
                    <a
                      key={p.id}
                      href={`/${slug}/p/${p.id}`}
                      className="flex items-center gap-3.5 rounded-2xl bg-surface-soft p-2.5"
                    >
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt={p.title} className="shrink-0 rounded-xl object-cover" style={{ height: 64, width: 64 }} />
                      ) : (
                        <span className="flex shrink-0 items-center justify-center rounded-xl bg-surface-white text-[20px]" style={{ height: 64, width: 64 }}>✦</span>
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
    </div>
  );
}
