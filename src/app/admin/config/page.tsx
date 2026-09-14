import Link from "next/link";
import { loadConfigData } from "./loadConfigData";
import { SignOutButton } from "./SignOutButton";
import { StatusTag } from "@/components/ui/SecaoRecolhivel";

type Pendencias = { marca: number; contatos: number; orbi: number };

const ITEMS = [
  {
    key: "marca" as const,
    href: "/admin/config/marca",
    label: "Identidade e marca",
    desc: "Logotipo e a capa que aparece quando alguém abre seu link.",
    bg: "#E7EAFC", fg: "#4453D6",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" /><path d="M9 20v-5a1 1 0 011-1h4a1 1 0 011 1v5" /><path d="M3 9h18" />
      </svg>
    ),
  },
  {
    key: "contatos" as const,
    href: "/admin/config/contatos",
    label: "Contatos",
    desc: "WhatsApp, telefone, e-mail, site e endereço que o visitante vê.",
    bg: "#DEF3E3", fg: "#1F9E4C",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      </svg>
    ),
  },
  {
    key: "orbi" as const,
    href: "/admin/config/orbi",
    label: "O que a Orbi sabe",
    desc: "Leia e ajuste o texto que ela usa pra responder seus visitantes.",
    bg: "orbi-gradient", fg: "#111318",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
      </svg>
    ),
  },
];

export default async function ConfigMenuPage() {
  const { businessId, business } = await loadConfigData();

  // Quantos campos de cada seção ainda estão vazios. Vira a tag vermelha
  // no menu, pra pessoa saber o que falta sem abrir tudo.
  const vazio = (v: unknown) => !(typeof v === "string" ? v.trim() : v);
  // Capa e descrição do link contam a mesma cascata do OpenGraph: capa da
  // vitrine ou logo já servem de capa, e o "sobre" serve de descrição. Não
  // adianta cobrar um campo que o app já resolve sozinho.
  const temCapaLink = !!(
    business.share_image_url ||
    business.vitrine_cover_url ||
    (Array.isArray(business.vitrine_cover_urls) && (business.vitrine_cover_urls as string[])[0]) ||
    business.logo_url
  );
  const temDescricaoLink = !!(business.share_description?.trim() || business.about_business?.trim());
  const pendencias: Pendencias = {
    marca: [business.logo_url].filter(vazio).length + (temCapaLink ? 0 : 1) + (temDescricaoLink ? 0 : 1),
    contatos: [business.contact_whatsapp, business.contact_phone, business.contact_email, business.address].filter(vazio).length,
    orbi: [business.about_business, business.differentials, business.policies].filter(vazio).length,
  };

  return (
    <div className="flex flex-col pb-4">
      <h1 data-tour="config" className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
        Configurações
      </h1>
      <p className="mt-1 text-[14px] text-text-secondary">Escolha o que você quer ajustar.</p>

      <div className="mt-6 flex flex-col gap-3">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3.5 rounded-[22px] border border-divider bg-surface-white p-4 active:bg-surface-soft"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={item.bg === "orbi-gradient" ? undefined : { backgroundColor: item.bg, color: item.fg }}
            >
              {item.bg === "orbi-gradient" ? (
                <span className="orbi-gradient flex h-11 w-11 items-center justify-center rounded-2xl" style={{ color: item.fg }}>{item.icon}</span>
              ) : item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold">{item.label}</span>
                {pendencias[item.key] > 0 ? (
                  <span className="shrink-0 rounded-full bg-[#FDE7E7] px-2.5 py-1 text-[11px] font-semibold text-[#C0392B]">
                    {pendencias[item.key]} {pendencias[item.key] === 1 ? "campo" : "campos"} sem preencher
                  </span>
                ) : (
                  <StatusTag preenchido />
                )}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-text-tertiary">{item.desc}</span>
            </span>
            <span className="shrink-0 text-text-tertiary">→</span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-[13px] uppercase tracking-wide text-text-tertiary">Conta</p>
      <div className="mt-2.5 flex flex-col gap-3">
        <Link href="/admin/indique" className="flex items-center gap-2.5 rounded-2xl border border-divider bg-surface-white px-4 py-3.5">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5L3 8z" />
            <path d="M5 20h14" />
          </svg>
          <span className="min-w-0 flex-1 text-[14px] font-medium">Programa Embaixador</span>
          <span className="text-text-tertiary">→</span>
        </Link>
        <Link href="/admin/config/equipe" className="flex items-center justify-between rounded-2xl border border-divider bg-surface-white px-4 py-3.5 text-[14px] font-medium">
          Equipe · quem pode acessar
          <span className="text-text-tertiary">→</span>
        </Link>
        <Link href="/admin/planos" className="flex items-center justify-between rounded-2xl border border-divider bg-surface-white px-4 py-3.5 text-[14px] font-medium">
          Plano e cobrança
          <span className="text-text-tertiary">→</span>
        </Link>
        <SignOutButton />
      </div>
      {/* businessId disponível caso precise no futuro */}
      <span className="hidden">{businessId}</span>
    </div>
  );
}
