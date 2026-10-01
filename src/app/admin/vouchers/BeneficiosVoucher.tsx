/**
 * Benefícios dos Vouchers em quadrinhos desenhados (SVG de traço fino,
 * coral do voucher), no mesmo padrão do "Como funciona" do Gift Card.
 */
const TRACO = "#111318";
const COR = "#FF4D6A";
const SUAVE = "#FFE1E6";
/** Ticket com os dois recortes laterais. */
function Ticket({ x, y, w, h, cheio = true }: { x: number; y: number; w: number; h: number; cheio?: boolean }) {
  const r = h / 6;
  const m = h / 2 - r;
  const d = `M${x} ${y}h${w}v${m}a${r} ${r} 0 0 0 0 ${2 * r}v${m}h${-w}v${-m}a${r} ${r} 0 0 0 0 ${-2 * r}z`;
  return <path d={d} fill={cheio ? SUAVE : "#fff"} stroke={COR} strokeWidth="1.8" strokeLinejoin="round" />;
}

const DESENHOS: Record<string, React.ReactNode> = {
  atrai: (
    <svg viewBox="0 0 120 90" className="h-[76px] w-full" aria-hidden>
      <rect x="40" y="6" width="40" height="72" rx="8" fill="#fff" stroke={TRACO} strokeWidth="2" />
      <rect x="45" y="16" width="30" height="20" rx="4" fill={SUAVE} stroke={COR} strokeWidth="1.6" />
      <text x="60" y="29.5" textAnchor="middle" fontSize="8" fontWeight="700" fill={COR} fontFamily="system-ui">−10%</text>
      <rect x="45" y="40" width="30" height="5" rx="2.5" fill={TRACO} opacity=".1" />
      <rect x="45" y="48" width="22" height="5" rx="2.5" fill={TRACO} opacity=".1" />
      {[[16, 30], [12, 52], [104, 24], [108, 50]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="5" fill="#fff" stroke={TRACO} strokeWidth="1.6" />
          <path d={`M${x - 7} ${y + 13}a7 6 0 0 1 14 0`} fill="#fff" stroke={TRACO} strokeWidth="1.6" />
        </g>
      ))}
      <path d="M26 36l10 4M24 54l12-2M94 30l-10 6M96 52l-12-2" stroke={COR} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 3" />
    </svg>
  ),
  codigo: (
    <svg viewBox="0 0 120 90" className="h-[76px] w-full" aria-hidden>
      <Ticket x={14} y={26} w={66} h={34} />
      <text x="47" y="47" textAnchor="middle" fontSize="11" fontWeight="700" fill={TRACO} fontFamily="ui-monospace,monospace">A1B2C3</text>
      <rect x="86" y="44" width="22" height="20" rx="4" fill={TRACO} />
      <path d="M91 44v-6a6 6 0 0 1 12 0v6" fill="none" stroke={TRACO} strokeWidth="2.4" />
      <circle cx="97" cy="54" r="2.5" fill="#fff" />
    </svg>
  ),
  estoque: (
    <svg viewBox="0 0 120 90" className="h-[76px] w-full" aria-hidden>
      {[0, 1, 2].map((i) => (
        <Ticket key={i} x={16 + i * 6} y={52 - i * 14} w={46} h={24} cheio={i === 2} />
      ))}
      <rect x="80" y="28" width="32" height="20" rx="10" fill={TRACO} />
      <text x="96" y="41.5" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fff" fontFamily="system-ui">3/50</text>
    </svg>
  ),
  valida: (
    <svg viewBox="0 0 120 90" className="h-[76px] w-full" aria-hidden>
      <rect x="38" y="6" width="44" height="76" rx="9" fill="#fff" stroke={TRACO} strokeWidth="2" />
      <rect x="44" y="22" width="32" height="14" rx="3" fill={TRACO} opacity=".06" stroke={TRACO} strokeOpacity=".3" />
      <text x="60" y="32" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={TRACO} fontFamily="ui-monospace,monospace">A1B2C3</text>
      <rect x="44" y="42" width="32" height="10" rx="5" fill={TRACO} />
      <circle cx="60" cy="66" r="9" fill="#25D366" />
      <path d="M55.5 66l3 3 5.5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  contato: (
    <svg viewBox="0 0 240 90" className="h-[76px] w-full" aria-hidden>
      <Ticket x={32} y={28} w={50} h={28} />
      <path d="M92 42h30" stroke={TRACO} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="3 4" />
      <path d="M118 37l6 5-6 5" fill="none" stroke={TRACO} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="134" y="14" width="76" height="62" rx="10" fill="#fff" stroke={TRACO} strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx="148" cy={30 + i * 17} r="5.5" fill={i === 0 ? COR : SUAVE} />
          <rect x="158" y={26 + i * 17} width={i === 0 ? 40 : 32} height="4" rx="2" fill={TRACO} opacity={i === 0 ? 0.55 : 0.2} />
          <rect x="158" y={32 + i * 17} width="22" height="3" rx="1.5" fill={TRACO} opacity=".15" />
        </g>
      ))}
    </svg>
  ),
};

const ITENS = [
  { k: "atrai", t: "Atrai cliente novo", d: "A oferta aparece na página e no chat da Orbi." },
  { k: "codigo", t: "Código único", d: "Um por pessoa. Ninguém usa o de outro." },
  { k: "estoque", t: "Estoque sob controle", d: "Acabou, fecha sozinho." },
  { k: "valida", t: "Valida no celular", d: "Digita o código e confirma na hora." },
  { k: "contato", t: "Cada resgate vira contato", d: "Uma lista de clientes pra vender de novo.", largo: true },
];

export function BeneficiosVoucher() {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-2.5">
      {ITENS.map((b) => (
        <li key={b.k} className={`flex flex-col rounded-[18px] bg-surface-white p-3 ${b.largo ? "col-span-2" : ""}`}>
          <div className="rounded-[12px] bg-surface-soft py-1">{DESENHOS[b.k]}</div>
          <p className="mt-2.5 text-[13.5px] font-medium leading-tight">{b.t}</p>
          <p className="mt-1 text-[12px] leading-snug text-text-secondary">{b.d}</p>
        </li>
      ))}
    </ul>
  );
}
