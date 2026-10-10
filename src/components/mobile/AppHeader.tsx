"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { BackButton } from "./BackButton";
import { ProgressBadge } from "@/components/ProgressBadge";
import { createClient } from "@/lib/supabase/client";

/** Ícones de linha, finos e neutros, todos no mesmo estilo. */
const ICONES = {
  marca: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3.5 9.5 5 4.5h14l1.5 5" /><path d="M4.5 9.5V19a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9.5" /><path d="M3.5 9.5h17" /><path d="M10 20v-4.5h4V20" /></svg>,
  ia: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3.5l1.6 4.9 4.9 1.6-4.9 1.6L12 16.5l-1.6-4.9L5.5 10l4.9-1.6L12 3.5Z" /><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" /></svg>,
  voucher: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4V7.5Z" /><path d="M9.5 14.5l5-5" /><circle cx="9.75" cy="9.75" r=".6" fill="currentColor" /><circle cx="14.25" cy="14.25" r=".6" fill="currentColor" /></svg>,
  gift: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M3 9h18" /><path d="M12 9v11" /><path d="M12 9c-1.5-3.5-5-4-5-1.5C7 9 12 9 12 9Zm0 0c1.5-3.5 5-4 5-1.5C17 9 12 9 12 9Z" /></svg>,
};
const MENU_ITEMS = [
  { href: "/admin/config", label: "Sua marca", desc: "Logo, cores e contatos", icon: ICONES.marca, marca: true },
  { href: "/admin/agent", label: "Sua IA", desc: "Tom de voz e o que sabe", icon: ICONES.ia, marca: false },
] as const;

