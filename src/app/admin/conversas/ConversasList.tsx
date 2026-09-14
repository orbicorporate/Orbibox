"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useDialogs } from "@/hooks/useDialogs";
import { formatFone } from "@/lib/utils";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type Msg = { role: string; content: string };
type NextAction = { titulo: string; mensagem: string; quando: string; motivo?: string };
type Lead = {
  id: string;
  whatsapp: string;
  name: string | null;
  status: string;
  temperature: number;
  summary: string | null;
  nextAction: NextAction | null;
  interests: string[];
};
type Conversa = {
  id: string;
  startedAt: string;
  messages: Msg[];
  summary: string | null;
  temperature: number | null;
  lead: Lead | null;
};

function formatData(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia) return `Hoje, ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}, ${hora}`;
}

const PERIODOS = [
  { key: "todos", label: "Todos", horas: null },
  { key: "24h", label: "24h", horas: 24 },
  { key: "7d", label: "7 dias", horas: 24 * 7 },
  { key: "30d", label: "30 dias", horas: 24 * 30 },
] as const;

/** Temperatura em três faixas com cor: é o que a pessoa olha primeiro. */
function faixa(t: number | null) {
  if (t === null) return null;
  if (t >= 70) return { label: "Quente", cor: "#C0392B", fundo: "#FDE7E7" };
  if (t >= 35) return { label: "Morno", cor: "#C2650A", fundo: "#FDEEDF" };
  return { label: "Frio", cor: "#555960", fundo: "#ECEDE9" };
}

export function TemperaturaTag({ valor }: { valor: number | null }) {
  const f = faixa(valor);
  if (!f) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ color: f.cor, backgroundColor: f.fundo }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: f.cor }} />
      {f.label}
    </span>
  );
}

const STATUS_LABEL: Record<string, string> = { novo: "Novo", conversando: "Conversando", fechou: "Fechou", perdeu: "Perdeu" };

