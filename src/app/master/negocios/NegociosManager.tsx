"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Biz = {
  business_id: string;
  name: string;
  slug: string;
  owner_id: string;
  owner_email: string;
  created_at: string;
  plan_id: string | null;
  sub_status: string | null;
  billing_cycle: string | null;
  trial_ends_at: string | null;
  active_boxes: number;
  content_items: number;
  total_visits: number;
  total_clicks: number;
  total_conversations: number;
  tour_completed: boolean;
};

const STATUS_LABEL: Record<string, { t: string; c: string }> = {
  active: { t: "Pagante", c: "bg-green-100 text-green-700" },
  trialing: { t: "Em teste", c: "bg-blue-100 text-blue-700" },
  comped: { t: "Cortesia", c: "bg-purple-100 text-purple-700" },
  past_due: { t: "Pgto pendente", c: "bg-red-100 text-red-700" },
  canceled: { t: "Cancelado", c: "bg-neutral-200 text-neutral-600" },
  incomplete: { t: "Incompleto", c: "bg-orange-100 text-orange-700" },
};

export function NegociosManager({ businesses }: { businesses: Biz[] }) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | "active" | "trialing" | "comped" | "past_due" | "sem_plano">("todos");
  const [selected, setSelected] = useState<Biz | null>(null);
  const [rows, setRows] = useState<Biz[]>(businesses);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = rows.filter((b) => {
    const q = query.trim().toLowerCase();
    const matchQuery = !q || b.name?.toLowerCase().includes(q) || b.owner_email?.toLowerCase().includes(q) || b.slug?.toLowerCase().includes(q);
    const matchFilter =
      filter === "todos" ? true :
      filter === "sem_plano" ? !b.sub_status :
      b.sub_status === filter;
    return matchQuery && matchFilter;
  });

  async function salvarPlano(owner_id: string, plan_id: string, status: string) {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.rpc("master_set_subscription", { p_owner_id: owner_id, p_plan_id: plan_id, p_status: status });
    setSaving(false);
    if (error) { setMsg("Erro ao salvar: " + error.message); return; }
    setRows((prev) => prev.map((b) => (b.owner_id === owner_id ? { ...b, plan_id, sub_status: status } : b)));
    setSelected((s) => (s && s.owner_id === owner_id ? { ...s, plan_id, sub_status: status } : s));
    setMsg("✓ Plano atualizado.");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Busca + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, e-mail ou link…"
          className="flex-1 rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
        />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([["todos", "Todos"], ["active", "Pagantes"], ["trialing", "Em teste"], ["comped", "Cortesia"], ["past_due", "Pendentes"], ["sem_plano", "Sem plano"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${filter === id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-[18px] border border-divider bg-surface-white">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 border-b border-divider bg-surface-soft px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary sm:grid">
          <span>Negócio</span><span>Plano</span><span>Vitrine</span><span>Visitas · Cliques</span><span>Conversas</span>
        </div>
        {filtered.map((b) => (
          <button
            key={b.business_id}
            onClick={() => { setSelected(b); setMsg(null); }}
            className="grid w-full grid-cols-2 items-center gap-3 border-b border-divider px-4 py-3 text-left last:border-0 hover:bg-surface-soft sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]"
          >
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-medium">{b.name || "(sem nome)"}</span>
              <span className="block truncate text-[12px] text-text-tertiary">{b.owner_email}</span>
            </span>
            <span>
              {b.sub_status ? (
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_LABEL[b.sub_status]?.c ?? "bg-surface-soft"}`}>
                  {b.plan_id ? b.plan_id[0].toUpperCase() + b.plan_id.slice(1) : "?"} · {STATUS_LABEL[b.sub_status]?.t ?? b.sub_status}
                </span>
              ) : (
                <span className="inline-block rounded-full bg-surface-soft px-2 py-0.5 text-[11px] text-text-tertiary">Sem plano</span>
              )}
            </span>
            <span className="hidden text-[13px] sm:block">
              {b.content_items > 0 ? <span className="text-green-600">✓ {b.content_items} itens</span> : <span className="text-text-tertiary">vazia</span>}
            </span>
            <span className="hidden text-[13px] text-text-secondary sm:block">{b.total_visits} · {b.total_clicks}</span>
            <span className="hidden text-[13px] text-text-secondary sm:block">{b.total_conversations}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-text-tertiary">Nenhum negócio encontrado.</p>}
      </div>

      {/* Painel de detalhe/edição */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setSelected(null)}>
          <div className="max-h-[88vh] w-full max-w-[440px] overflow-y-auto rounded-t-[24px] bg-background-main p-6 sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[18px] font-semibold">{selected.name}</p>
                <p className="text-[13px] text-text-secondary">{selected.owner_email}</p>
                <a href={`/${selected.slug}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-block text-[12px] text-text-tertiary underline">/{selected.slug} ↗</a>
              </div>
              <button onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
            </div>

            {/* Números */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[["Visitas", selected.total_visits], ["Cliques", selected.total_clicks], ["Conversas", selected.total_conversations], ["Boxes ativos", selected.active_boxes], ["Itens vitrine", selected.content_items], ["Cadastro", new Date(selected.created_at).toLocaleDateString("pt-BR")]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-surface-white p-3 text-center">
                  <p className="text-[16px] font-bold">{v}</p>
                  <p className="text-[10.5px] text-text-tertiary">{l}</p>
                </div>
              ))}
            </div>

            {/* Editar plano */}
            <div className="mt-4 rounded-2xl border border-divider bg-surface-white p-4">
              <p className="text-[13px] font-semibold">Plano e status</p>
              <p className="mt-0.5 text-[12px] text-text-tertiary">Atual: {selected.plan_id ?? "nenhum"} · {selected.sub_status ?? "sem assinatura"}</p>
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={() => salvarPlano(selected.owner_id, "niobio", "comped")} disabled={saving} className="flex-1 rounded-full bg-purple-100 py-2.5 text-[12.5px] font-medium text-purple-700 disabled:opacity-50">Dar Nióbio cortesia</button>
                  <button onClick={() => salvarPlano(selected.owner_id, "titanio", "comped")} disabled={saving} className="flex-1 rounded-full bg-surface-soft py-2.5 text-[12.5px] font-medium disabled:opacity-50">Dar Titânio cortesia</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => salvarPlano(selected.owner_id, selected.plan_id ?? "titanio", "active")} disabled={saving} className="flex-1 rounded-full bg-green-100 py-2.5 text-[12.5px] font-medium text-green-700 disabled:opacity-50">Marcar pagante</button>
                  <button onClick={() => salvarPlano(selected.owner_id, selected.plan_id ?? "titanio", "canceled")} disabled={saving} className="flex-1 rounded-full bg-red-100 py-2.5 text-[12.5px] font-medium text-red-700 disabled:opacity-50">Suspender</button>
                </div>
              </div>
              {msg && <p className={`mt-2 text-[12px] ${msg.startsWith("✓") ? "text-green-700" : "text-red-600"}`}>{msg}</p>}
            </div>

            {/* Enviar mensagem */}
            <a
              href={`mailto:${selected.owner_email}?subject=${encodeURIComponent("Orbibox")}`}
              className="mt-3 flex items-center justify-center gap-2 rounded-full bg-button-primary py-3 text-[13px] font-medium text-white"
            >
              ✉ Enviar mensagem ao dono
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
