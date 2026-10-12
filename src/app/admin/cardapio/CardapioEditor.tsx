"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import { ImportarCardapio } from "./ImportarCardapio";
import { PdfCardapio } from "./PdfCardapio";

export function CardapioEditor({ businessId, boxId: boxInicial, config, ativo: ativoInicial, totalBoxes, itens, slug }: { businessId: string; boxId: string | null; config: Record<string, unknown>; ativo: boolean; totalBoxes: number; itens: number; slug: string }) {
  const supabase = useRef(createClient()).current;
  const [boxId, setBoxId] = useState(boxInicial);
  const [cfg, setCfg] = useState(config);
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
    if (!error && data) { setBoxId(data.id); setCfg(novo); }
  }

  function gravarTexto(label: string, subtitle: string) {
    if (!boxId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const novo = { ...cfg, label: label.trim() || "Cardápio", subtitle: subtitle.trim() };
      const res = await supabase.from("smart_boxes").update({ title: novo.label, config: novo }).eq("id", boxId);
      if (conferirSalvo(res)) setCfg(novo);
    }, 600);
  }

  async function trocarPdf(url: string) {
    if (!boxId) return;
    const novo = { ...cfg, pdf_url: url || null };
    const res = await supabase.from("smart_boxes").update({ config: novo }).eq("id", boxId);
    if (conferirSalvo(res)) setCfg(novo);
  }

  async function alternar() {
    if (!boxId) return;
    const novo = !ativo;
    setAtivo(novo);
    const res = await supabase.from("smart_boxes").update({ is_active: novo }).eq("id", boxId);
    if (!conferirSalvo(res)) setAtivo(!novo);
  }

  return (
    <div className="flex flex-col pb-10">
      <Link href="/admin/boxes" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Botões da home</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.02em]">Cardápio</h1>
      <p className="mt-1 text-[14px] leading-snug text-text-secondary">Um botão na sua página que abre o cardápio: seus itens por categoria, com foto, descrição e preço.</p>

      <ImportarCardapio businessId={businessId} slug={slug} />

      {!boxId ? (
        <div className="mt-5 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
          <p className="text-[15px] font-medium">Ainda não há botão de cardápio</p>
          <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">Os pratos vêm do seu Catálogo. Ative o botão e depois organize os itens por categoria.</p>
          <button type="button" onClick={ativar} disabled={criando} className="mt-4 min-h-[48px] rounded-full bg-on-background px-6 text-[14.5px] font-semibold text-white active:scale-[0.98] disabled:opacity-60">
            {criando ? "Criando…" : "Ativar botão de cardápio"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
            <div className="min-w-0">
              <p className="text-[14.5px] font-medium">Botão na página</p>
              <p className="mt-0.5 text-[12.5px] text-text-tertiary">{ativo ? "Aparece na sua página agora." : "Desligado, o cliente não vê."}</p>
            </div>
            <button type="button" role="switch" aria-checked={ativo} onClick={alternar} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${ativo ? "bg-on-background" : "bg-divider"}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${ativo ? "left-7" : "left-1"}`} />
              <span className="sr-only">{ativo ? "Ligado" : "Desligado"}</span>
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Nome do botão</p>
              <input value={nome} onChange={(e) => { setNome(e.target.value); gravarTexto(e.target.value, sub); }} maxLength={30} className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
            </div>
            <div>
              <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Frase embaixo</p>
              <input value={sub} onChange={(e) => { setSub(e.target.value); gravarTexto(nome, e.target.value); }} maxLength={60} className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
            </div>
          </div>

          <PdfCardapio businessId={businessId} url={(cfg.pdf_url as string) || ""} onChange={trocarPdf} />

          <div className="mt-4 rounded-[22px] bg-surface-soft p-4">
            <p className="text-[14px] font-medium">{itens === 0 ? "Seu cardápio ainda está vazio" : `${itens} ${itens === 1 ? "item publicado" : "itens publicados"} no cardápio`}</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px] leading-snug text-text-secondary">
              <li>As categorias do Catálogo viram as seções do cardápio.</li>
              <li>Itens com o formato Destaque aparecem numa faixa no topo.</li>
              <li>O botão Pedir por delivery aparece quando você liga um app em Delivery.</li>
            </ul>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <Link href="/admin/vitrine" className="inline-flex min-h-[44px] items-center rounded-full bg-on-background px-5 text-[13.5px] font-semibold text-white">Editar itens</Link>
              <Link href="/admin/delivery" className="inline-flex min-h-[44px] items-center rounded-full border border-divider px-5 text-[13.5px] font-medium">Delivery</Link>
              {slug && <Link href={`/${slug}`} target="_blank" className="inline-flex min-h-[44px] items-center rounded-full border border-divider px-5 text-[13.5px] font-medium">Ver minha página ↗</Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
