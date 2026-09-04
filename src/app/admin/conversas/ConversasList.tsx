"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Msg = { role: string; content: string };
type Conversa = { id: string; startedAt: string; messages: Msg[] };

function formatData(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia) return `Hoje, ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}, ${hora}`;
}

export function ConversasList({ conversations }: { conversations: Conversa[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  // Abrir essa tela já conta como "vi as conversas" — zera o sininho do Today.
  useEffect(() => {
    if (conversations.length === 0) return;
    const supabase = createClient();
    supabase.from("conversations").update({ seen_by_owner: true }).in("id", conversations.map((c) => c.id)).then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (conversations.length === 0) {
    return (
      <div className="mt-6 rounded-[28px] border border-divider bg-surface-white p-6 text-[14px] text-text-secondary">
        Ainda sem conversas. Assim que alguém tocar em &quot;Falar com a Orbi&quot; no seu link, elas aparecem aqui.
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {conversations.map((c) => {
        const visitorMsgs = c.messages.filter((m) => m.role === "visitor");
        const preview = visitorMsgs[0]?.content ?? c.messages[0]?.content ?? "(sem mensagens)";
        const open = openId === c.id;
        return (
          <div key={c.id} className="overflow-hidden rounded-[24px] border border-divider bg-surface-white">
            <button onClick={() => setOpenId(open ? null : c.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
              <div className="min-w-0">
                <p className="text-[12px] text-text-tertiary">{formatData(c.startedAt)}</p>
                <p className="mt-1 truncate text-[14px] text-on-background">{preview}</p>
              </div>
              <span className="shrink-0 text-[12px] text-text-tertiary">{c.messages.length} {c.messages.length === 1 ? "msg" : "msgs"}</span>
            </button>
            {open && (
              <div className="flex flex-col gap-3 border-t border-divider p-4">
                {c.messages.length === 0 ? (
                  <p className="text-[13px] text-text-tertiary">Sem mensagens registradas.</p>
                ) : (
                  c.messages.map((m, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                        m.role === "visitor" ? "ml-auto bg-on-background text-white" : "bg-surface-soft text-on-background"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