export function ConversasList({ conversations, businessId, orbiColors }: { conversations: Conversa[]; businessId: string; orbiColors?: string[] | null }) {
  const { confirm, DialogRenderer } = useDialogs();
  const [lista, setLista] = useState<Conversa[]>(conversations);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "quentes" | "contato">("todos");
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["key"]>("todos");
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [analisando, setAnalisando] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState<string | null>(null);
  const [agora] = useState(() => Date.now());

  useEffect(() => {
    if (conversations.length === 0) return;
    const supabase = createClient();
    supabase.from("conversations").update({ seen_by_owner: true }).in("id", conversations.map((c) => c.id)).then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A Orbi analisa em segundo plano o que ainda não tem resumo, começando
  // pelos que têm contato (são os que viram ação). Um por vez, sem travar.
  const analisar = useCallback(async (c: Conversa) => {
    setAnalisando((s) => new Set(s).add(c.id));
    try {
      if (c.lead) {
        const r = await fetch("/api/leads/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: c.lead.id }) });
        const d = await r.json();
        if (r.ok) {
          setLista((prev) => prev.map((x) => x.id === c.id && x.lead
            ? { ...x, summary: d.resumo ?? x.summary, temperature: d.temperatura ?? x.temperature,
                lead: { ...x.lead, summary: d.resumo ?? x.lead.summary, temperature: d.temperatura ?? x.lead.temperature, nextAction: d.proxima_acao ?? x.lead.nextAction, interests: d.interesses ?? x.lead.interests, name: d.nome ?? x.lead.name } }
            : x));
        }
      } else {
        const r = await fetch("/api/conversas/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: c.id }) });
        const d = await r.json();
        if (r.ok) setLista((prev) => prev.map((x) => x.id === c.id ? { ...x, summary: d.resumo ?? "", temperature: d.temperatura ?? 0 } : x));
      }
    } finally {
      setAnalisando((s) => { const n = new Set(s); n.delete(c.id); return n; });
    }
  }, []);

  useEffect(() => {
    const pendentes = conversations
      .filter((c) => (c.lead ? !c.lead.summary : c.summary === null))
      .sort((a, b) => (b.lead ? 1 : 0) - (a.lead ? 1 : 0))
      .slice(0, 8);
    let cancel = false;
    (async () => {
      for (const c of pendentes) {
        if (cancel) break;
        await analisar(c);
      }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function mudarStatus(leadId: string, status: string) {
    const supabase = createClient();
    await supabase.from("leads").update({ status }).eq("id", leadId);
    setLista((prev) => prev.map((c) => c.lead?.id === leadId ? { ...c, lead: { ...c.lead, status } } : c));
  }

  async function reanalisar(c: Conversa) {
    if (!c.lead) return;
    const supabase = createClient();
    await supabase.from("leads").update({ analyzed_at: null }).eq("id", c.lead.id);
    await analisar(c);
  }

  async function copiar(texto: string, id: string) {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(null), 1500); } catch { /* sem clipboard */ }
  }

  async function exportarContatos() {
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: leads } = await supabase
        .from("leads")
        .select("name, whatsapp, source, status, temperature, summary, created_at")
        .eq("business_id", businessId)
        .order("last_activity_at", { ascending: false });
      if (!leads || leads.length === 0) return;
      const header = "Nome,WhatsApp,Origem,Status,Temperatura,Resumo,Desde\n";
      const body = leads.map((l) => [
        l.name ?? "", formatFone(l.whatsapp), l.source, STATUS_LABEL[l.status] ?? l.status, l.temperature, l.summary ?? "", new Date(l.created_at).toLocaleString("pt-BR"),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + header + body], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `leads-orbibox-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExporting(false);
    }
  }

  async function excluir(id: string) {
    if (!(await confirm({ title: "Excluir conversa", message: "Excluir esta conversa? Essa ação não pode ser desfeita.", confirmLabel: "Excluir", danger: true }))) return;
    setExcluindo(id);
    const supabase = createClient();
    await supabase.from("messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    setLista((prev) => prev.filter((c) => c.id !== id));
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
  const visiveis = lista.filter((c) => {
    if (filtro === "contato" && !c.lead) return false;
    if (filtro === "quentes" && (c.lead?.temperature ?? c.temperature ?? 0) < 70) return false;
    if (horasFiltro !== null && (agora - new Date(c.startedAt).getTime()) / 3600000 > horasFiltro) return false;
    return true;
  });

  const quentes = lista.filter((c) => (c.lead?.temperature ?? c.temperature ?? 0) >= 70).length;
  const comContato = lista.filter((c) => c.lead).length;

  return (
    <div className="mt-5 flex flex-col">
      <DialogRenderer />

      {/* Números que importam, antes da lista */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[20px] border border-divider bg-surface-white px-4 py-3.5 text-center">
          <p className="text-[22px] font-bold leading-none">{lista.length}</p>
          <p className="mt-1 text-[11.5px] text-text-tertiary">conversas</p>
        </div>
        <div className="rounded-[20px] border border-divider bg-surface-white px-4 py-3.5 text-center">
          <p className="text-[22px] font-bold leading-none text-[#128C3E]">{comContato}</p>
          <p className="mt-1 text-[11.5px] text-text-tertiary">com contato</p>
        </div>
        <div className="rounded-[20px] border border-divider bg-surface-white px-4 py-3.5 text-center">
          <p className="text-[22px] font-bold leading-none text-[#C0392B]">{quentes}</p>
          <p className="mt-1 text-[11.5px] text-text-tertiary">quentes</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {([["todos", "Todas"], ["quentes", "🔥 Quentes"], ["contato", "☎ Com contato"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFiltro(k)} className={`cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-medium ${filtro === k ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}>
            {l}
          </button>
        ))}
        <span className="h-5 w-px bg-divider" />
        {PERIODOS.map((p) => (
          <button key={p.key} type="button" onClick={() => setPeriodo(p.key)} className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-medium ${periodo === p.key ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>
            {p.label}
          </button>
        ))}
      </div>

      <button type="button" onClick={exportarContatos} disabled={exporting} className="mt-2 cursor-pointer self-start rounded-full border border-divider bg-surface-white px-3.5 py-1.5 text-[12px] font-medium text-text-secondary disabled:opacity-50">
        {exporting ? "Exportando…" : "⬇ Exportar leads (CSV)"}
      </button>

      {visiveis.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-divider bg-surface-white p-6 text-center text-[14px] text-text-secondary">
          Nenhuma conversa nesse filtro.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {visiveis.map((c) => {
            const open = openId === c.id;
            const lead = c.lead;
            const temp = lead?.temperature ?? c.temperature;
            const resumo = lead?.summary || c.summary;
            const carregando = analisando.has(c.id);
            const titulo = lead?.name || (lead ? formatFone(lead.whatsapp) : null);

            return (
              <div key={c.id} className="overflow-hidden rounded-[24px] border border-divider bg-surface-white">
                <button type="button" onClick={() => setOpenId(open ? null : c.id)} className="flex w-full cursor-pointer items-start gap-3 p-4 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {titulo && <p className="text-[14.5px] font-semibold">{titulo}</p>}
                      <TemperaturaTag valor={temp} />
                      {lead && lead.status !== "novo" && (
                        <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10.5px] font-semibold text-text-secondary">{STATUS_LABEL[lead.status]}</span>
                      )}
                    </div>
                    {/* Resumo da Orbi no lugar da primeira mensagem crua */}
                    {carregando ? (
                      <p className="mt-1 flex items-center gap-2 text-[13px] text-text-tertiary">
                        <span className="h-4 w-4 overflow-hidden rounded-full"><OrbiParticleSphere size={16} colors={orbiColors ?? undefined} className="rounded-full" /></span>
                        Orbi lendo a conversa…
                      </p>
                    ) : (
                      <p className="mt-1 text-[13.5px] leading-snug text-on-background">
                        {resumo || c.messages.find((m) => m.role === "visitor")?.content || ""}
                      </p>
                    )}
                    <p className="mt-1 text-[11.5px] text-text-tertiary">
                      {formatData(c.startedAt)} · {c.messages.length} {c.messages.length === 1 ? "msg" : "msgs"}
                    </p>
                  </div>
                  <span className={`mt-1 shrink-0 text-text-tertiary transition-transform ${open ? "rotate-90" : ""}`}>→</span>
                </button>

                {open && (
                  <div className="flex flex-col gap-3 border-t border-divider p-4">
                    {/* Próxima ação: o coração da coisa. Mensagem pronta e
                        botão que abre o WhatsApp já com ela preenchida. */}
                    {lead?.nextAction?.mensagem && (
                      <div className="orbi-card-light relative overflow-hidden rounded-[20px] p-4">
                        <div className="relative flex items-center gap-2">
                          <span className="h-6 w-6 overflow-hidden rounded-full"><OrbiParticleSphere size={24} colors={orbiColors ?? undefined} className="rounded-full" /></span>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Próxima ação</p>
                          {lead.nextAction.quando && <span className="ml-auto text-[11px] text-text-tertiary">{lead.nextAction.quando}</span>}
                        </div>
                        <p className="relative mt-2 text-[15px] font-semibold leading-tight">{lead.nextAction.titulo}</p>
                        {lead.nextAction.motivo && <p className="relative mt-0.5 text-[12.5px] text-text-secondary">{lead.nextAction.motivo}</p>}
                        <div className="relative mt-3 rounded-2xl bg-white/70 px-4 py-3">
                          <p className="whitespace-pre-line text-[14px] leading-relaxed">{lead.nextAction.mensagem}</p>
                        </div>
                        <div className="relative mt-3 flex gap-2">
                          <a
                            href={`https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(lead.nextAction.mensagem)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-[14px] font-semibold text-white"
                          >
                            ☎ Mandar no WhatsApp
                          </a>
                          <button type="button" onClick={() => copiar(lead.nextAction!.mensagem, c.id)} className="cursor-pointer rounded-full border border-divider bg-surface-white px-4 text-[13px] font-medium">
                            {copiado === c.id ? "✓" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    )}

                    {lead && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Status</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {Object.entries(STATUS_LABEL).map(([k, l]) => (
                            <button key={k} type="button" onClick={() => mudarStatus(lead.id, k)} className={`cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-medium ${lead.status === k ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                        {lead.interests.length > 0 && (
                          <p className="mt-2 text-[12.5px] text-text-secondary">Interesses: {lead.interests.join(", ")}</p>
                        )}
                      </div>
                    )}

                    {lead && !lead.nextAction && !carregando && (
                      <button type="button" onClick={() => analisar(c)} className="cursor-pointer self-start rounded-full bg-surface-soft px-3.5 py-2 text-[12.5px] font-semibold text-text-secondary">
                        ✦ Pedir análise da Orbi
                      </button>
                    )}
                    {lead?.nextAction && !carregando && (
                      <button type="button" onClick={() => reanalisar(c)} className="cursor-pointer self-start text-[12px] text-text-tertiary underline">
                        Reanalisar
                      </button>
                    )}

                    <div className="mt-1 flex flex-col gap-2 border-t border-divider pt-3">
                      {c.messages.map((m, i) => (
                        <div key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${m.role === "visitor" ? "ml-auto bg-on-background text-white" : "bg-surface-soft text-on-background"}`}>
                          {m.content}
                        </div>
                      ))}
                    </div>

                    <button type="button" onClick={() => excluir(c.id)} disabled={excluindo === c.id} className="mt-1 cursor-pointer self-start text-[13px] font-medium text-red-600 disabled:opacity-50">
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
