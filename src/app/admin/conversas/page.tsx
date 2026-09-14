import { createClient } from "@/lib/supabase/server";
import { getCurrentBusinessId } from "@/lib/business";
import { ConversasTabs } from "./ConversasTabs";

export default async function ConversasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const businessId = await getCurrentBusinessId(user!.id);
  const [{ data: business }, { data: agentConfig }] = await Promise.all([
    supabase.from("businesses").select("id").eq("id", businessId!).single(),
    supabase.from("agent_configs").select("orbi_colors").eq("business_id", businessId!).maybeSingle(),
  ]);

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, started_at, channel, lead_id, summary, temperature")
    .eq("business_id", business!.id)
    .order("started_at", { ascending: false })
    .limit(50);

  // Leads ligados a essas conversas: nome, temperatura e próxima ação.
  const leadIds = [...new Set((conversations ?? []).map((c) => c.lead_id).filter(Boolean))] as string[];
  const { data: leads } = leadIds.length > 0
    ? await supabase.from("leads").select("id, whatsapp, name, status, temperature, summary, next_action, interests").in("id", leadIds)
    : { data: [] };
  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));

  const ids = (conversations ?? []).map((c) => c.id);
  const { data: messages } = ids.length > 0
    ? await supabase.from("messages").select("id, conversation_id, role, content, created_at").in("conversation_id", ids).order("created_at", { ascending: true })
    : { data: [] };

  const byConversation: Record<string, { role: string; content: string }[]> = {};
  for (const m of messages ?? []) {
    byConversation[m.conversation_id] ??= [];
    byConversation[m.conversation_id].push({ role: m.role, content: m.content });
  }

  const list = (conversations ?? [])
    .map((c) => {
      const lead = c.lead_id ? leadById.get(c.lead_id) ?? null : null;
      return {
        id: c.id,
        startedAt: c.started_at,
        messages: byConversation[c.id] ?? [],
        summary: c.summary ?? null,
        temperature: c.temperature ?? null,
        lead: lead
          ? {
              id: lead.id,
              whatsapp: lead.whatsapp,
              name: lead.name,
              status: lead.status,
              temperature: lead.temperature,
              summary: lead.summary,
              nextAction: (lead.next_action as { titulo: string; mensagem: string; quando: string; motivo?: string } | null) ?? null,
              interests: lead.interests ?? [],
            }
          : null,
      };
    })
    // Conversa sem nenhuma mensagem do visitante não vira nada: só poluía
    // a lista com "(sem mensagens)".
    .filter((c) => c.messages.some((m) => m.role === "visitor"));

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
        Conversas
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
        A Orbi lê cada conversa, resume o que a pessoa quis e te diz quem está quente e o que mandar.
      </p>
      <ConversasTabs conversations={list} businessId={business!.id} orbiColors={(agentConfig?.orbi_colors as string[] | null) ?? null} />
    </div>
  );
}
