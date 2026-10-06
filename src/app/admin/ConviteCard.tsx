import Link from "next/link";

/** Chamada pra indicar, na home de quem ainda está no teste grátis. */
export function ConviteCard() {
  return (
    <Link
      href="/admin/indique"
      className="relative mt-5 flex items-center gap-4 overflow-hidden rounded-[24px] bg-[#111318] p-5 text-white active:scale-[.99]"
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full orbi-gradient opacity-45 blur-2xl" />
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl orbi-gradient text-[#111318]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path d="M12 8v13M3 12h18M12 8c-1.5-3-5-3.5-5.5-1.5S9 8 12 8Zm0 0c1.5-3 5-3.5 5.5-1.5S15 8 12 8Z" />
        </svg>
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[16px] font-semibold leading-tight">Ganhe meses grátis</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-white/70">Cada amigo que assinar pelo seu link vale 1 mês pra você.</span>
      </span>
      <span className="relative text-white/60" aria-hidden>→</span>
    </Link>
  );
}
