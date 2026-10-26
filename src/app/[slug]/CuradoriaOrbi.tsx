"use client";

import { useState, useEffect, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { formatPrice } from "@/lib/showcase";
import { OrbiSparkle } from "@/components/orbi/OrbiInsightCard";

type Product = { id: string; title: string; price: number | null; price_type: string | null; price_max: number | null; image_url: string | null };

export function CuradoriaOrbi({
  businessId,
  slug,
  orbiColors,
  products,
  agentName = "Orbi",
  onAskOrbi,
  onGift,
}: {
  businessId: string;
  slug: string;
  orbiColors: string[] | null;
  products: Product[];
  agentName?: string;
  onAskOrbi?: (question?: string) => void;
  onGift?: () => void;
  compact?: boolean;
}) {
  const [pergunta, setPergunta] = useState<string | null>(null);
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [frase, setFrase] = useState<string | null>(null);
  // Convite pra falar com uma pessoa agora, com o WhatsApp do negócio.
  // É o passo que faltava: a Orbi mostrava os itens e parava por aí.
  const [convite, setConvite] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [curados, setCurados] = useState<Product[]>([]);
  const [curating, setCurating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Tela cheia com a frase em destaque, abre ao tocar no resultado pronto.
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
    // "Para presente" não é uma resposta de curadoria normal: abre o fluxo
    // de gift card de verdade (montar valor, pra quem, liberar por
    // WhatsApp), em vez de a Orbi tentar recomendar produtos pra isso.
    if (onGift && opcao.toLowerCase().includes("presente")) {
      onGift();
      return;
    }
    setEscolhida(opcao);
    setCurating(true);
    setFrase(null);
    setCurados([]);
    try {
      const r = await fetch("/api/curate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, mode: "curate", question: opcao }) });
      const d = await r.json();
      if (!r.ok || !d.frase) throw new Error("curadoria");
      // Os itens vêm completos do servidor; o que já está na tela só complementa.
      const map = new Map(products.map((p) => [p.id, p]));
      const lista: Product[] = Array.isArray(d.itens) && d.itens.length > 0
        ? (d.itens as Product[])
        : (d.ids ?? []).map((id: string) => map.get(id)).filter((x: Product | undefined): x is Product => !!x);
      // Nunca promete opções sem mostrar: sem itens, usa os primeiros da vitrine.
      const final = lista.length > 0 ? lista : products.slice(0, 4);
      setCurados(final);
      setFrase(lista.length > 0 ? d.frase : final.length > 0 ? "Estas são algumas opções da vitrine:" : "Não achei algo exato pra isso. Dá uma olhada no catálogo ou fala com a gente.");
      setConvite(d.convite ?? null);
      setWhatsapp(d.whatsapp ?? null);
    } catch {
      setCurados(products.slice(0, 4));
      setFrase(products.length > 0 ? "Estas são algumas opções da vitrine:" : "Não consegui montar agora, mas dá uma olhada no catálogo abaixo!");
    } finally {
      setCurating(false);
    }
  }

  function resetar() {
    setEscolhida(null);
    setFrase(null);
    setConvite(null);
    setWhatsapp(null);
    setCurados([]);
    setExpanded(false);
  }

  function enviarPergunta(e: FormEvent) {
    e.preventDefault();
    const q = followUp.trim();
    setExpanded(false);
    onAskOrbi?.(q || undefined);
  }

  // Sem pergunta gerada (catálogo vazio ou falha), não mostra nada.
  if (!loadingQ && !pergunta) return null;

  return (
    <>
      <div className="flex flex-col gap-3.5 py-3">
        {/* Pergunta da Orbi, em balão de conversa. */}
        <div className="orbi-linha-entra flex items-end gap-3">
          <span className="orbi-thinking shrink-0"><OrbiParticleSphere size={52} colors={orbiColors ?? undefined} vivid className="rounded-full" /></span>
          <div className="relative max-w-[90%] rounded-[26px] rounded-bl-md bg-white/55 backdrop-blur-md ring-1 ring-white/80 px-5 py-4 shadow-[0_8px_24px_-10px_rgba(17,19,24,0.18)]">
            {loadingQ ? (
              <p className="text-[14px] text-text-tertiary">Pensando numa pergunta pra você…</p>
            ) : (
              <p className="pr-6 font-[family-name:var(--font-manrope)] text-[21px] font-medium leading-snug tracking-[-0.01em]">{pergunta}</p>
            )}
            <button
              onClick={() => setShowHelp((v) => !v)}
              aria-label="Como funciona"
              className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-surface-soft text-[11px] text-text-tertiary"
            >
              ?
            </button>
          </div>
        </div>
        {showHelp && (
          <p className="ml-9 rounded-2xl bg-surface-soft p-3 text-[12.5px] leading-relaxed text-text-secondary">
            A Orbi é a inteligência artificial daqui. Ela entende o que você procura e separa, do catálogo, as opções que
            mais combinam com você.
          </p>
        )}

        {loadingQ ? null : !escolhida ? (
          <div className="grid grid-cols-2 gap-2.5">
            {opcoes.map((o, i) => (
              <button
                key={o}
                onClick={() => escolher(o)}
                style={{ animationDelay: `${0.25 + i * 0.1}s, ${i * 0.45}s` }}
                className="chip-orbi flex min-h-[64px] cursor-pointer items-center justify-center rounded-[22px] border border-white/80 bg-white/60 px-4 py-3 text-center text-[16px] font-medium leading-tight shadow-[0_8px_22px_-12px_rgba(17,19,24,0.25)] backdrop-blur-md transition-transform active:scale-95"
              >
                {o}
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* A resposta da pessoa, balão à direita. */}
            <div className="flex flex-col items-end gap-0.5">
              <p className="max-w-[80%] rounded-2xl rounded-br-md bg-on-background px-3.5 py-2 text-[14px] text-white">{escolhida}</p>
              <button onClick={resetar} className="cursor-pointer text-[11.5px] text-text-tertiary underline">trocar</button>
            </div>

            {curating ? (
              <div className="flex items-end gap-2">
                <OrbiParticleSphere size={28} colors={orbiColors ?? undefined} vivid className="shrink-0 rounded-full" />
                <p className="rounded-2xl rounded-bl-md bg-white/45 backdrop-blur-md ring-1 ring-white/70 px-3.5 py-2.5 text-[13.5px] text-text-tertiary shadow-[0_2px_10px_rgba(17,19,24,0.06)]">Separando as melhores pra você…</p>
              </div>
            ) : (
              <>
                {frase && (
                  <div className="flex items-end gap-2">
                    <OrbiParticleSphere size={28} colors={orbiColors ?? undefined} vivid className="shrink-0 rounded-full" />
                    <button onClick={() => setExpanded(true)} className="max-w-[88%] cursor-pointer rounded-2xl rounded-bl-md bg-white/45 backdrop-blur-md ring-1 ring-white/70 px-3.5 py-2.5 text-left shadow-[0_2px_10px_rgba(17,19,24,0.06)]">
                      <span className="line-clamp-3 text-[14px] leading-snug">{frase}</span>
                    </button>
                  </div>
                )}
                {curados.length > 0 && (
                  <div className="ml-9 flex flex-col gap-1.5">
                    {curados.map((p) => (
                      <a
                        key={p.id}
                        href={`/${slug}/p/${p.id}`}
                        className="flex items-center gap-3 rounded-2xl bg-white/45 backdrop-blur-md ring-1 ring-white/70 p-2 shadow-[0_2px_10px_rgba(17,19,24,0.05)]"
                      >
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt={p.title} className="shrink-0 rounded-xl object-cover" style={{ height: 44, width: 44 }} />
                        ) : (
                          <span className="flex shrink-0 items-center justify-center rounded-xl bg-surface-soft text-[16px]" style={{ height: 44, width: 44 }}>✦</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">{p.title}</span>
                          <span className="block truncate text-[12.5px] text-text-secondary">{formatPrice(p) || "Ver detalhes"}</span>
                        </span>
                        <span className="shrink-0 pr-1 text-[16px] text-text-tertiary">→</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Convite pra falar com uma pessoa agora. */}
                {convite && whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, eu vim pelo seu Orbibox e me interessei por ${escolhida ?? "isso"}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-9 flex items-center justify-center gap-2 rounded-full bg-[#1F9E4C] py-2.5 text-[13.5px] font-semibold text-white"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .7.5l.9 2.1c.1.2.1.4 0 .6l-.4.5-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.5.3.1.5.1.6 0l.9-1c.2-.2.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.5z" />
                    </svg>
                    {convite}
                  </a>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Tela cheia, mesma referência que a Orbi usava como "Zara IA":
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

                {/* Convite pra falar com uma pessoa agora. Mostrar item e
                    parar ali deixava o visitante sem próximo passo. */}
                {convite && whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, eu vim pelo seu Orbibox e me interessei por ${escolhida ?? "isso"}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#1F9E4C] py-3.5 text-[14.5px] font-semibold text-white"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 2a10 10 0 00-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1012 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .7.5l.9 2.1c.1.2.1.4 0 .6l-.4.5-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.5.3.1.5.1.6 0l.9-1c.2-.2.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.5z" />
                    </svg>
                    {convite}
                  </a>
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
