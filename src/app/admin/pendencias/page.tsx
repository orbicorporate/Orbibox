import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { getBusinessProgress } from "@/lib/progress";
import { getPendingInsights, type Insight } from "@/lib/insights";
import { ProgressTags } from "@/components/ProgressWidgets";

// Cada pendência cai numa dessas 4 categorias, pra lista parar de ser um
// amontoado de itens soltos e virar algo mais didático: primeiro o básico
// pra funcionar, depois o que gera confiança, depois identidade, por
// último divulgação (só faz sentido depois do resto pronto).
type Categoria = "comece" | "confianca" | "marca" | "marketing";

const CATEGORIAS: Record<Categoria, { label: string; blurb: string }> = {
  comece: { label: "Primeiros passos", blurb: "O básico pra sua página funcionar de verdade." },
  confianca: { label: "Mais confiança", blurb: "Detalhes que fazem o visitante confiar e comprar." },
  marca: { label: "Sua marca", blurb: "Identidade e contato, pra ficar com a sua cara." },
  marketing: { label: "Divulgação", blurb: "Depois de pronto, hora de trazer gente nova." },
};
const ORDEM_CATEGORIAS: Categoria[] = ["comece", "confianca", "marca", "marketing"];

function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <path d="M17 13v8M13 17h8" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8a1 1 0 011-1h2l1.2-1.8A1 1 0 019 4.7h6a1 1 0 01.8.4L17 7h2a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V8z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}
function TextIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.6 5.6 6 .7-4.4 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.4 9.3l6-.7L12 3z" />
    </svg>
  );
}
function PhotosIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="M21 16l-5.5-5.5a1 1 0 00-1.4 0L6 19" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
    </svg>
  );
}
function PaletteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 100 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3c1.5 0 2.7-1.2 2.7-2.7C20 6.8 16.4 3 12 3z" />
      <circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="9" r="1.6" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  );
}
function WhatsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm5.8 14.3c-.2.7-1.4 1.4-2 1.4-.5 0-1.1.2-3.6-.9-3-1.3-5-4.4-5.1-4.6-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .5 0 .7.6.3.6 1 2.1 1 2.3.1.2.1.3 0 .5-.1.2-.2.3-.4.5-.2.2-.4.4-.5.6-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.6.3.2.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.2.7-.1.3.1 1.8.9 2.1 1 .3.2.5.2.6.4.1.2.1.7-.1 1.4z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.4" />
    </svg>
  );
}
function MegaphoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4a1 1 0 001 1h2l7 4V5L6 9H4a1 1 0 00-1 1z" />
      <path d="M17 9a3 3 0 010 6" />
    </svg>
  );
}
function DotIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

// Ícone + cor + categoria de cada pendência, casado por palavra-chave do
// título (vem de getPendingInsights). Mesma paleta de referência usada no
// checklist da Home (ProgressWidgets), pra tudo no app falar a mesma
// língua visual.
function insightMeta(insight: Insight): { categoria: Categoria; bg: string; fg: string; icon: ReactNode } {
  const t = insight.title.toLowerCase();
  if (t.includes("box")) return { categoria: "comece", bg: "#FDEEDF", fg: "#C2650A", icon: <BoxIcon /> };
  if (t.includes("catálogo")) return { categoria: "comece", bg: "#FCEADC", fg: "#C2650A", icon: <GridIcon /> };
  if (t.includes("foto") && t.includes("vitrine")) return { categoria: "confianca", bg: "#F3E4EE", fg: "#A23B82", icon: <CameraIcon /> };
  if (t.includes("descri")) return { categoria: "confianca", bg: "#F3E4EE", fg: "#A23B82", icon: <TextIcon /> };
  if (t.includes("diferenc")) return { categoria: "confianca", bg: "#F3E4EE", fg: "#A23B82", icon: <StarIcon /> };
  if (t.includes("negócio")) return { categoria: "confianca", bg: "#FBE7DE", fg: "#DB7A4E", icon: <PhotosIcon /> };
  if (t.includes("tom de voz")) return { categoria: "marca", bg: "orbi-gradient", fg: "#111318", icon: <SparkleIcon /> };
  if (t.includes("cor") && t.includes("orbi")) return { categoria: "marca", bg: "orbi-gradient", fg: "#111318", icon: <PaletteIcon /> };
  if (t.includes("logotipo")) return { categoria: "marca", bg: "#E7EAFC", fg: "#4453D6", icon: <ImageIcon /> };
  if (t.includes("whatsapp")) return { categoria: "marca", bg: "#DEF3E3", fg: "#1F9E4C", icon: <WhatsIcon /> };
  if (t.includes("endereço")) return { categoria: "marca", bg: "#E7EAFC", fg: "#4453D6", icon: <PinIcon /> };
  if (t.includes("divulgar")) return { categoria: "marketing", bg: "#DEF0EE", fg: "#189B6C", icon: <MegaphoneIcon /> };
  return { categoria: "comece", bg: "#ECEDE9", fg: "#555960", icon: <DotIcon /> };
}

