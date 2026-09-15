"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFone } from "@/lib/utils";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { NovaTag, TagChip, type Tag } from "./Etiquetas";

type ListaResumo = { id: string; name: string; motivo: string; kind: string; remind_after_days: number | null; total: number; vencidos: number };
type Membro = { lead_id: string; name: string | null; whatsapp: string; contacted_at: string | null; vencido: boolean };
type ListaDetalhe = { id: string; name: string; motivo: string; kind: string; remind_after_days: number | null; membros: Membro[] };

/**
 * Listas que o dono cria, não que o sistema monta sozinho. A diferença
 * pro "Listas da Orbi" (Segmentos.tsx): aqui o motivo é escrito por
 * quem conhece o cliente de verdade ("compraram corte em julho", "pediram
 * orçamento de reforma"), o que faz a Orbi escrever uma mensagem muito
 * mais específica do que um segmento genérico consegue.
 *
 * Também é o jeito de aproveitar uma lista de WhatsApp que já existe fora
 * do Orbibox: cola tudo de uma vez, em vez de cadastrar pessoa por pessoa.
 */
export function MinhasListas({ businessId, orbiColors }: { businessId: string; orbiColors?: string[] | null }) {
  const [listas, setListas] = useState<ListaResumo[] | null>(null);
  const [criando, setCriando] = useState(false);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ListaDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [escrevendo, setEscrevendo] = useState(false);
  const [editandoNome, setEditandoNome] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editMotivo, setEditMotivo] = useState("");

  const supabase = createClient();

  async function salvarNome() {
    if (!detalhe || !editNome.trim()) return;
    await supabase.rpc("update_lead_list", { p_list_id: detalhe.id, p_name: editNome.trim(), p_motivo: editMotivo.trim() });
    setDetalhe((d) => d ? { ...d, name: editNome.trim(), motivo: editMotivo.trim() } : d);
    setEditandoNome(false);
  }

  function recarregarListas() {
    supabase.rpc("list_lead_lists", { p_business_id: businessId }).then(({ data }) => {
      setListas((data ?? []) as ListaResumo[]);
    });
  }

  useEffect(() => { recarregarListas(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function abrir(id: string) {
    setAbertaId(id);
    setDetalhe(null);
    setMensagem("");
    setCarregandoDetalhe(true);
    const { data } = await supabase.rpc("get_lead_list", { p_list_id: id });
    setDetalhe((data ?? null) as ListaDetalhe | null);
    setCarregandoDetalhe(false);
  }

  async function escrever() {
    if (!detalhe) return;
    setEscrevendo(true);
    try {
      const r = await fetch("/api/leads/segment-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, motivo: detalhe.motivo }),
      });
      const d = await r.json();
      if (r.ok && d.mensagem) setMensagem(d.mensagem);
    } finally {
      setEscrevendo(false);
    }
  }

  async function marcarContatado(leadId: string) {
    if (!detalhe) return;
    await supabase.rpc("mark_list_member_contacted", { p_list_id: detalhe.id, p_lead_id: leadId });
    setDetalhe((d) => d ? { ...d, membros: d.membros.map((m) => m.lead_id === leadId ? { ...m, contacted_at: new Date().toISOString(), vencido: false } : m) } : d);
  }

  function personalizar(base: string, nome: string | null) {
    const n = nome?.trim().split(" ")[0];
    return n ? base.replace(/\{nome\}/g, n) : base.replace(/\{nome\},?\s*/g, "Oi, ").replace(/^Oi, Oi/, "Oi");
  }

  if (listas === null) return <p className="mt-5 text-[13px] text-text-tertiary">Carregando suas listas…</p>;

  // Tela da lista aberta
  if (abertaId) {
    return (
      <div className="mt-5 flex flex-col gap-3">
        <button type="button" onClick={() => { setAbertaId(null); recarregarListas(); }} className="cursor-pointer self-start text-[13px] text-text-tertiary hover:underline">← Listas suas</button>

        {carregandoDetalhe || !detalhe ? (
          <p className="text-[13px] text-text-tertiary">Carregando…</p>
        ) : (
          <>
            <div className="rounded-[24px] border border-divider bg-surface-white p-5">
              {editandoNome ? (
                <div className="flex flex-col gap-2">
                  <input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[15px] font-semibold outline-none focus:border-on-background" />
                  <textarea value={editMotivo} onChange={(e) => setEditMotivo(e.target.value)} rows={2} className="w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[13.5px] outline-none focus:border-on-background" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditandoNome(false)} className="flex-1 cursor-pointer rounded-full border border-divider py-2 text-[13px] font-medium">Cancelar</button>
                    <button type="button" onClick={salvarNome} className="flex-1 cursor-pointer rounded-full bg-on-background py-2 text-[13px] font-semibold text-white">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold leading-tight">{detalhe.name}</p>
                    <p className="mt-1 text-[13px] text-text-secondary">{detalhe.motivo}</p>
                  </div>
                  <button type="button" onClick={() => { setEditNome(detalhe.name); setEditMotivo(detalhe.motivo); setEditandoNome(true); }} aria-label="Editar nome" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-tertiary hover:bg-surface-soft">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  </button>
                </div>
              )}
              {detalhe.kind === "recompra" && detalhe.remind_after_days && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#E2EAFE] px-2.5 py-1 text-[11.5px] font-semibold text-[#1D4ED8]">
                  ◷ Lembra de novo {detalhe.remind_after_days} dias depois do contato
                </p>
              )}

              {!mensagem ? (
                <button type="button" onClick={escrever} disabled={escrevendo} className="orbi-gradient mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-on-background disabled:opacity-60">
                  {escrevendo ? (<><span className="h-5 w-5 overflow-hidden rounded-full"><OrbiParticleSphere size={20} colors={orbiColors ?? undefined} className="rounded-full" /></span> Escrevendo…</>) : "✦ Orbi, escreve a mensagem"}
                </button>
              ) : (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Mensagem (edite se quiser)</p>
                  <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={4} className="mt-1.5 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-on-background" />
                  <p className="mt-1 text-[11.5px] text-text-tertiary">{"{nome}"} vira o nome de cada pessoa ao mandar.</p>
                  <button type="button" onClick={escrever} disabled={escrevendo} className="mt-2 cursor-pointer text-[12.5px] text-text-secondary underline">{escrevendo ? "Reescrevendo…" : "Pedir outra versão"}</button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {detalhe.membros.map((m) => {
                const texto = mensagem ? personalizar(mensagem, m.name) : "";
                return (
                  <div key={m.lead_id} className={`flex items-center gap-3 rounded-[20px] border bg-surface-white px-4 py-3 ${m.vencido ? "border-[#1D4ED8]/40" : "border-divider"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{m.name || formatFone(m.whatsapp)}</p>
                      <p className="truncate text-[12px] text-text-tertiary">
                        {m.vencido ? "Hora de lembrar de novo" : m.contacted_at ? `Contatado em ${new Date(m.contacted_at).toLocaleDateString("pt-BR")}` : "Ainda não contatado"}
                      </p>
                    </div>
                    {mensagem && (
                      <a
                        href={`https://wa.me/${m.whatsapp}?text=${encodeURIComponent(texto)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => marcarContatado(m.lead_id)}
                        className="shrink-0 rounded-full bg-[#25D366] px-3.5 py-2 text-[12.5px] font-semibold text-white"
                      >
                        ☎ Mandar
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="rounded-[20px] bg-surface-soft p-4">
        <p className="text-[13.5px] font-semibold">Contatos que vêm de fora do Orbibox</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text-secondary">
          Clientes antigos, gente que você já atende por WhatsApp, uma lista que já existe em outro lugar. Funciona em 3 passos:
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {[
            ["Traga", "Cole sua lista e os contatos entram aqui."],
            ["Conte", "Marque etiquetas dizendo quem são. A Orbi não os conhece, então isso é o que ela usa pra escrever certo."],
            ["Fale", "Ela escreve a mensagem e você manda do seu WhatsApp."],
          ].map(([passo, texto], i) => (
            <div key={passo} className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-on-background text-[11px] font-bold text-white">{i + 1}</span>
              <p className="text-[12.5px] leading-snug text-text-secondary">
                <span className="font-semibold text-on-background">{passo}. </span>{texto}
              </p>
            </div>
          ))}
        </div>
      </div>

      {listas.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-divider bg-surface-white p-5 text-center">
          <p className="text-[14px] text-text-secondary">Nenhuma lista sua ainda.</p>
        </div>
      ) : (
        listas.map((l) => (
          <button key={l.id} type="button" onClick={() => abrir(l.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-[22px] border border-divider bg-surface-white p-4 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px]" style={{ backgroundColor: l.kind === "recompra" ? "#E2EAFE" : "#ECEDE9", color: l.kind === "recompra" ? "#1D4ED8" : "#555960" }}>
              {l.kind === "recompra" ? "◷" : "◎"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-tight">{l.name}</span>
              <span className="mt-0.5 block truncate text-[12.5px] text-text-tertiary">{l.total} {l.total === 1 ? "pessoa" : "pessoas"}{l.vencidos > 0 ? ` · ${l.vencidos} pra lembrar` : ""}</span>
            </span>
            <span className="shrink-0 text-text-tertiary">→</span>
          </button>
        ))
      )}

      {!criando ? (
        <button type="button" onClick={() => setCriando(true)} className="cursor-pointer self-start rounded-full bg-on-background px-4 py-2.5 text-[13.5px] font-semibold text-white">
          + Nova lista
        </button>
      ) : (
        <NovaLista businessId={businessId} onClose={() => setCriando(false)} onCreated={(id) => { setCriando(false); recarregarListas(); abrir(id); }} />
      )}
    </div>
  );
}

function NovaLista({ businessId, onClose, onCreated }: { businessId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [nome, setNome] = useState("");
  const [motivo, setMotivo] = useState("");
  const [recompra, setRecompra] = useState(false);
  const [dias, setDias] = useState("30");
  const [bruto, setBruto] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsMarcadas, setTagsMarcadas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [promptCopiado, setPromptCopiado] = useState(false);

  const PROMPT_GPT = `Vou te passar uma lista de contatos bagunçada (pode estar em qualquer formato, com nomes e telefones misturados). Organize assim:

- Uma pessoa por linha
- Formato: Nome, telefone
- Telefone com DDD, só números e espaços (ex: 11 98888-7777)
- Se não houver nome, deixe só o telefone
- Ignore linhas que não tenham telefone
- Não invente dados, não adicione nada além do que eu mandar
- Responda só a lista pronta, sem comentários

Aqui está a lista:
[cole sua lista aqui]`;

  async function copiarPromptGpt() {
    try {
      await navigator.clipboard.writeText(PROMPT_GPT);
      setPromptCopiado(true);
      setTimeout(() => setPromptCopiado(false), 2000);
    } catch { /* sem clipboard */ }
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("list_lead_tags", { p_business_id: businessId }).then(({ data }) => setTags((data ?? []) as Tag[]));
  }, [businessId]);

  // Aceita "Nome, telefone" ou "Nome - telefone" ou "Nome telefone", uma
  // pessoa por linha. Um número sozinho na linha também funciona.
  function parseContatos(texto: string): { name: string; whatsapp: string }[] {
    return texto
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean)
      .map((linha) => {
        const digitos = linha.match(/[\d()+\-.\s]{8,}/);
        const whatsapp = digitos ? digitos[0].trim() : "";
        const name = linha.replace(whatsapp, "").replace(/[,\-–]+$/, "").trim();
        return { name, whatsapp };
      })
      .filter((c) => c.whatsapp.replace(/\D/g, "").length >= 10);
  }

  const contatos = parseContatos(bruto);

  async function criar() {
    if (!nome.trim() || !motivo.trim() || contatos.length === 0) {
      setErro("Preenche o nome, o motivo e pelo menos um contato.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const supabase = createClient();
      const { data: listId, error } = await supabase.rpc("create_lead_list", {
        p_business_id: businessId,
        p_name: nome.trim(),
        p_motivo: motivo.trim(),
        p_kind: recompra ? "recompra" : "simples",
        p_remind_after_days: recompra ? parseInt(dias, 10) || 30 : null,
      });
      if (error || !listId) throw error;
      await supabase.rpc("bulk_import_to_list", { p_list_id: listId, p_contacts: contatos, p_tag_ids: [...tagsMarcadas] });
      onCreated(listId);
    } catch {
      setErro("Não consegui criar a lista. Tenta de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-divider bg-surface-white p-5">
      <p className="text-[15px] font-semibold">Nova lista</p>

      <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Nome da lista</p>
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Compraram corte em julho" className="mt-1.5 w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />

      <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Por que essas pessoas estão juntas?</p>
      <p className="mt-0.5 text-[11.5px] text-text-tertiary">Isso é o que a Orbi usa pra escrever a mensagem certa. Quanto mais específico, melhor.</p>
      <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} placeholder="Ex: clientes que fizeram corte de cabelo em julho e ainda não voltaram" className="mt-1.5 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background" />

      <button type="button" onClick={() => setRecompra((v) => !v)} className="mt-3 flex cursor-pointer items-center gap-2.5">
        <span className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${recompra ? "bg-on-background" : "bg-surface-soft"}`}>
          <span className={`h-4 w-4 rounded-full bg-white transition-transform ${recompra ? "translate-x-4" : ""}`} />
        </span>
        <span className="text-[13px] text-text-secondary">É lembrete recorrente (avisar de novo depois de um tempo)</span>
      </button>
      {recompra && (
        <div className="mt-2 flex items-center gap-2 pl-11">
          <span className="text-[13px] text-text-secondary">Lembrar de novo depois de</span>
          <input value={dias} onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="w-14 rounded-full border border-divider bg-surface-white px-2 py-1 text-center text-[13px] outline-none focus:border-on-background" />
          <span className="text-[13px] text-text-secondary">dias</span>
        </div>
      )}

      <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">O que você sabe sobre eles?</p>
      <p className="mt-0.5 text-[11.5px] text-text-tertiary">Marque etiquetas pra contar à Orbi. Todas as pessoas dessa lista recebem essas etiquetas.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {tags.map((tg) => (
          <TagChip key={tg.id} tag={tg} ativo={tagsMarcadas.has(tg.id)} onClick={() => setTagsMarcadas((s) => { const n = new Set(s); if (n.has(tg.id)) n.delete(tg.id); else n.add(tg.id); return n; })} />
        ))}
        <NovaTag businessId={businessId} onCreated={(nova) => { setTags((prev) => [...prev, nova]); setTagsMarcadas((s) => new Set(s).add(nova.id)); }} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Cole os contatos</p>
        {/* Pra quem tem a lista bagunçada (print, caderno, grupo): copia um
            prompt pronto pra organizar no ChatGPT e colar já formatado. */}
        <button
          type="button"
          onClick={copiarPromptGpt}
          className="shrink-0 cursor-pointer rounded-full bg-surface-soft px-3 py-1.5 text-[11.5px] font-semibold text-text-secondary"
        >
          {promptCopiado ? "Prompt copiado ✓" : "✦ Organizar no ChatGPT"}
        </button>
      </div>
      <p className="mt-0.5 text-[11.5px] text-text-tertiary">Um por linha: nome e telefone. Ex: Marina, 11 98888-7777</p>
      <textarea value={bruto} onChange={(e) => setBruto(e.target.value)} rows={5} placeholder={"Marina, 11 98888-7777\nJoão Pedro - (11) 97777-6666"} className="mt-1.5 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-on-background" />
      {bruto.trim() && <p className="mt-1 text-[11.5px] text-text-tertiary">{contatos.length} {contatos.length === 1 ? "contato reconhecido" : "contatos reconhecidos"}</p>}

      {erro && <p className="mt-2 text-[12.5px] text-red-600">{erro}</p>}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 cursor-pointer rounded-full border border-divider bg-surface-white py-2.5 text-[13.5px] font-medium">Cancelar</button>
        <button type="button" onClick={criar} disabled={salvando} className="flex-1 cursor-pointer rounded-full bg-on-background py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50">
          {salvando ? "Criando…" : "Criar lista"}
        </button>
      </div>
    </div>
  );
}
