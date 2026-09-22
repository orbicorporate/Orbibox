import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { getBusinessProgress } from "@/lib/progress";
import { getPendingInsights } from "@/lib/insights";
import { ProgressCard } from "@/components/ProgressWidgets";

export default async function PendenciasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);

  const [progress, insights] = await Promise.all([
    getBusinessProgress(businessId!),
    getPendingInsights(businessId!),
  ]);

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[28px] font-semibold tracking-[-0.02em]">
        O que falta fazer
      </h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
        Tudo que ainda pode melhorar no seu Orbibox, numa lista só. Quanto mais completo, mais gente confia e compra.
      </p>

      <ProgressCard done={progress.done} pct={progress.pct} />

      {insights.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Detalhes que valem a pena</p>
          {insights.map((it) => (
            <Link
              key={it.href + it.title}
              href={it.href}
              className="flex items-center justify-between gap-3 rounded-[20px] border border-divider bg-surface-white p-4 active:opacity-60"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium leading-tight">{it.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">{it.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-medium text-text-secondary">
                {it.ctaLabel}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[20px] bg-[#E4F7EA] p-4 text-center">
          <p className="text-[14px] font-semibold text-[#1F7A45]">✓ Tudo em dia por aqui</p>
          <p className="mt-1 text-[12.5px] text-[#1F7A45]/80">
            Seu Orbibox está completo. Agora é acompanhar o Pulse e continuar divulgando.
          </p>
        </div>
      )}
    </div>
  );
}
