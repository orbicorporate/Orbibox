import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

const CATEGORIES = [
  { key: "discovery_score", label: "Descoberta", desc: "Quantas pessoas encontram seu Orbibox e de onde vêm." },
  { key: "interest_score", label: "Interesse", desc: "Engajamento com conteúdo, tempo de navegação e cliques." },
  { key: "conversion_score", label: "Conversão", desc: "Visitantes que viraram lead, compra ou agendamento." },
  { key: "relationship_score", label: "Relacionamento", desc: "Retorno de clientes e qualidade das conversas com a Zara." },
] as const;

export default async function PulsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();

  const { data: pulse } = await supabase
    .from("pulse_metrics")
    .select("*")
    .eq("business_id", business!.id)
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Orbi Pulse</p>
        <h1 className="font-[family-name:var(--font-manrope)] text-[32px] font-medium tracking-[-0.01em]">
          Análise detalhada
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          A performance do seu Orbibox sob a ótica da Orbi — divida por etapa do funil.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const score = (pulse?.[cat.key] as number | null) ?? 0;
          return (
            <Card key={cat.key}>
              <div className="flex items-baseline justify-between">
                <p className="text-[15px] font-medium">{cat.label}</p>
                <p className="font-[family-name:var(--font-manrope)] text-[28px] font-medium">
                  {score}
                </p>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-surface-soft">
                <div className="h-1.5 rounded-full orbi-gradient" style={{ width: `${score}%` }} />
              </div>
              <p className="mt-3 text-[13px] text-text-secondary">{cat.desc}</p>
            </Card>
          );
        })}
      </div>

      <Card>
        <p className="text-[13px] font-medium uppercase tracking-wide text-text-tertiary">
          Score geral
        </p>
        <p className="mt-1 font-[family-name:var(--font-manrope)] text-[56px] font-medium leading-none">
          {pulse?.overall_score ?? 0}
        </p>
      </Card>
    </div>
  );
}