export function AppHeader({
  unseenConversas = 0,
  progressPct = 100,
  isMaster = false,
  podeRede = false,
  pendencias = [],
  negocios = [],
  negocioAtual,
  logoUrl = null,
}: {
  unseenConversas?: number;
  progressPct?: number;
  isMaster?: boolean;
  /** Mostra a entrada do painel de Rede (masters e donos com plano que tem a Orbi). */
  podeRede?: boolean;
  /** Fila de "o que falta" (mesma do checklist/insights), pro sino avisar
   * além de conversa não vista, o objetivo é a pessoa nunca ficar perdida
   * sobre o que fazer, mesmo sumindo dias e voltando depois. */
  pendencias?: { title: string; href: string }[];
  /** Negócios que a pessoa pode abrir (os dela e os que administra). */
  negocios?: { id: string; name: string; slug: string; dono?: boolean }[];
  negocioAtual?: string;
  /** Logo cadastrado da marca, vira o ícone de "Sua marca". */
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sinoOpen, setSinoOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [trocaOpen, setTrocaOpen] = useState(false);
  const [trocando, setTrocando] = useState<string | null>(null);
  const atual = negocios.find((n) => n.id === negocioAtual);

  async function trocarPara(id: string) {
    if (id === negocioAtual) { setTrocaOpen(false); return; }
    setTrocando(id);
    const r = await fetch("/api/negocio/trocar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (r.ok) {
      setTrocaOpen(false);
      router.push("/admin");
      router.refresh();
    }
    setTrocando(null);
  }
  const totalSino = unseenConversas + pendencias.length;

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className={`sticky top-0 flex items-center justify-between gap-2 bg-background-main/65 px-4 py-4 min-[400px]:px-6 backdrop-blur-xl lg:px-[max(2.5rem,calc((100%-960px)/2+2.5rem))] ${menuOpen || sinoOpen ? "z-50" : "z-20"}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <BackButton />
        <span className="shrink-0"><OrbiOrb size={28} /></span>
        {/* Nome do negócio aberto. Só vira seletor quando a conta tem mais de um Orbibox. */}
        {negocios.length > 1 ? (
          <button
            type="button"
            onClick={() => setTrocaOpen(true)}
            className="flex min-w-0 items-center gap-1 text-left"
            aria-label="Trocar de negócio"
          >
            <span className="truncate font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">
              {atual?.name ?? "Orbibox"}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-text-tertiary" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        ) : (
          <span className="min-w-0 truncate font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">
            {atual?.name ?? "Orbibox"}
          </span>
        )}
      </div>
      <div className="relative flex shrink-0 items-center gap-2">
        <ProgressBadge pct={progressPct} />
        {/* Sino de notificação: junta conversa não vista com pendências do
            negócio (checklist, fotos faltando, etc), pra pessoa nunca ficar
            sem saber o que fazer, mesmo voltando depois de dias sumida. */}
        <button
          type="button"
          onClick={() => { setSinoOpen((v) => !v); setMenuOpen(false); }}
          aria-label="Notificações e pendências"
          aria-expanded={sinoOpen}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3a5 5 0 0 0-5 5v3.2c0 .7-.25 1.36-.7 1.9L5 15h14l-1.3-1.9a3 3 0 0 1-.7-1.9V8a5 5 0 0 0-5-5Z" />
            <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
          </svg>
          {totalSino > 0 && (
            <span className="notif-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {totalSino > 9 ? "9+" : totalSino}
            </span>
          )}
        </button>

        {sinoOpen && (
          <>
            {typeof document !== "undefined" && createPortal(
              <button
                aria-label="Fechar notificações"
                onClick={() => setSinoOpen(false)}
                className="fixed inset-0 z-40 cursor-default bg-on-background/10 backdrop-blur-[2px]"
              />,
              document.body,
            )}
            <div className="absolute right-0 top-12 z-50 w-[300px] overflow-hidden rounded-[24px] bg-surface-white p-3 shadow-[0_20px_60px_rgba(17,19,24,0.22)]">
              <p className="px-2 pb-2 pt-1 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Pendências</p>

              {totalSino === 0 ? (
                <p className="px-2 pb-2 text-[13px] text-text-secondary">Tudo em dia por aqui! ✨</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {unseenConversas > 0 && (
                    <Link
                      href="/admin/conversas"
                      onClick={() => setSinoOpen(false)}
                      className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 active:bg-surface-soft"
                    >
                      <span className="text-[13.5px] font-medium">
                        {unseenConversas} {unseenConversas === 1 ? "conversa nova" : "conversas novas"} em Conversas
                      </span>
                      <span className="text-text-tertiary">›</span>
                    </Link>
                  )}
                  {pendencias.slice(0, 4).map((p) => (
                    <Link
                      key={p.href + p.title}
                      href={p.href}
                      onClick={() => setSinoOpen(false)}
                      className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 active:bg-surface-soft"
                    >
                      <span className="min-w-0 truncate text-[13.5px] font-medium">{p.title}</span>
                      <span className="shrink-0 text-text-tertiary">›</span>
                    </Link>
                  ))}
                  {pendencias.length > 4 && (
                    <Link
                      href="/admin/pendencias"
                      onClick={() => setSinoOpen(false)}
                      className="mt-1 rounded-2xl bg-surface-soft px-3 py-2.5 text-center text-[12.5px] font-semibold text-text-secondary"
                    >
                      Ver tudo ({pendencias.length})
                    </Link>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => { setMenuOpen((v) => !v); setSinoOpen(false); }}
          title="Configurações"
          aria-label="Configurações"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-on-background text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </button>

        {menuOpen && (
          <>
            {/* Backdrop, clique em qualquer lugar fora do menu fecha. Fica
                acima de todo o conteúdo da página (z-40) e abaixo do menu. */}
            {typeof document !== "undefined" && createPortal(
              <button
                aria-label="Fechar menu"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-40 cursor-default bg-on-background/10 backdrop-blur-[2px]"
              />,
              document.body,
            )}
            <div className="absolute right-0 top-12 z-50 w-[320px] overflow-hidden rounded-[28px] bg-[#F3F3F0] p-3 shadow-[0_20px_60px_rgba(17,19,24,0.22)]">
              <p className="px-2 pb-2 pt-1 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Configurações</p>

              {/* Grade 2x2: as quatro coisas mais usadas, cada uma num bloco
                  do mesmo tamanho. Vouchers leva a arte 3D de fundo pra se
                  destacar sem precisar de um card enorme. */}
              <div className="grid grid-cols-2 gap-2">
                {MENU_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-[136px] flex-col justify-between rounded-[22px] bg-white p-4 text-left shadow-[0_10px_24px_-12px_rgba(17,19,24,0.28)] ring-1 ring-black/[0.07] transition-transform active:scale-[.97]"
                  >
                    {item.marca && logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="h-11 w-11 rounded-full bg-white object-cover ring-1 ring-black/5" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-on-background">{item.icon}</span>
                    )}
                    <span>
                      <span className="block text-[15px] font-semibold leading-tight">{item.label}</span>
                      <span className="mt-1 block text-[12.5px] leading-snug text-text-tertiary">{item.desc}</span>
                    </span>
                  </Link>
                ))}

                <Link
                  href="/admin/vouchers"
                  onClick={() => setMenuOpen(false)}
                  className="relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-[22px] bg-cover bg-center p-4 text-left shadow-[0_10px_24px_-12px_rgba(31,122,69,0.35)] ring-1 ring-[#1F7A45]/15 transition-transform active:scale-[.97]"
                  style={{ backgroundImage: "url(/vouchers-promo-bg.webp)" }}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-on-background ring-1 ring-black/5">{ICONES.voucher}</span>
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1F7A45]">Novo</span>
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold leading-tight">Vouchers</span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-on-background/65">Mais clientes hoje</span>
                  </span>
                </Link>

                <Link
                  href="/admin/gift"
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[136px] flex-col justify-between rounded-[22px] bg-white p-4 text-left shadow-[0_10px_24px_-12px_rgba(17,19,24,0.28)] ring-1 ring-black/[0.07] transition-transform active:scale-[.97]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-on-background">{ICONES.gift}</span>
                  <span>
                    <span className="block text-[15px] font-semibold leading-tight">Gift Cards</span>
                    <span className="mt-1 block text-[12.5px] leading-snug text-text-tertiary">Vale-presentes</span>
                  </span>
                </Link>
              </div>

              {/* Prévia: painel de rede para quem tem vários negócios ou franquias */}
              {podeRede && (
              <Link
                href="/admin/rede"
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 ring-1 ring-black/[0.07] transition-transform active:scale-[.98]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full orbi-gradient text-[15px] text-on-background" aria-hidden>◎</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] leading-tight">Rede de Orbibox</span>
                  <span className="block text-[12.5px] leading-snug text-text-tertiary">Tem uma rede de lojas? Adicione cada loja pelo código dela</span>
                </span>
                <span className="text-text-tertiary" aria-hidden>→</span>
              </Link>
              )}

              {/* Atalho pro painel de gestão, só pros masters */}
              {isMaster && (
                <Link
                  href="/master"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex items-center gap-3 rounded-[20px] border border-[#E7D3A0] bg-[#FBF6E9] px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#C9962E] to-[#F0CB6A] text-[15px] text-white">★</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-[#8A6A1E]">Painel Master</span>
                    <span className="block text-[12px] text-[#8A6A1E]/70">Gestão e financeiro</span>
                  </span>
                  <span className="text-[#8A6A1E]/60">→</span>
                </Link>
              )}

              {/* Sair fica sempre visível aqui, é o lugar mais óbvio de
                  procurar (menu de configurações), pra não ficar escondido
                  lá no fundo de /admin/config. */}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-red-50 text-left ring-1 ring-red-100 active:bg-red-100 disabled:opacity-50"
              >
                <span className="flex shrink-0 items-center justify-center text-red-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                </span>
                <span className="text-[14px] font-medium text-red-600">
                  {signingOut ? "Saindo…" : "Sair da conta"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
      {trocaOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/45" onClick={() => setTrocaOpen(false)}>
          <div className="mx-auto w-full max-w-[440px] rounded-t-[28px] bg-surface-white px-5 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
            <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-divider" />
            <p className="text-center font-[family-name:var(--font-manrope)] text-[18px] font-medium">Seus Orbibox</p>
            <div className="mt-4 flex flex-col gap-2">
              {negocios.map((n, i) => {
                const ativo = n.id === negocioAtual;
                const temRede = negocios.some((x) => !x.dono);
                const temMeus = negocios.some((x) => x.dono);
                const rotulo =
                  temRede && temMeus && i === 0
                    ? "Meus Orbibox"
                    : temRede && !n.dono && negocios[i - 1]?.dono
                      ? "Rede que você administra"
                      : null;
                return (
                  <div key={n.id}>
                  {rotulo && (
                    <p className={`px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary ${i === 0 ? "" : "mt-3"}`}>{rotulo}</p>
                  )}
                  <div className="relative">
                  <button
                    type="button"
                    onClick={() => trocarPara(n.id)}
                    disabled={!!trocando}
                    className={`flex w-full items-center gap-3 rounded-2xl border py-3 pl-4 text-left transition-colors pr-4 ${ativo ? "border-on-background" : "border-divider"} disabled:opacity-60`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft font-[family-name:var(--font-manrope)] text-[15px] font-semibold">
                      {n.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{n.name}</span>
                      <span className="block truncate text-[12px] text-text-tertiary">/{n.slug}</span>
                    </span>
                    {!n.dono && trocando !== n.id && (
                      <span className="shrink-0 rounded-full bg-surface-soft px-2 py-0.5 text-[10.5px] font-medium text-text-secondary">Rede</span>
                    )}
                    {trocando === n.id ? (
                      <span className="text-[12px] text-text-tertiary">Abrindo…</span>
                    ) : ativo ? (
                      <span className="text-[13px] font-medium">✓</span>
                    ) : null}
                  </button>
                  </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
