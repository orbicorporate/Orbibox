"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { BackButton } from "./BackButton";
import { ProgressBadge } from "@/components/ProgressBadge";
import { createClient } from "@/lib/supabase/client";

const MENU_ITEMS = [
  {
    href: "/admin/agent",
    label: "Configurar sua IA",
    desc: "Personalidade, tom de voz e o que a Orbi sabe.",
    bg: "orbi-gradient",
    fg: "#111318",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/config",
    label: "Configurar sua marca",
    desc: "Logotipo, contatos e o que aparece pro visitante.",
    bg: "#E7EAFC",
    fg: "#4453D6",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
        <path d="M9 20v-5a1 1 0 011-1h4a1 1 0 011 1v5" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
] as const;

export function AppHeader({
  unseenConversas = 0,
  progressPct = 100,
  isMaster = false,
  pendencias = [],
  negocios = [],
  negocioAtual,
  podeCriarNegocio = false,
}: {
  unseenConversas?: number;
  progressPct?: number;
  isMaster?: boolean;
  /** Fila de "o que falta" (mesma do checklist/insights), pro sino avisar
   * além de conversa não vista, o objetivo é a pessoa nunca ficar perdida
   * sobre o que fazer, mesmo sumindo dias e voltando depois. */
  pendencias?: { title: string; href: string }[];
  /** Negócios que a pessoa pode abrir (os dela e os que administra). */
  negocios?: { id: string; name: string; slug: string }[];
  negocioAtual?: string;
  /** Plano permite criar mais um Orbibox (Nióbio). */
  podeCriarNegocio?: boolean;
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
    <header className={`sticky top-0 flex items-center justify-between bg-background-main/65 px-6 py-4 backdrop-blur-xl ${menuOpen ? "z-50" : "z-20"}`}>
      <div className="flex items-center gap-2">
        <BackButton />
        <OrbiOrb size={28} />
        {/* Nome do negócio aberto; toca pra trocar ou criar outro Orbibox. */}
        <button
          type="button"
          onClick={() => setTrocaOpen(true)}
          className="flex min-w-0 max-w-[170px] items-center gap-1 text-left"
          aria-label="Trocar de negócio"
        >
          <span className="truncate font-[family-name:var(--font-manrope)] text-[20px] font-medium tracking-[-0.01em]">
            {atual?.name ?? "Orbibox"}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-text-tertiary" aria-hidden>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      <div className="relative flex items-center gap-2">
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
            <button
              aria-label="Fechar notificações"
              onClick={() => setSinoOpen(false)}
              className="fixed inset-0 z-40 cursor-default bg-on-background/10 backdrop-blur-[2px]"
            />
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
                        {unseenConversas} {unseenConversas === 1 ? "conversa nova" : "conversas novas"} em Talks
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
            <button
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default bg-on-background/10 backdrop-blur-[2px]"
            />
            <div className="absolute right-0 top-12 z-50 w-[320px] overflow-hidden rounded-[28px] bg-surface-white p-3 shadow-[0_20px_60px_rgba(17,19,24,0.22)]">
              <p className="px-2 pb-2 pt-1 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Configurações</p>

              <div className="flex flex-col gap-1">
                {MENU_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3.5 rounded-2xl px-3 py-3.5 text-left active:bg-surface-soft"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={item.bg === "orbi-gradient" ? undefined : { backgroundColor: item.bg, color: item.fg }}
                    >
                      {item.bg === "orbi-gradient" ? (
                        <span className="orbi-gradient flex h-11 w-11 items-center justify-center rounded-2xl" style={{ color: item.fg }}>
                          {item.icon}
                        </span>
                      ) : (
                        item.icon
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{item.label}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-text-tertiary">{item.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>

              {/* Vouchers ganha destaque de propósito, é a ferramenta com
                  maior impacto comercial direto (fecha venda na hora), então
                  precisa parecer maior e mais chamativa que as configurações
                  comuns acima, não só uma cor diferente. Fundo é a arte 3D do
                  ticket de desconto, não gradiente CSS. */}
              <Link
                href="/admin/vouchers"
                onClick={() => setMenuOpen(false)}
                className="relative mt-2 block overflow-hidden rounded-[22px] bg-cover bg-center p-5"
                style={{ backgroundImage: "url(/vouchers-promo-bg.webp)" }}
              >
                <span className="relative flex items-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-[#1F7A45]">
                    ★ Mais clientes hoje
                  </span>
                </span>

                <span className="relative mt-3.5 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[22px] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">🎟️</span>
                  <span className="block font-[family-name:var(--font-manrope)] text-[24px] font-bold leading-none tracking-[-0.01em] text-on-background">Vouchers</span>
                </span>

                <span className="relative mt-4 block max-w-[80%] text-[13.5px] leading-relaxed text-on-background/75">
                  Crie ofertas com
                  <br />
                  estoque controlado.
                </span>

                <span className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-[#14301F] px-5 py-2.5 text-[14px] font-semibold text-white">
                  Experimentar <span aria-hidden>→</span>
                </span>
              </Link>

              {/* Gift Cards, atalho discreto abaixo do destaque de Vouchers */}
              <Link
                href="/admin/gift"
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex items-center gap-3 rounded-2xl border border-divider bg-surface-white px-4 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDE6FC] text-[16px]">🎁</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold">Gift Cards</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-text-tertiary">Seus clientes montam vale-presentes pra dar.</span>
                </span>
                <span className="shrink-0 text-text-tertiary">→</span>
              </Link>

              {/* Atalho pro painel de gestão, só pros masters */}
              {isMaster && (
                <Link
                  href="/master"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex items-center gap-3 rounded-2xl border border-[#E7D3A0] bg-[#FBF6E9] px-4 py-3.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#C9962E] to-[#F0CB6A] text-[15px] text-white">★</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-[#8A6A1E]">Painel Master</span>
                    <span className="block text-[12px] text-[#8A6A1E]/70">Gestão, financeiro e negócios do Orbibox.</span>
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
                className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3.5 text-left active:bg-surface-soft disabled:opacity-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                </span>
                <span className="text-[14.5px] font-semibold text-red-600">
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
              {negocios.map((n) => {
                const ativo = n.id === negocioAtual;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => trocarPara(n.id)}
                    disabled={!!trocando}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${ativo ? "border-on-background" : "border-divider"} disabled:opacity-60`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft font-[family-name:var(--font-manrope)] text-[15px] font-semibold">
                      {n.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{n.name}</span>
                      <span className="block truncate text-[12px] text-text-tertiary">/{n.slug}</span>
                    </span>
                    {trocando === n.id ? (
                      <span className="text-[12px] text-text-tertiary">Abrindo…</span>
                    ) : ativo ? (
                      <span className="text-[13px] font-medium">✓</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {podeCriarNegocio ? (
              <Link
                href="/onboarding?novo=1"
                onClick={() => setTrocaOpen(false)}
                className="orbi-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-medium text-on-background"
              >
                + Criar outro Orbibox
              </Link>
            ) : (
              <Link
                href="/admin/planos"
                onClick={() => setTrocaOpen(false)}
                className="mt-4 block rounded-2xl bg-surface-soft px-4 py-3 text-center text-[13px] text-text-secondary"
              >
                Tem mais de uma marca? No plano <span className="font-medium text-on-background">Nióbio</span> você cria vários Orbibox, cada um com seu link e sua IA. Ver planos →
              </Link>
            )}
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
