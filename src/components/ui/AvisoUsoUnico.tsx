type Props = {
  /** "gift" ou "voucher": ajusta só o texto. */
  tipo: "gift" | "voucher";
  /** Em fundos escuros (cartão colorido), usa texto claro translúcido. */
  escuro?: boolean;
  className?: string;
};

/** Aviso fixo de que o código só vale uma vez. Mesmo visual em gift e voucher. */
export function AvisoUsoUnico({ tipo, escuro = false, className = "" }: Props) {
  const item = tipo === "gift" ? "gift" : "voucher";
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl px-3.5 py-3 text-left ${escuro ? "bg-white/15 text-white" : "bg-[#FFF4E0] text-[#6B4A0B]"} ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 flex-none">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <p className="text-[13px] leading-snug">
        <span className="font-semibold">Uso único.</span> Este {item} só pode ser utilizado uma única vez. Depois que o atendimento der baixa, o código deixa de valer.
      </p>
    </div>
  );
}
