"use client";

import { useState } from "react";
import Link from "next/link";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type TopItem = { title: string; image_url: string | null; clicks: number };

export function PulseRecomendacao({
  businessId,
  topItem,
  hasAiChat,
  orbiColors,
}: {
  businessId: string;
  topItem: TopItem | null;
  hasAiChat: boolean;
  orbiColors: string[] | null;
}) {
  const [tipo, setTipo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // Histórico de versões geradas na sessão + qual está sendo vista, pra poder
  // gerar uma nova e voltar às anteriores sem perder nada.
  const [versoes, setVersoes] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const texto = versoes[idx] ?? null;

  // Sem item clicado no período, em vez de sumir (o que parece bug), mostra
  // um card gentil explicando e sugerindo ampliar o período.
  if (!topItem) {
    return (
      <div id="insight-marketing" className="orbi-card-light mt-6 scroll-mt-4 overflow-hidden rounded-[28px] p-6">
        <div className="relative flex items-center gap-2.5">
          <OrbiParticleSphere size={30} colors={orbiColors ?? undefined} vivid className="rounded-full" />
          <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-text-secondary">Recomendação da Orbi</span>
        </div>
        <p className="relative mt-4 font-[family-name:var(--font-manrope)] text-[18px] font-medium leading-snug text-on-background">
          Ninguém clicou num item da vitrine nesse período ainda.
        </p>
        <p className="relative mt-2 text-[14px] leading-relaxed text-text-secondary">
          Assim que alguém tocar num produto ou serviço, a Orbi te mostra aqui qual foi o mais procurado e escreve textos prontos pra você divulgar. Experimente ampliar o período aí em cima, ou compartilhe seu link pra trazer as primeiras visitas.
        </p>
      </div>
    );
  }

  // novoTipo=true zera o histórico (trocou de formato); senão, adiciona a nova
  // versão ao histórico e mostra ela, mantendo as anteriores acessíveis.
  async function gerar(t: string, novoFormato: boolean) {
    if (!hasAiChat || loading) return;
    setTipo(t);
    setLoading(true);
    setCopiado(false);
    if (novoFormato) { setVersoes([]); setIdx(0); }
    try {
      const res = await fetch("/api/gerar-conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, productTitle: topItem!.title, tipo: t }),
      });
      const data = await res.json();
      const novo = data.texto ?? "Não consegui gerar agora, tente de novo.";
      // Base do histórico: zera se trocou de formato, senão mantém as versões
      // anteriores. setIdx é chamado FORA do updater (dentro do updater não é
      // confiável e deixava o texto sumir).
      const base = novoFormato ? [] : versoes;
      const arr = [...base, novo];
      setVersoes(arr);
      setIdx(arr.length - 1);
    } catch {
      const base = novoFormato ? [] : versoes;
      const arr = [...base, "Erro de conexão. Tente de novo."];
      setVersoes(arr);
      setIdx(arr.length - 1);
    } finally {
      setLoading(false);
    }
  }

  function copiar() {
    if (!texto) return;
    navigator.clipboard?.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const acoes = [
    {
      id: "legenda",
      label: "Legenda pro Instagram",
      hint: "Post que para o feed",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      ),
    },
    {
      id: "story",
      label: "Ideia de Story",
      hint: "Com sugestão de visual",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="12" cy="12" r="3.2" />
          <path d="M17 8.5h.01" />
        </svg>
      ),
    },
    {
      id: "whatsapp",
      label: "Texto pro WhatsApp",
      hint: "Pra mandar de perto",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.5 8.5 0 1 1 21 11.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div id="insight-marketing" className="orbi-card-light mt-6 scroll-mt-4 overflow-hidden rounded-[28px] p-6">
      <div className="relative flex items-center gap-2.5">
        <OrbiParticleSphere size={30} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-text-secondary">Recomendação da Orbi</span>
      </div>

      <div className="relative mt-5 flex items-start gap-4">
        {topItem.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={topItem.image_url} alt={topItem.title} className="shrink-0 rounded-2xl object-cover shadow-[0_4px_16px_rgba(17,19,24,0.12)]" style={{ height: 76, width: 76 }} />
        ) : (
          <span className="flex shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[26px] shadow-sm" style={{ height: 76, width: 76 }}>✦</span>
        )}
        <p className="font-[family-name:var(--font-manrope)] text-[19px] font-medium leading-[1.35] tracking-[-0.01em] text-on-background">
          <span className="font-bold">{topItem.title}</span> foi o mais procurado da semana. Bora aproveitar esse interesse?
        </p>
      </div>

      {/* Ações */}
      <div className="relative mt-5 flex flex-col gap-2.5">
        {acoes.map((a) => (
          <button
            key={a.id}
            onClick={() => gerar(a.id, true)}
            disabled={!hasAiChat || loading}
            className={`flex items-center gap-3.5 rounded-[20px] bg-white/70 px-4 py-3.5 text-left transition-colors ${hasAiChat ? "active:bg-white" : "opacity-60"}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-on-background shadow-sm">{a.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold text-on-background">{a.label}</span>
              <span className="block text-[12.5px] text-text-tertiary">{a.hint}</span>
            </span>
            {!hasAiChat ? (
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-text-tertiary">💎 Nióbio</span>
            ) : (
              <span className="shrink-0 text-text-tertiary">→</span>
            )}
          </button>
        ))}
      </div>

      {/* Aviso pro Titânio */}
      {!hasAiChat && (
        <Link href="/admin/planos" className="relative mt-3.5 block rounded-[20px] bg-white/70 p-4 text-center text-[13px] font-medium leading-relaxed text-text-secondary">
          ✦ A Orbi escreve esses textos com a alma do seu negócio no plano Nióbio. Toque pra conhecer.
        </Link>
      )}

      {/* Resultado */}
      {hasAiChat && tipo && (
        <div className="relative mt-4 rounded-[22px] bg-white p-5 shadow-[0_4px_20px_rgba(17,19,24,0.06)]">
          {loading ? (
            <div className="flex items-center gap-3">
              <OrbiParticleSphere size={30} colors={orbiColors ?? undefined} vivid className="rounded-full" />
              <span className="text-[14px] text-text-tertiary">A Orbi está pensando com carinho…</span>
            </div>
          ) : texto && texto.trim() ? (
            <>
              {/* Navegação entre versões geradas */}
              {versoes.length > 1 && (
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={() => setIdx((i) => Math.max(0, i - 1))}
                    disabled={idx === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-text-secondary disabled:opacity-30"
                    aria-label="Versão anterior"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <span className="text-[12px] font-medium text-text-tertiary">Versão {idx + 1} de {versoes.length}</span>
                  <button
                    onClick={() => setIdx((i) => Math.min(versoes.length - 1, i + 1))}
                    disabled={idx === versoes.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-text-secondary disabled:opacity-30"
                    aria-label="Próxima versão"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
              )}

              <p className="whitespace-pre-line font-[family-name:var(--font-manrope)] text-[16px] leading-[1.6] text-on-background">{texto}</p>

              <div className="mt-4 flex gap-2">
                <button onClick={copiar} className="flex-1 rounded-full bg-button-primary py-3 text-[14px] font-semibold text-white">
                  {copiado ? "✓ Copiado!" : "Copiar texto"}
                </button>
                <button
                  onClick={() => tipo && gerar(tipo, false)}
                  disabled={loading}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-divider bg-surface-white px-4 py-3 text-[14px] font-medium text-text-secondary disabled:opacity-50"
                  aria-label="Gerar nova versão"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
                  Nova
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-[14px] text-text-secondary">Não consegui gerar o texto agora.</p>
              <button
                onClick={() => tipo && gerar(tipo, false)}
                className="mt-3 rounded-full bg-button-primary px-5 py-2.5 text-[13px] font-semibold text-white"
              >
                Tentar de novo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
