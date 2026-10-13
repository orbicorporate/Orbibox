"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import { ImportarCardapio } from "./ImportarCardapio";
import { PdfCardapio } from "./PdfCardapio";
import { PratosEditor } from "./PratosEditor";
import type { Json } from "@/lib/supabase/types";
import { lerSecoes, novoId, totalItens, type CardapioSecao } from "@/lib/cardapio";

export function CardapioEditor({ businessId, boxId: boxInicial, config, ativo: ativoInicial, totalBoxes, slug }: { businessId: string; boxId: string | null; config: Record<string, unknown>; ativo: boolean; totalBoxes: number; slug: string }) {
  const supabase = useRef(createClient()).current;
  const [boxId, setBoxId] = useState(boxInicial);
  const [cfg, setCfg] = useState(config);
  const cfgRef = useRef(config);
  const [secoes, setSecoes] = useState<CardapioSecao[]>(() => lerSecoes(config));
  const timerPratos = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nome, setNome] = useState((config.label as string) || "Cardápio");
  const [sub, setSub] = useState((config.subtitle as string) || "Veja os pratos e preços");
  const [ativo, setAtivo] = useState(ativoInicial);
  const [criando, setCriando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function ativar() {
    setCriando(true);
    const novo = { label: "Cardápio", subtitle: "Veja os pratos e preços", icon: "🍴", action: "cardapio", color: "transparent" };
    const { data, error } = await supabase
      .from("smart_boxes")
      .insert({ business_id: businessId, box_type: "custom", title: "Cardápio", position: totalBoxes, is_active: true, config: novo })
      .select("id")
      .single();
    setCriando(false);
    if (!error && data) { setBoxId(data.id); setCfg(novo); cfgRef.current = novo; }
  }

  function gravarTexto(label: string, subtitle: string) {
    if (!boxId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const novo = { ...cfgRef.current, label: label.trim() || "Cardápio", subtitle: subtitle.trim() };
      const res = await supabase.from("smart_boxes").update({ title: novo.label, config: novo }).eq("id", boxId);
      if (conferirSalvo(res)) { setCfg(novo); cfgRef.current = novo; }
    }, 600);
  }

  function mudarSecoes(prox: CardapioSecao[]) {
    setSecoes(prox);
    cfgRef.current = { ...cfgRef.current, secoes: prox };
    if (!boxId) return;
    if (timerPratos.current) clearTimeout(timerPratos.current);
    timerPratos.current = setTimeout(async () => {
      const novo = cfgRef.current as Record<string, Json>;
      const res = await supabase.from("smart_boxes").update({ config: novo }).eq("id", boxId);
      if (conferirSalvo(res)) { setCfg(novo); cfgRef.current = novo; }
    }, 700);
  }

  async function trocarPdf(url: string) {
    if (!boxId) return;
    const novo = { ...cfgRef.current, pdf_url: url || null };
    const res = await supabase.from("smart_boxes").update({ config: novo }).eq("id", boxId);
    if (conferirSalvo(res)) { setCfg(novo); cfgRef.current = novo; }
  }

  async function alternar() {
    if (!boxId) return;
    const novo = !ativo;
    setAtivo(novo);
    const res = await supabase.from("smart_boxes").update({ is_active: novo }).eq("id", boxId);
    if (!conferirSalvo(res)) setAtivo(!novo);
  }

  return (
    <div className="flex flex-col pb-40">
      <Link href="/admin/boxes" className="mt-12 text-[14px] text-text-tertiary hover:underline">← Botões da home</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.02em]">Cardápio</h1>
      <p className="mt-1 text-[14px] leading-snug text-text-secondary">Os pratos do seu restaurante, por categoria. É uma lista própria, separada do Catálogo (que mostra destaques e páginas).</p>


      {!boxId ? (
        <div className="mt-5 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
          <p className="text-[15px] font-medium">Ainda não há botão de cardápio</p>
          <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">Ative o botão para o cliente abrir o cardápio na sua página. Depois você cadastra os pratos.</p>
          <button type="button" onClick={ativar} disabled={criando} className="mt-4 min-h-[48px] rounded-full bg-on-background px-6 text-[14.5px] font-semibold text-white active:scale-[0.98] disabled:opacity-60">
            {criando ? "Criando…" : "Ativar botão de cardápio"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14.5px] font-medium">Botão na página</p>
                <p className="mt-0.5 text-[12.5px] text-text-tertiary">{ativo ? "Aparece na sua página agora." : "Desligado, o cliente não vê."}</p>
              </div>
              <button type="button" role="switch" aria-checked={ativo} onClick={alternar} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${ativo ? "bg-on-background" : "bg-divider"}`}>
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${ativo ? "left-7" : "left-1"}`} />
                <span className="sr-only">{ativo ? "Ligado" : "Desligado"}</span>
              </button>
            </div>
          </div>

          <PratosEditor businessId={businessId} secoes={secoes} onChange={mudarSecoes}>
            <ImportarCardapio businessId={businessId} compacto={secoes.length > 0} onAdicionar={(novas) => mudarSecoes([...secoes, ...novas])} onManual={() => mudarSecoes([...secoes, { id: novoId(), nome: "", itens: [] }])} />
          </PratosEditor>

          <details className="group mt-2" open={!!cfg.pdf_url}>
            <summary className="mt-3 flex min-h-[44px] cursor-pointer list-none items-center justify-between rounded-[22px] bg-surface-white px-4 text-[14px] font-medium ring-1 ring-black/[0.06]">
              Cardápio em PDF (opcional)
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-180" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
            </summary>
            <PdfCardapio businessId={businessId} url={(cfg.pdf_url as string) || ""} onChange={trocarPdf} />
          </details>

          <section className="mt-8" aria-label="Texto do botão">
            <h2 className="font-[family-name:var(--font-manrope)] text-[19px] font-medium">Como o botão aparece na sua página</h2>
            <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">É o botão que o cliente toca para abrir o cardápio.</p>
            <div className="mt-3 flex items-center gap-3 rounded-[22px] bg-on-background p-4 text-white" aria-hidden>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-[18px]">🍴</span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{nome || "Cardápio"}</span>
                <span className="block truncate text-[12.5px] text-white/70">{sub}</span>
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-3 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
              <div>
                <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Título do botão</p>
                <input value={nome} onChange={(e) => { setNome(e.target.value); gravarTexto(e.target.value, sub); }} maxLength={30} className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              </div>
              <div>
                <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Frase pequena embaixo do título</p>
                <input value={sub} onChange={(e) => { setSub(e.target.value); gravarTexto(nome, e.target.value); }} maxLength={60} className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
              </div>
            </div>
          </section>

          <div className="mt-6 rounded-[22px] bg-surface-soft p-4">
            <p className="text-[14px] font-medium">{totalItens(secoes) === 0 ? "Seu cardápio ainda está vazio" : `${totalItens(secoes)} ${totalItens(secoes) === 1 ? "prato" : "pratos"} no cardápio`}</p>
            <p className="mt-1 text-[13px] leading-snug text-text-secondary">O botão Pedir por delivery aparece no cardápio quando você liga um app em Delivery.</p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Link href="/admin/delivery" className="inline-flex min-h-[44px] items-center rounded-full border border-divider px-5 text-[13.5px] font-medium">Delivery</Link>
              {slug && <Link href={`/${slug}`} target="_blank" className="inline-flex min-h-[44px] items-center rounded-full border border-divider px-5 text-[13.5px] font-medium">Ver minha página ↗</Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
