"use client";

const EMOJI_ORIGEM: Record<string, string> = {
  "Link direto": "🔗",
  Instagram: "📷",
  Google: "🔍",
  Facebook: "👍",
  TikTok: "🎵",
  YouTube: "▶️",
  WhatsApp: "💬",
  "Twitter/X": "𝕏",
  LinkedIn: "💼",
};

const EMOJI_DISPOSITIVO: Record<string, string> = {
  Celular: "📱",
  Computador: "💻",
  Tablet: "📱",
  "Não identificado": "•",
};

function BarList({
  title,
  subtitle,
  rows,
  total,
  emojiMap,
  footer,
}: {
  title: string;
  subtitle: string;
  rows: { nome: string; count: number }[];
  total: number;
  emojiMap: Record<string, string>;
  footer?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-[24px] border border-divider bg-surface-white p-5">
      <p className="font-[family-name:var(--font-manrope)] text-[16px] font-medium">{title}</p>
      <p className="mt-0.5 text-[12px] text-text-tertiary">{subtitle}</p>
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.slice(0, 6).map((r) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          return (
            <div key={r.nome}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5">
                  <span>{emojiMap[r.nome] ?? "•"}</span>
                  {r.nome}
                </span>
                <span className="text-text-tertiary">
                  {r.count} · {pct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                <div className="h-full rounded-full bg-on-background" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {footer && <p className="mt-3 text-[11.5px] leading-relaxed text-text-tertiary">{footer}</p>}
    </div>
  );
}

export function PulseAudience({
  origens,
  dispositivos,
  totalSessoes,
}: {
  origens: { nome: string; count: number }[];
  dispositivos: { nome: string; count: number }[];
  totalSessoes: number;
}) {
  if (totalSessoes === 0) return null;

  return (
    <div className="mt-8 flex flex-col gap-4">
      <BarList
        title="De onde vêm suas visitas"
        subtitle="Por onde a pessoa chegou até você"
        rows={origens}
        total={totalSessoes}
        emojiMap={EMOJI_ORIGEM}
        footer={origens.some((o) => o.nome === "Link direto") ? "“Link direto” é quando a pessoa chega sem ter clicado num link de rede social — por exemplo, digitando seu endereço, por um link salvo, pelo seu QR code, ou por um link que você mandou no WhatsApp. É normal ser a maioria no começo." : undefined}
      />
      <BarList
        title="Em qual aparelho"
        subtitle="O tipo de dispositivo que a pessoa usou"
        rows={dispositivos}
        total={totalSessoes}
        emojiMap={EMOJI_DISPOSITIVO}
      />
    </div>
  );
}
