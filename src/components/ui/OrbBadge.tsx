type OrbState = "working" | "insight" | "done";

const symbol: Record<OrbState, string> = {
  working: "◉",
  insight: "✦",
  done: "✓",
};

export function OrbBadge({ state = "insight", label }: { state?: OrbState; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-soft px-3 py-1 text-[13px] font-medium">
      <span className="orbi-gradient-text">{symbol[state]}</span>
      {label && <span className="text-text-secondary">{label}</span>}
    </span>
  );
}
