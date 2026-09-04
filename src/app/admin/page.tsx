import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";

const METRICS = [
  { key: "discovery", label: "Visitas", icon: "◎", href: "/admin/pulse" },
  { key: "interest", label: "Interesses", icon: "♡", href: "/admin/pulse" },
  { key: "conversion", label: "Conversões", icon: "▤", href: "/admin/conversas" },
  { key: "relationship", label: "Ações", icon: "☞", href: "/admin/pulse" },
] as const;

export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();


  // Tudo que depende só do business roda em paralelo — antes eram 6 idas ao banco em fila.
  const [oppRes, visitsRes, convsRes, interestedRes, actionsRes] = await Promise.all([
    supabase.from("opportunities").select("*").eq("business_id", business!.id).eq("status", "open").order("impact_score", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
    supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).eq("business_id", business!.id).not("intent", "is", null),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
  ]);
  const opportunity = oppRes.data;
  const visits = visitsRes.count, convs = convsRes.count, interested = interestedRes.count, actions = actionsRes.count;

  const values: Record<string, number> = {
    discovery: visits ?? 0,
    interest: interested ?? 0,
    conversion: convs ?? 0,
    relationship: actions ?? 0,
  };

  // O botão do insight leva para onde a ação realmente acontece.
  const CTA: Record<string, { label: string; href: string }> = {
    descoberta: { label: "Abrir vitrine", href: "/admin/vitrine" },
    relacionamento: { label: "Configurar Orbi", href: "/admin/agent" },
    conversao: { label: "Ativar campanha", href: "/admin/campaigns" },
  };
  const cta = CTA[opportunity?.category ?? ""] ?? { label: "Ativar campanha", href: "/admin/campaigns" };

  const fullName = (user!.user_metadata?.full_name as string | undefined) ?? "";
  const firstName = fullName.split(" ")[0] || "você";

  return (
    <div className="flex flex-col">
      {/* Saudação dentro de um halo circular */}
      <div className="relative mx-auto mt-6 flex h-64 w-64 flex-col items-center justify-center text-center">
        <div className="orbi-halo absolute inset-0" aria-hidden>
          <span className="orbi-halo__dot" />
        </div>
        <h1 className="font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
          Olá, {firstName}
        </h1>
        <p className="mt-1 px-6 text-[14px] text-text-secondary">Seu negócio está indo bem hoje.</p>
      </div>
      <Link
        href={`/${business!.slug}`}
        target="_blank"
        className="mx-auto -mt-2 rounded-full border border-divider bg-surface-white px-4 py-1.5 text-[12px] text-text-secondary"
      >
        Ver meu Orbibox ↗
      </Link>

      {/* Métricas em lista — cada uma leva pro Pulse, onde dá pra ver o detalhe */}
      <div className="mt-8 flex flex-col">
        {METRICS.map((m) => (
          <Link key={m.key} href={m.href} className="flex items-center justify-between border-b border-divider py-4 active:opacity-60">
            <div className="flex items-center gap-3">
              <span className="text-[16px] text-text-secondary">{m.icon}</span>
              <span className="text-[15px] text-text-secondary">{m.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-manrope)] text-[22px] font-medium">
                {values[m.key].toLocaleString("pt-BR")}
              </span>
              <span className="text-[14px] text-text-tertiary">›</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Insight Orbi */}
      {opportunity && (
        <div className="mt-8 rounded-[28px] border border-divider bg-surface-white p-6">
          <OrbiOrb size={56} />
          <p className="mt-4 font-[family-name:var(--font-manrope)] text-[20px] font-medium">
            Insight Orbi
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            {opportunity.description ?? opportunity.title}
          </p>
          <Link
            href={cta.href}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-button-primary px-6 py-3 text-[14px] font-medium text-white"
          >
            {cta.label} →
          </Link>
        </div>
      )}
    </div>
  );
}
