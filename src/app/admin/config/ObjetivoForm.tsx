"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CONVERSOES, OBJETIVOS, conversaoPorId, ordenarBotoes, type BotaoChave, type ConversaoId, type ObjetivoId } from "@/lib/conversao";
import { avisarErroSalvar, avisarSalvo } from "@/components/ui/AvisoSalvar";

type Box = { id: string; box_type: string; position: number; is_active: boolean; config: { action?: string } | null };

function chaveDoBotao(b: Box): BotaoChave | null {
  if (b.box_type === "product") return "catalogo";
  if (b.box_type === "agent") return "agent";
  if (b.box_type === "content") return "conhecer";
  if (b.box_type === "custom") {
    const a = b.config?.action;
    if (a === "whatsapp") return "whatsapp";
    if (a === "endereco") return "endereco";
    if (a === "cupom") return "cupom";
  }
  return null;
}

/**
 * O objetivo e a ação principal escolhidos na criação, editáveis. Salvar
 * reorganiza os botões da página e ajusta o que a Orbi tenta conseguir
 * nas conversas.
 */
export function ObjetivoForm({ businessId, objetivo, conversao, servico }: { businessId: string; objetivo: string | null; conversao: string | null; servico: boolean }) {
  const supabase = createClient();
  const [obj, setObj] = useState<ObjetivoId | null>((objetivo as ObjetivoId) ?? null);
  const [conv, setConv] = useState<ConversaoId | null>((conversao as ConversaoId) ?? null);
  const [salvando, setSalvando] = useState(false);
  const mudou = obj !== objetivo || conv !== conversao;

  async function salvar() {
    if (!obj || !conv) return;
    setSalvando(true);
    const c = conversaoPorId(conv)!;
    const [r1, r2] = await Promise.all([
      supabase.from("businesses").update({ objetivo: obj, conversao: conv }).eq("id", businessId),
      supabase.from("agent_configs").update({ objectives: [c.objetivoConversa, "tirar dúvidas"] }).eq("business_id", businessId),
    ]);
    if (r1.error || r2.error) {
      setSalvando(false);
      avisarErroSalvar("Não consegui salvar o objetivo. Tente de novo.");
      return;
    }
    // Reordena só os botões que têm papel na conversão; o resto mantém a ordem.
    const { data } = await supabase.from("smart_boxes").select("id, box_type, position, is_active, config").eq("business_id", businessId).order("position");
    const boxes = (data ?? []) as Box[];
    const ativos = boxes.filter((b) => b.is_active && b.box_type !== "hero");
    const disponiveis = ativos.map(chaveDoBotao).filter((k): k is BotaoChave => !!k);
    const ordem = ordenarBotoes({ disponiveis, conversao: conv, objetivo: obj, servico });
    const primeiro = ordem.map((k) => ativos.find((b) => chaveDoBotao(b) === k)!).filter(Boolean);
    const resto = boxes.filter((b) => b.box_type !== "hero" && !primeiro.includes(b));
    await Promise.all([...primeiro, ...resto].map((b, i) => (b.position === i + 1 ? null : supabase.from("smart_boxes").update({ position: i + 1 }).eq("id", b.id))));
    setSalvando(false);
    avisarSalvo();
  }

  return (
    <section className="mt-8 rounded-[24px] border border-divider bg-surface-white p-5">
      <p className="text-[15px] font-semibold">Objetivo da sua página</p>
      <p className="mt-0.5 text-[13px] leading-snug text-text-tertiary">Decide a ordem dos botões e o que a Orbi tenta conseguir nas conversas.</p>

      <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">O que você mais quer</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OBJETIVOS.map((o) => (
          <button key={o.id} type="button" onClick={() => setObj(o.id)} aria-pressed={obj === o.id} className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${obj === o.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>
            {o.rotulo}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">O que o cliente deve fazer</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CONVERSOES.map((c) => (
          <button key={c.id} type="button" onClick={() => setConv(c.id)} aria-pressed={conv === c.id} className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${conv === c.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>
            {c.rotulo}
          </button>
        ))}
      </div>

      {mudou && obj && conv && (
        <button type="button" onClick={salvar} disabled={salvando} className="mt-5 w-full rounded-full bg-on-background py-3 text-[14px] font-medium text-white disabled:opacity-60">
          {salvando ? "Reorganizando…" : "Salvar e reorganizar botões"}
        </button>
      )}
    </section>
  );
}
