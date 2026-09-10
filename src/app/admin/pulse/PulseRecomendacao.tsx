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
    { id: "legenda", label: "✍ Legenda pro Instagram" },
    { id: "story", label: "📸 Ideia de Story" },
    { id: "whatsapp", label: "💬 Texto pro WhatsApp" },
  ];

  return (
    <div className="mt-6 rounded-[24px] bg-surface-white p-5 shadow-[0_2px_16px_rgba(17,19,24,0.05)]">
      <div className="flex items-center gap-2">
        <OrbiParticleSphere size={26} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        <span className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Recomendação Orbi</span>
      </div>

      <div className="mt-3 flex items-center gap-3.5">
        {topItem.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={topItem.image_url} alt={topItem.title} className="shrink-0 rounded-xl object-cover" style={{ height: 64, width: 64 }} />
        ) : (
          <span className="flex shrink-0 items-center justify-center rounded-xl bg-surface-soft text-[20px]" style={{ height: 64, width: 64 }}>✦</span>
        )}
        <p className="text-[15px] leading-snug">
          <span className="font-semibold">{topItem.title}</span> foi o mais clicado da semana. Que tal divulgar pra aproveitar o momento?
        </p>
      </div>

      {/* Ações */}
      <div className="mt-4 flex flex-col gap-2">
        {acoes.map((a) => (
          <button
            key={a.id}
            onClick={() => gerar(a.id)}
            disabled={!hasAiChat || loading}
            className={`flex items-center justify-between rounded-full px-4 py-3 text-[14px] font-medium ${tipo === a.id && !hasAiChat ? "" : ""} ${hasAiChat ? "bg-surface-soft hover:bg-divider" : "bg-surface-soft opacity-60"}`}
          >
            <span>{a.label}</span>
            {!hasAiChat && <span className="text-[11px] font-semibold text-text-tertiary">💎 Nióbio</span>}
          </button>
        ))}
      </div>

      {/* Aviso pro Titânio */}
      {!hasAiChat && (
        <Link href="/admin/planos" className="mt-3 block rounded-2xl bg-surface-soft p-3 text-center text-[12.5px] font-medium text-text-secondary">
          ✦ A Orbi escreve esses textos prontos pra você no plano Nióbio. Toque pra ver.
        </Link>
      )}

      {/* Resultado */}
      {hasAiChat && tipo && (
        <div className="mt-3 rounded-2xl bg-surface-soft p-4">
          {loading ? (
            <div className="flex items-center gap-2.5">
              <OrbiParticleSphere size={28} colors={orbiColors ?? undefined} vivid className="rounded-full" />
              <span className="text-[13px] text-text-tertiary">Escrevendo pra você…</span>
            </div>
          ) : texto ? (
            <>
              <p className="whitespace-pre-line text-[14px] leading-relaxed">{texto}</p>
              <button onClick={copiar} className="mt-3 w-full rounded-full bg-button-primary py-2.5 text-[13px] font-medium text-white">
                {copiado ? "✓ Copiado!" : "Copiar texto"}
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
