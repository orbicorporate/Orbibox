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
  const [texto, setTexto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);

  if (!topItem) return null;

  async function gerar(t: string) {
    if (!hasAiChat) return;
    setTipo(t);
    setLoading(true);
    setTexto(null);
    setCopiado(false);
    try {
      const res = await fetch("/api/gerar-conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, productTitle: topItem!.title, tipo: t }),
      });
      const data = await res.json();
      setTexto(data.texto ?? "Não consegui gerar agora, tente de novo.");
    } catch {
      setTexto("Erro de conexão. Tente de novo.");
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
    { id: "legenda", emoji: "✍️", label: "Legenda pro Instagram", hint: "Post que para o feed" },
    { id: "story", emoji: "📸", label: "Ideia de Story", hint: "Com sugestão de visual" },
    { id: "whatsapp", emoji: "💬", label: "Texto pro WhatsApp", hint: "Pra mandar de perto" },
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
            onClick={() => gerar(a.id)}
            disabled={!hasAiChat || loading}
            className={`flex items-center gap-3.5 rounded-[20px] bg-white/70 px-4 py-3.5 text-left transition-colors ${hasAiChat ? "active:bg-white" : "opacity-60"}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[20px] shadow-sm">{a.emoji}</span>
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
          ) : texto ? (
            <>
              <p className="whitespace-pre-line font-[family-name:var(--font-manrope)] text-[16px] leading-[1.6] text-on-background">{texto}</p>
              <button onClick={copiar} className="mt-4 w-full rounded-full bg-button-primary py-3 text-[14px] font-semibold text-white">
                {copiado ? "✓ Copiado!" : "Copiar texto"}
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
