"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { formatFone } from "@/lib/utils";

export type Tag = { id: string; name: string; color: string; total?: number; do_orbibox?: number; externos?: number };

const CORES = ["#6D28D9", "#1D4ED8", "#0E7490", "#1F7A3D", "#C2650A", "#B0463C", "#B0309E", "#555960"];

// Etiquetas comuns pra oferecer de largada, quando a pessoa ainda não tem
// nenhuma. Cobrem o ciclo de venda; todas viram etiquetas editáveis.
export const SUGESTOES_TAG: { name: string; color: string }[] = [
  { name: "Clientes ativos", color: "#1F7A3D" },
  { name: "Já compraram", color: "#1D4ED8" },
  { name: "Ainda não compraram", color: "#C2650A" },
  { name: "Demonstraram interesse", color: "#6D28D9" },
  { name: "Pra reativar", color: "#B0463C" },
];

/**
 * Ofertas de etiqueta prontas, pra não encarar a tela vazia. Toca pra criar
 * na hora; depois é só editar como qualquer outra. Só aparece enquanto não
 * há nenhuma etiqueta, pra não poluir quem já organizou as suas.
 */
export function SugestoesTag({ businessId, onCreated }: { businessId: string; onCreated: (t: Tag) => void }) {
  const [criando, setCriando] = useState<string | null>(null);
  const supabase = createClient();

  async function criar(s: { name: string; color: string }) {
    setCriando(s.name);
    const { data: id } = await supabase.rpc("create_lead_tag", { p_business_id: businessId, p_name: s.name, p_color: s.color });
    setCriando(null);
    if (id) onCreated({ id: id as string, name: s.name, color: s.color, total: 0 });
  }

  return (
    <div className="rounded-[20px] bg-surface-soft p-4">
      <p className="text-[12.5px] font-semibold">Sugestões pra começar</p>
      <p className="mt-0.5 text-[12px] text-text-tertiary">Toque pra criar. Depois é só editar do seu jeito.</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {SUGESTOES_TAG.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => criar(s)}
            disabled={criando === s.name}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium disabled:opacity-50"
            style={{ backgroundColor: s.color + "22", color: s.color }}
          >
            <span className="text-[13px] leading-none">+</span>
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Chip de etiqueta, com a cor dela. */
export function TagChip({ tag, ativo, onClick }: { tag: Tag; ativo?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-all"
      style={ativo ? { backgroundColor: tag.color, color: "#fff" } : { backgroundColor: tag.color + "22", color: tag.color }}
    >
      {ativo && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      )}
      {tag.name}
    </button>
  );
}

/** Cria uma etiqueta nova (nome + cor). */
export function NovaTag({ businessId, onCreated }: { businessId: string; onCreated: (t: Tag) => void }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES[0]);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    const supabase = createClient();
    const { data: id } = await supabase.rpc("create_lead_tag", { p_business_id: businessId, p_name: nome.trim(), p_color: cor });
    setSalvando(false);
    if (id) { onCreated({ id: id as string, name: nome.trim(), color: cor, total: 0 }); setNome(""); setAberto(false); }
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="cursor-pointer rounded-full border border-dashed border-divider px-3 py-1.5 text-[12.5px] font-medium text-text-secondary">
        + Nova etiqueta
      </button>
    );
  }

  return (
    <div className="w-full rounded-[20px] border border-divider bg-surface-white p-4">
      <input value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") salvar(); }} placeholder="Nome da etiqueta, ex: Cliente antigo" autoFocus className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />
      <div className="mt-3 flex flex-wrap gap-2">
        {CORES.map((c) => (
          <button key={c} type="button" onClick={() => setCor(c)} className={`h-7 w-7 rounded-full transition-transform ${cor === c ? "scale-110 ring-2 ring-offset-2 ring-on-background" : ""}`} style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setAberto(false)} className="flex-1 cursor-pointer rounded-full border border-divider py-2 text-[13px] font-medium">Cancelar</button>
        <button type="button" onClick={salvar} disabled={salvando || !nome.trim()} className="flex-1 cursor-pointer rounded-full bg-on-background py-2 text-[13px] font-semibold text-white disabled:opacity-50">Criar</button>
      </div>
    </div>
  );
}

/**
 * A "área que mistura": lista as etiquetas e, ao abrir uma, mostra todos
 * os leads dela, sejam do Orbibox ou importados. Cada um traz uma marca
 * discreta de origem, mas ficam juntos, porque na hora de falar com o
 * grupo o que importa é o interesse em comum, não de onde vieram.
 */
export function PorEtiqueta({ businessId }: { businessId: string; orbiColors?: string[] | null }) {
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<{ id: string; name: string; color: string; leads: { lead_id: string; name: string | null; whatsapp: string; origin: string; summary: string | null }[] } | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [escrevendo, setEscrevendo] = useState(false);
  const [editando, setEditando] = useState<Tag | null>(null);
  const supabase = createClient();

  function recarregar() {
    supabase.rpc("list_lead_tags", { p_business_id: businessId }).then(({ data }) => setTags((data ?? []) as Tag[]));
  }
  useEffect(() => { recarregar(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function abrir(t: Tag) {
    setAbertaId(t.id);
    setDetalhe(null);
    setMensagem("");
    const { data } = await supabase.rpc("leads_by_tag", { p_tag_id: t.id });
    setDetalhe(data as typeof detalhe);
  }

  async function escrever(nome: string) {
    setEscrevendo(true);
    try {
      const r = await fetch("/api/leads/segment-message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, motivo: `pessoas marcadas com a etiqueta "${nome}"` }),
      });
      const d = await r.json();
      if (r.ok && d.mensagem) setMensagem(d.mensagem);
    } finally { setEscrevendo(false); }
  }

  function personalizar(base: string, nome: string | null) {
    const n = nome?.trim().split(" ")[0];
    return n ? base.replace(/\{nome\}/g, n) : base.replace(/\{nome\},?\s*/g, "Oi, ").replace(/^Oi, Oi/, "Oi");
  }

  if (tags === null) return <p className="mt-5 text-[13px] text-text-tertiary">Carregando etiquetas…</p>;

  if (abertaId && detalhe) {
    return (
      <div className="mt-5 flex flex-col gap-3">
        <button type="button" onClick={() => { setAbertaId(null); recarregar(); }} className="cursor-pointer self-start text-[13px] text-text-tertiary hover:underline">← Etiquetas</button>

        <div className="rounded-[24px] border border-divider bg-surface-white p-5">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold" style={{ backgroundColor: detalhe.color + "22", color: detalhe.color }}>{detalhe.name}</span>
          <p className="mt-2 text-[13px] text-text-secondary">{detalhe.leads.length} {detalhe.leads.length === 1 ? "pessoa" : "pessoas"}, do Orbibox e da sua lista, juntas.</p>
          {!mensagem ? (
            <button type="button" onClick={() => escrever(detalhe.name)} disabled={escrevendo} className="orbi-gradient mt-3 w-full cursor-pointer rounded-full py-3 text-[14px] font-semibold text-on-background disabled:opacity-60">
              {escrevendo ? "Escrevendo…" : "✦ Orbi, escreve pra esse grupo"}
            </button>
          ) : (
            <div className="mt-3">
              <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} className="w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-on-background" />
              <button type="button" onClick={() => escrever(detalhe.name)} className="mt-2 cursor-pointer text-[12.5px] text-text-secondary underline">Pedir outra versão</button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {detalhe.leads.map((l) => (
            <div key={l.lead_id} className="flex items-center gap-3 rounded-[20px] border border-divider bg-surface-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-semibold">{l.name || formatFone(l.whatsapp)}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${l.origin === "orbibox" ? "bg-[#DEF3E3] text-[#1F7A3D]" : "bg-surface-soft text-text-tertiary"}`}>
                    {l.origin === "orbibox" ? "do Orbibox" : "sua lista"}
                  </span>
                </div>
                {l.summary && <p className="truncate text-[12px] text-text-tertiary">{l.summary}</p>}
              </div>
              {mensagem && (
                <a href={`https://wa.me/${l.whatsapp}?text=${encodeURIComponent(personalizar(mensagem, l.name))}`} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full bg-[#25D366] px-3.5 py-2 text-[12.5px] font-semibold text-white">☎ Mandar</a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="rounded-[20px] bg-surface-soft p-4">
        <p className="text-[13.5px] font-semibold">O que você conta pra Orbi</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
          Etiquetas descrevem seus contatos: cliente antigo, comprou tal coisa, interessado num assunto. A Orbi usa
          isso pra escrever certo, principalmente pra quem veio de fora e ela não conhece. Toque numa etiqueta pra ver
          e falar com o grupo; toque no lápis pra editar.
        </p>
      </div>

      {tags.length === 0 ? (
        <SugestoesTag businessId={businessId} onCreated={() => recarregar()} />
      ) : (
        tags.map((t) => (
          <div key={t.id} className="flex items-center gap-1 rounded-[22px] border border-divider bg-surface-white p-2 pl-4">
            <button
              type="button"
              onClick={() => abrir(t)}
              disabled={(t.total ?? 0) === 0}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 text-left disabled:cursor-default disabled:opacity-50"
            >
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-tight">{t.name}</span>
                <span className="mt-0.5 block text-[12px] text-text-tertiary">
                  {(t.total ?? 0) === 0
                    ? "Ninguém marcado ainda"
                    : <>{t.total} {(t.total ?? 0) === 1 ? "pessoa" : "pessoas"}{(t.do_orbibox ?? 0) > 0 && (t.externos ?? 0) > 0 ? ` · ${t.do_orbibox} do link, ${t.externos} da sua lista` : ""}</>}
                </span>
              </span>
              {(t.total ?? 0) > 0 && <span className="shrink-0 text-text-tertiary">→</span>}
            </button>
            <button
              type="button"
              onClick={() => setEditando(t)}
              aria-label="Editar etiqueta"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary hover:bg-surface-soft"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </button>
          </div>
        ))
      )}

      <NovaTag businessId={businessId} onCreated={() => recarregar()} />

      {editando && (
        <EditarTag
          tag={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); recarregar(); }}
        />
      )}
    </div>
  );
}

/** Folha pra renomear, trocar a cor ou apagar uma etiqueta. */
function EditarTag({ tag, onClose, onSaved }: { tag: Tag; onClose: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(tag.name);
  const [cor, setCor] = useState(tag.color);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const supabase = createClient();

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    await supabase.rpc("update_lead_tag", { p_tag_id: tag.id, p_name: nome.trim(), p_color: cor });
    setSalvando(false);
    onSaved();
  }

  async function apagar() {
    setSalvando(true);
    await supabase.rpc("delete_lead_tag", { p_tag_id: tag.id });
    setSalvando(false);
    onSaved();
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-on-background/50 backdrop-blur-sm" onClick={() => !salvando && onClose()}>
      <div className="mx-auto w-full max-w-[440px] rounded-t-[28px] bg-background-main px-5 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-divider" />
        <p className="font-[family-name:var(--font-manrope)] text-[20px] font-semibold tracking-[-0.01em]">Editar etiqueta</p>

        <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-4 w-full rounded-full border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
        <div className="mt-3 flex flex-wrap gap-2">
          {["#6D28D9", "#1D4ED8", "#0E7490", "#1F7A3D", "#C2650A", "#B0463C", "#B0309E", "#555960"].map((c) => (
            <button key={c} type="button" onClick={() => setCor(c)} className={`h-8 w-8 rounded-full transition-transform ${cor === c ? "scale-110 ring-2 ring-offset-2 ring-on-background" : ""}`} style={{ backgroundColor: c }} />
          ))}
        </div>

        <button type="button" onClick={salvar} disabled={salvando || !nome.trim()} className="mt-5 w-full cursor-pointer rounded-full bg-on-background py-3.5 text-[15px] font-semibold text-white disabled:opacity-40">
          {salvando ? "Salvando…" : "Salvar"}
        </button>

        {!confirmandoApagar ? (
          <button type="button" onClick={() => setConfirmandoApagar(true)} className="mt-2 w-full cursor-pointer py-2 text-center text-[13px] font-medium text-red-600">
            Apagar etiqueta
          </button>
        ) : (
          <div className="mt-3 rounded-2xl bg-[#FDE7E7] p-3.5 text-center">
            <p className="text-[13px] text-[#C0392B]">Apagar &quot;{tag.name}&quot;? Os contatos continuam, só perdem essa etiqueta.</p>
            <div className="mt-2.5 flex gap-2">
              <button type="button" onClick={() => setConfirmandoApagar(false)} className="flex-1 cursor-pointer rounded-full bg-surface-white py-2 text-[13px] font-medium">Cancelar</button>
              <button type="button" onClick={apagar} disabled={salvando} className="flex-1 cursor-pointer rounded-full bg-red-600 py-2 text-[13px] font-semibold text-white disabled:opacity-50">Apagar</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
