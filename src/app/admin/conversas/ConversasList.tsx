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

/**
 * Procura um número de telefone/WhatsApp nas mensagens do visitante. A Orbi
 * pede o contato durante a conversa, então ele fica no texto — não numa coluna
 * separada. Aceita formatos comuns brasileiros (com/sem DDD, com/sem +55).
 * Retorna só os dígitos, ou null se não achar.
 */
function acharWhatsapp(messages: Msg[]): string | null {
  for (const m of messages) {
    if (m.role !== "visitor") continue;
    // sequência com 10 a 13 dígitos, tolerando espaços, hífens, parênteses e +.
    const match = m.content.match(/(\+?\d[\d\s().-]{8,}\d)/);
    if (match) {
      const digits = match[1].replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 13) return digits;
    }
  }
  return null;
}

function formatFone(digits: string) {
  const d = digits.replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

const PERIODOS = [
  { key: "todos", label: "Todos", horas: null },
  { key: "24h", label: "24h", horas: 24 },
  { key: "7d", label: "7 dias", horas: 24 * 7 },
  { key: "15d", label: "15 dias", horas: 24 * 15 },
  { key: "30d", label: "30 dias", horas: 24 * 30 },
] as const;

export function ConversasList({ conversations }: { conversations: Conversa[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [soComContato, setSoComContato] = useState(false);
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["key"]>("todos");
  const [excluidas, setExcluidas] = useState<Set<string>>(new Set());
  const [excluindo, setExcluindo] = useState<string | null>(null);
  // Momento em que a tela abriu — base estável pros filtros de período.
  const [agora] = useState(() => Date.now());

  // Abrir essa tela já conta como "vi as conversas" — zera o sininho do Today.
  useEffect(() => {
    if (conversations.length === 0) return;
    const supabase = createClient();
    supabase.from("conversations").update({ seen_by_owner: true }).in("id", conversations.map((c) => c.id)).then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function excluir(id: string) {
    if (!window.confirm("Excluir esta conversa? Essa ação não pode ser desfeita.")) return;
    setExcluindo(id);
    const supabase = createClient();
    // Apaga as mensagens primeiro, depois a conversa (evita ficar mensagem órfã).
    await supabase.from("messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    setExcluidas((prev) => new Set(prev).add(id));
    setExcluindo(null);
  }

  if (conversations.length === 0) {
    return (
      <div className="mt-6 rounded-[28px] border border-divider bg-surface-white p-6 text-[14px] text-text-secondary">
        Ainda sem conversas. Assim que alguém tocar em &quot;Falar com a Orbi&quot; no seu link, elas aparecem aqui.
      </div>
    );
  }

  const horasFiltro = PERIODOS.find((p) => p.key === periodo)?.horas ?? null;
  const visiveis = conversations.filter((c) => {
    if (excluidas.has(c.id)) return false;
    if (soComContato && !acharWhatsapp(c.messages)) return false;
    if (horasFiltro !== null) {
      const idadeH = (agora - new Date(c.startedAt).getTime()) / 3600000;
      if (idadeH > horasFiltro) return false;
    }
    return true;
  });

  return (
    <div className="mt-5 flex flex-col">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSoComContato((v) => !v)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${soComContato ? "bg-[#25D366] text-white" : "bg-surface-soft text-text-secondary"}`}
        >
          ☎ Com contato
        </button>
        <span className="h-5 w-px bg-divider" />
        {PERIODOS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${periodo === p.key ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-divider bg-surface-white p-6 text-center text-[14px] text-text-secondary">
          Nenhuma conversa nesse filtro.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {visiveis.map((c) => {
            const visitorMsgs = c.messages.filter((m) => m.role === "visitor");
            const preview = visitorMsgs[0]?.content ?? c.messages[0]?.content ?? "(sem mensagens)";
            const open = openId === c.id;
            const whats = acharWhatsapp(c.messages);
            return (
              <div key={c.id} className="overflow-hidden rounded-[24px] border border-divider bg-surface-white">
                <button onClick={() => setOpenId(open ? null : c.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] text-text-tertiary">{formatData(c.startedAt)}</p>
                      {whats && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/12 px-2 py-0.5 text-[10px] font-semibold text-[#128C3E]">
                          ☎ tem contato
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[14px] text-on-background">{preview}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-text-tertiary">{c.messages.length} {c.messages.length === 1 ? "msg" : "msgs"}</span>
                </button>
                {open && (
                  <div className="flex flex-col gap-3 border-t border-divider p-4">
                    {whats && (
                      <a
                        href={`https://wa.me/${whats.startsWith("55") ? whats : `55${whats}`}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-[14px] font-medium text-white"
                      >
                        ☎ Responder no WhatsApp · {formatFone(whats)}
                      </a>
                    )}
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
                    <button
                      onClick={() => excluir(c.id)}
                      disabled={excluindo === c.id}
                      className="mt-1 self-start text-[13px] font-medium text-red-600 disabled:opacity-50"
                    >
                      {excluindo === c.id ? "Excluindo…" : "Excluir conversa"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
