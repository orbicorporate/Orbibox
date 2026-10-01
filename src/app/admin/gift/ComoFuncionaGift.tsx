/**
 * "Como funciona" do Gift Card em 4 quadrinhos desenhados, um por etapa,
 * com título curto e uma linha. Os desenhos são SVG simples (traço fino,
 * duas cores), pra explicar de relance sem parágrafo.
 */
const TRACO = "#111318";
const COR = "#FF6B5E";
const SUAVE = "#FFE3DE";

function Celular({ children }: { children: React.ReactNode }) {
  return (
    <g>
      <rect x="34" y="6" width="52" height="88" rx="10" fill="#fff" stroke={TRACO} strokeWidth="2" />
      <rect x="52" y="10" width="16" height="3" rx="1.5" fill={TRACO} opacity=".2" />
      {children}
    </g>
  );
}

const DESENHOS = [
  // 1. box Presentear na Home
  <svg key="1" viewBox="0 0 120 100" className="h-[84px] w-full" aria-hidden>
    <Celular>
      <rect x="40" y="20" width="40" height="9" rx="3" fill={TRACO} opacity=".08" />
      <rect x="40" y="33" width="40" height="22" rx="5" fill={SUAVE} stroke={COR} strokeWidth="1.8" />
      <rect x="52" y="39" width="16" height="11" rx="1.5" fill="#fff" stroke={COR} strokeWidth="1.6" />
      <path d="M60 39v11M52 43h16" stroke={COR} strokeWidth="1.6" />
      <path d="M60 39c-3-5-7-2-4 0M60 39c3-5 7-2 4 0" fill="none" stroke={COR} strokeWidth="1.4" strokeLinecap="round" />
      <rect x="40" y="59" width="19" height="14" rx="4" fill={TRACO} opacity=".08" />
      <rect x="61" y="59" width="19" height="14" rx="4" fill={TRACO} opacity=".08" />
    </Celular>
    <circle cx="92" cy="70" r="9" fill={COR} />
    <path d="M88 70l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  // 2. cliente monta o gift
  <svg key="2" viewBox="0 0 120 100" className="h-[84px] w-full" aria-hidden>
    <rect x="18" y="22" width="84" height="54" rx="9" fill={SUAVE} stroke={COR} strokeWidth="2" />
    <text x="28" y="44" fontSize="15" fontWeight="700" fill={COR} fontFamily="system-ui">R$ 100</text>
    <rect x="28" y="52" width="44" height="4" rx="2" fill={COR} opacity=".45" />
    <rect x="28" y="60" width="30" height="4" rx="2" fill={COR} opacity=".3" />
    <path d="M84 30v40" stroke={COR} strokeWidth="1.6" strokeDasharray="3 3" />
    <path d="M92 58l14-14 4 4-14 14-6 2z" fill="#fff" stroke={TRACO} strokeWidth="1.8" strokeLinejoin="round" />
  </svg>,
  // 3. pagou no WhatsApp → toca em Liberar no pedido
  <svg key="3" viewBox="0 0 120 100" className="h-[84px] w-full" aria-hidden>
    <rect x="10" y="10" width="46" height="20" rx="10" fill="#25D366" />
    <path d="M18 30l-3 6 8-6" fill="#25D366" />
    <text x="33" y="24" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fff" fontFamily="system-ui">Pago ✓</text>
    <rect x="10" y="44" width="100" height="40" rx="10" fill="#fff" stroke={TRACO} strokeWidth="1.8" />
    <circle cx="25" cy="64" r="7" fill={SUAVE} stroke={COR} strokeWidth="1.5" />
    <rect x="37" y="57" width="20" height="4" rx="2" fill={TRACO} opacity=".35" />
    <rect x="37" y="65" width="14" height="4" rx="2" fill={TRACO} opacity=".15" />
    <rect x="61" y="54" width="44" height="20" rx="10" fill="#1F9E4C" />
    <text x="83" y="67.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="system-ui">Liberar</text>
    
  </svg>,
  // 4. quem recebe usa o código
  <svg key="4" viewBox="0 0 120 100" className="h-[84px] w-full" aria-hidden>
    <path d="M22 28h76v12a8 8 0 0 0 0 16v12H22V56a8 8 0 0 0 0-16z" fill={SUAVE} stroke={COR} strokeWidth="2" strokeLinejoin="round" />
    <path d="M44 30v36" stroke={COR} strokeWidth="1.6" strokeDasharray="3 3" />
    <rect x="28" y="40" width="10" height="16" rx="2" fill={COR} opacity=".35" />
    <text x="52" y="52" fontSize="12" fontWeight="700" fill={TRACO} fontFamily="ui-monospace,monospace" letterSpacing="1">GX7-42</text>
    <circle cx="96" cy="78" r="10" fill={TRACO} />
    <path d="M91.5 78l3 3 5.5-6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
];

const PASSOS = [
  { t: "Ative o box Presentear", d: "Ele aparece na sua página." },
  { t: "O cliente monta o gift", d: "Valor, mensagem e pra quem é." },
  { t: "Recebeu? Toque em Liberar", d: "Acertem no WhatsApp. O pedido fica em Gifts a liberar, logo abaixo." },
  { t: "Quem ganha usa o código", d: "Você digita em Validar gift e marca como usado." },
];

export function ComoFuncionaGift() {
  return (
    <div className="mt-4">
      <p className="px-1 text-[12px] uppercase tracking-[0.12em] text-text-tertiary">Como funciona</p>
      <ol className="mt-2 grid grid-cols-2 gap-2.5">
        {PASSOS.map((p, i) => (
          <li key={p.t} className="flex flex-col rounded-[20px] bg-surface-white p-3 pb-3.5">
            <div className="rounded-[14px] bg-surface-soft py-1.5">{DESENHOS[i]}</div>
            <div className="mt-2.5 flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-on-background text-[11px] font-medium text-white">{i + 1}</span>
              <p className="text-[13.5px] font-medium leading-tight">{p.t}</p>
            </div>
            <p className="mt-1 pl-7 text-[12px] leading-snug text-text-secondary">{p.d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
