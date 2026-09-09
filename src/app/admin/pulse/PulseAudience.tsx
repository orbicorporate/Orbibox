"use client";

const EMOJI_ORIGEM: Record<string, string> = {
  direto: "🔗",
  instagram: "📷",
  google: "🔍",
  facebook: "👍",
  tiktok: "🎵",
  youtube: "▶️",
  whatsapp: "💬",
  "twitter/x": "𝕏",
  linkedin: "💼",
};

const EMOJI_DISPOSITIVO: Record<string, string> = {
  celular: "📱",
  computador: "💻",
  tablet: "📱",
};

function BarList({
  title,
  subtitle,
  rows,
  total,
  emojiMap,
}: {
  title: string;
  subtitle: string;
  rows: { nome: string; count: number }[];
  total: number;
  emojiMap: Record<string, string>;
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
                <span className="flex items-center gap-1.5 capitalize">
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
        subtitle="Origem do tráfego, pelo link de onde a pessoa clicou"
        rows={origens}
        total={totalSessoes}
        emojiMap={EMOJI_ORIGEM}
      />
      <BarList
        title="Em qual aparelho"
        subtitle="Dispositivo usado pra abrir seu Orbibox"
        rows={dispositivos}
        total={totalSessoes}
        emojiMap={EMOJI_DISPOSITIVO}
      />
    </div>
  );
}
