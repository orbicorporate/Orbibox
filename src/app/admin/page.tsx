import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { OrbBadge } from "@/components/ui/OrbBadge";

function scoreLabel(score: number) {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Muito bom";
  if (score >= 40) return "Em progresso";
  return "Precisa de atenção";
}

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

  const { data: pulse } = await supabase
    .from("pulse_metrics")
    .select("*")
    .eq("business_id", business!.id)
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("*")
    .eq("business_id", business!.id)
    .eq("status", "open")
    .order("impact_score", { ascending: false });

  const score = pulse?.overall_score ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Hoje</p>
        <h1 className="font-[family-name:var(--font-manrope)] text-[32px] font-medium tracking-[-0.01em]">
          Bem-vindo de volta, {business?.name}
        </h1>
      </div>

      {/* Orbi Pulse */}
      <Card className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="orbi-gradient-text text-[13px] font-medium">◉ Orbi Pulse</span>
          </div>
          <p className="mt-2 font-[family-name:var(--font-manrope)] text-[44px] font-medium leading-none">
            {score}
          </p>
          <p className="mt-1 text-[15px] text-text-secondary">{scoreLabel(score)}</p>
        </div>
        <Link
          href="/admin/pulse"
          className="text-[13px] font-medium text-on-background underline underline-offset-4"
        >
          Ver detalhes →
        </Link>
      </Card>

      {/* Oportunidades */}
      <div>
        <h2 className="mb-3 font-[family-name:var(--font-manrope)] text-[20px] font-medium">
          Oportunidades encontradas pela Orbi
        </h2>
        <div className="flex flex-col gap-3">
          {opportunities && opportunities.length > 0 ? (
            opportunities.map((op) => (
              <Card key={op.id} className="flex items-start justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <OrbBadge state="insight" />
                    <span className="text-[13px] text-text-tertiary capitalize">
                      {op.category}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[15px] font-medium">{op.title}</p>
                  {op.description && (
                    <p className="mt-1 text-[14px] text-text-secondary">{op.description}</p>
                  )}
                </div>
                <span className="whitespace-nowrap text-[13px] text-text-tertiary">
                  impacto {op.impact_score}
                </span>
              </Card>
            ))
          ) : (
            <Card className="text-[15px] text-text-secondary">
              Nenhuma oportunidade em aberto no momento — a Orbi está de olho. ✦
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