function IconChip({ bg, fg, icon }: { bg: string; fg: string; icon: ReactNode }) {
  if (bg === "orbi-gradient") {
    return (
      <span className="orbi-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ color: fg }}>
        {icon}
      </span>
    );
  }
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: bg, color: fg }}>
      {icon}
    </span>
  );
}

export default async function PendenciasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);

  const [progress, insights] = await Promise.all([
    getBusinessProgress(businessId!),
    getPendingInsights(businessId!),
  ]);

  // Agrupa mantendo a prioridade que getPendingInsights já definiu dentro
  // de cada categoria, só reordena por categoria por cima.
  const grupos: Record<Categoria, Insight[]> = { comece: [], confianca: [], marca: [], marketing: [] };
  for (const it of insights) {
    grupos[insightMeta(it).categoria].push(it);
  }
  const categoriasComItens = ORDEM_CATEGORIAS.filter((c) => grupos[c].length > 0);

  return (
    <div className="flex flex-col">
      <span className="mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E4F7EA]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1F7A45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="12" height="17" rx="2" />
          <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
          <path d="M9 12l2 2 4-4.5" />
        </svg>
      </span>
      <h1 className="mt-4 font-[family-name:var(--font-manrope)] text-[32px] font-bold tracking-[-0.02em]">
        O que falta fazer
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
        Tudo que ainda pode melhorar no seu Orbibox, organizado por prioridade. Quanto mais completo, mais gente confia e compra.
      </p>

      <ProgressTags done={progress.done} pct={progress.pct} />

      {insights.length > 0 ? (
        <div className="mt-2 flex flex-col gap-7">
          {categoriasComItens.map((cat) => (
            <div key={cat}>
              <div className="flex items-baseline gap-2">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">{CATEGORIAS[cat].label}</p>
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-surface-soft px-1.5 text-[10.5px] font-semibold text-text-tertiary">
                  {grupos[cat].length}
                </span>
              </div>
              <p className="mt-0.5 text-[12.5px] text-text-tertiary">{CATEGORIAS[cat].blurb}</p>

              <div className="mt-3 flex flex-col gap-2.5">
                {grupos[cat].map((it) => {
                  const meta = insightMeta(it);
                  return (
                    <Link
                      key={it.href + it.title}
                      href={it.href}
                      className="flex items-center gap-3.5 rounded-[22px] border border-divider bg-surface-white p-4 active:opacity-60"
                    >
                      <IconChip bg={meta.bg} fg={meta.fg} icon={meta.icon} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold leading-tight">{it.title}</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{it.description}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-medium text-text-secondary">
                        {it.ctaLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[24px] bg-[#E4F7EA] p-5 text-center">
          <p className="text-[15px] font-semibold text-[#1F7A45]">✓ Tudo em dia por aqui</p>
          <p className="mt-1 text-[12.5px] text-[#1F7A45]/80">
            Seu Orbibox está completo. Agora é acompanhar o Pulse e continuar divulgando.
          </p>
        </div>
      )}
    </div>
  );
}
