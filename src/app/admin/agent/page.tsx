import { createClient } from "@/lib/supabase/server";
import { AgentConfigForm } from "./AgentConfigForm";

export default async function AgentPage() {
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

  const { data: config } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("business_id", business!.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[13px] uppercase tracking-wide text-text-tertiary">AgentBox</p>
        <h1 className="font-[family-name:var(--font-manrope)] text-[32px] font-medium tracking-[-0.01em]">
          Personalidade da Zara
        </h1>
        <p className="mt-1 text-[15px] text-text-secondary">
          Defina o tom de voz e os objetivos da sua assistente.
        </p>
      </div>
      {config && <AgentConfigForm config={config} />}
    </div>
  );
}
