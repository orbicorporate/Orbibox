import { createClient } from "@/lib/supabase/server";
import { ConversasList } from "./ConversasList";

export default async function ConversasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user!.id)
    .limit(1)
    .single();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, started_at, channel")
    .eq("business_id", business!.id)
    .order("started_at", { ascending: false })
    .limit(50);

  const ids = (conversations ?? []).map((c) => c.id);
  const { data: messages } = ids.length > 0
    ? await supabase.from("messages").select("id, conversation_id, role, content, created_at").in("conversation_id", ids).order("created_at", { ascending: true })
    : { data: [] };

  const byConversation: Record<string, { role: string; content: string }[]> = {};
  for (const m of messages ?? []) {
    byConversation[m.conversation_id] ??= [];
    byConversation[m.conversation_id].push({ role: m.role, content: m.content });
  }

  const list = (conversations ?? []).map((c) => ({
    id: c.id,
    startedAt: c.started_at,
    messages: byConversation[c.id] ?? [],
  }));

  return (
    <div className="flex flex-col">
      <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[34px] font-medium tracking-[-0.02em]">
        Conversas
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
        Tudo que a Orbi conversou com quem visitou seu link. O contato só aparece nas conversas em que a
        pessoa deixou o WhatsApp — nessas, marcamos com a etiqueta <span className="font-medium text-[#128C3E]">☎ tem contato</span> e você responde direto por lá.
      </p>
      <ConversasList conversations={list} />
    </div>
  );
}
