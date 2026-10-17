"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import { ImportarCardapio } from "./ImportarCardapio";
import { RefazerFotos } from "./RefazerFotos";
import { PdfCardapio } from "./PdfCardapio";
import { PratosEditor } from "./PratosEditor";
import { GuiaPrato } from "./GuiaPrato";
import { DeliveryEditor } from "../delivery/DeliveryEditor";
import type { DeliveryApp } from "@/lib/delivery";
import type { Json } from "@/lib/supabase/types";
import { CORES_BOTAO, lerLayoutItens, type LayoutItens, lerCorBotoes, lerPdfs, lerSecoes, textoSobre, novoId, totalItens, type CardapioItem, type CardapioPdf, type CardapioSecao } from "@/lib/cardapio";

const ICONES_CARDAPIO = ["🍴", "🍽️", "🍔", "🍕", "🥗", "🍣", "🥩", "🍰", "🥤", "☕"];

export function CardapioEditor({ businessId, boxId: boxInicial, config, ativo: ativoInicial, totalBoxes, delivery }: { businessId: string; boxId: string | null; config: Record<string, unknown>; ativo: boolean; totalBoxes: number; slug?: string; delivery: { boxId: string | null; config: Record<string, unknown>; apps: DeliveryApp[]; ativo: boolean } }) {
  const supabase = useRef(createClient()).current;
  const [boxId, setBoxId] = useState(boxInicial);
  const [cfg, setCfg] = useState(config);
  const cfgRef = useRef(config);
  const [secoes, setSecoes] = useState<CardapioSecao[]>(() => lerSecoes(config));
  const timerPratos = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nome, setNome] = useState((config.label as string) || "Cardápio");
  const [sub, setSub] = useState((config.subtitle as string) || "Veja os pratos e preços");
  const [ativo, setAtivo] = useState(ativoInicial);
  const [guia, setGuia] = useState(false);
  const [lerPdf, setLerPdf] = useState<{ url: string; nome: string; chave: number } | null>(null);
  const [aba, setAba] = useState<"pdf" | "pratos">(() => (totalItens(lerSecoes(config)) > 0 ? "pratos" : "pdf"));
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

  function adicionarPrato(categoria: string, item: CardapioItem) {
    const alvo = secoes.find((x) => x.nome.trim().toLowerCase() === categoria.trim().toLowerCase());
    if (alvo) mudarSecoes(secoes.map((x) => (x.id === alvo.id ? { ...x, itens: [...x.itens, item] } : x)));
    else mudarSecoes([...secoes, { id: novoId(), nome: categoria.trim(), itens: [item] }]);
  }

  async function trocarPdfs(pdfs: CardapioPdf[]) {
    if (!boxId) return;
    // pdf_url guarda o primeiro, pra tudo que ainda lê o PDF único continuar funcionando.
    const novo = { ...cfgRef.current, pdfs, pdf_url: pdfs[0]?.url ?? null } as Record<string, Json>;
    const res = await supabase.from("smart_boxes").update({ config: novo }).eq("id", boxId);
    if (conferirSalvo(res)) { setCfg(novo); cfgRef.current = novo; }
  }

  function montarDoPdf(p: CardapioPdf) {
    setGuia(false);
    setAba("pratos");
    setLerPdf({ url: p.url, nome: p.nome.trim() || "Cardápio", chave: Date.now() });
  }

  async function trocarCor(cor: string | null) {
    if (!boxId) return;
    // A mesma cor vale para o botão da home e para os botões de dentro do cardápio.
    const novo = { ...cfgRef.current, corBotoes: cor, color: cor ?? "#111318" } as Record<string, Json>;
    const res = await supabase.from("smart_boxes").update({ config: novo }).eq("id", boxId);
    if (conferirSalvo(res)) { setCfg(novo); cfgRef.current = novo; }
  }

  async function trocarLayout(layoutItens: LayoutItens) {
    if (!boxId) return;
    const novo = { ...cfgRef.current, layoutItens } as Record<string, Json>;
    const res = await supabase.from("smart_boxes").update({ config: novo }).eq("id", boxId);
    if (conferirSalvo(res)) { setCfg(novo); cfgRef.current = novo; }
  }

  async function trocarIcone(icon: string) {
    if (!boxId) return;
    const novo = { ...cfgRef.current, icon } as Record<string, Json>;
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

  const pdfs = lerPdfs(cfg);
  const corBotoes = lerCorBotoes(cfg);
  const corAtual = corBotoes ?? lerCorBotoes({ corBotoes: (cfg as { color?: string } | null)?.color }) ?? CORES_BOTAO[0];
  const iconeAtual = (cfg as { icon?: string } | null)?.icon || "🍴";
  const nPratos = totalItens(secoes);
  const nPdfs = pdfs.length;
  const clienteVe =
    nPratos > 0 && nPdfs > 0
      ? "O cliente vê os pratos e os botões para abrir os PDFs."
      : nPratos > 0
        ? "O cliente vê os pratos por categoria."
        : nPdfs > 0
          ? nPdfs === 1 ? "O cliente vê só o botão para abrir o PDF." : "O cliente vê um botão para cada PDF."
          : "Ainda não há nada para o cliente ver. Comece enviando um PDF ou montando os pratos.";

  return (
    <div className="flex flex-col pb-40">
      <Link href="/admin/boxes" className="mt-12 text-[14px] text-text-tertiary hover:underline">← Botões da home</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.02em]">Cardápio e delivery</h1>
      <p className="mt-1 text-[14px] leading-snug text-text-secondary">Mostre seu cardápio e ligue os apps onde o cliente pede. Tudo nesta tela.</p>

      {!boxId ? (
        <div className="mt-5 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
          <p className="text-[15px] font-medium">Ainda não há botão de cardápio</p>
          <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">Ative o botão para o cliente abrir o cardápio na sua página. Depois você envia o PDF ou cadastra os pratos.</p>
          <button type="button" onClick={ativar} disabled={criando} className="mt-4 min-h-[48px] rounded-full bg-on-background px-6 text-[14.5px] font-semibold text-white active:scale-[0.98] disabled:opacity-60">
            {criando ? "Criando…" : "Ativar botão de cardápio"}
          </button>
        </div>
      ) : (
        <>
          <section className="mt-6" aria-label="Seu cardápio">
            <h2 className="font-[family-name:var(--font-manrope)] text-[19px] font-medium">Seu cardápio</h2>
            <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">Envie um PDF, monte a lista de pratos, ou use os dois.</p>

            <div role="tablist" aria-label="Como mostrar o cardápio" className="mt-3 flex rounded-full bg-surface-soft p-1">
              {([["pdf", "PDF", nPdfs], ["pratos", "Itens", nPratos]] as const).map(([id, rotulo, n]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={aba === id}
                  onClick={() => setAba(id)}
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold transition-all ${aba === id ? "bg-surface-white shadow-sm" : "text-text-secondary"}`}
                >
                  {rotulo}
                  <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${n > 0 ? "bg-on-background text-white" : "bg-black/[0.06] text-text-tertiary"}`}>{n > 0 ? n : "vazio"}</span>
                </button>
              ))}
            </div>

            <div role="tabpanel">
              {aba === "pdf" ? (
                <PdfCardapio businessId={businessId} pdfs={pdfs} onChange={trocarPdfs} onMontar={montarDoPdf} />
              ) : (
                <PratosEditor businessId={businessId} secoes={secoes} onChange={mudarSecoes}>
                  {!guia && <RefazerFotos businessId={businessId} secoes={secoes} pdfs={pdfs} onChange={mudarSecoes} />}
                  {guia ? (
                    <GuiaPrato businessId={businessId} categorias={secoes.map((x) => x.nome)} onSalvar={adicionarPrato} onFechar={() => setGuia(false)} />
                  ) : (
                    <ImportarCardapio businessId={businessId} doPdf={lerPdf} onConsumido={() => setLerPdf(null)} compacto={nPratos > 0} onAdicionar={(novas) => mudarSecoes([...secoes, ...novas])} onManual={() => setGuia(true)} />
                  )}
                </PratosEditor>
              )}
            </div>

            <p className="mt-3 rounded-2xl bg-surface-soft px-4 py-3 text-[13px] leading-snug text-text-secondary">{clienteVe}</p>
          </section>

          <section className="mt-8" aria-label="Delivery">
            <h2 className="font-[family-name:var(--font-manrope)] text-[19px] font-medium">Pedir por delivery</h2>
            <p className="mb-3 mt-0.5 text-[13px] leading-snug text-text-secondary">Opcional. Aparece no cardápio como botão para pedir.</p>
            <DeliveryEditor embutido businessId={businessId} boxId={delivery.boxId} config={delivery.config} apps={delivery.apps} ativo={delivery.ativo} totalBoxes={totalBoxes} />
          </section>

          <section className="mt-8" aria-label="Botão na página">
            <details className="group rounded-[22px] bg-surface-white ring-1 ring-black/[0.06]">
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span style={{ backgroundColor: corAtual, color: textoSobre(corAtual) }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[17px]" aria-hidden>{iconeAtual}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug">Botão na sua página</span>
                  <span className="block truncate text-[12.5px] leading-snug text-text-tertiary">{ativo ? "Aparece" : "Escondido"} · {nome || "Cardápio"} · {sub}</span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-tertiary transition-transform group-open:rotate-180" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
              </summary>
              <div className="flex flex-col gap-3 px-4 pb-4">
                <div style={{ backgroundColor: corAtual, color: textoSobre(corAtual) }} className="flex items-center gap-3 rounded-[22px] p-4" aria-hidden>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-[18px]">{iconeAtual}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{nome || "Cardápio"}</span>
                    <span className="block truncate text-[12.5px] opacity-70">{sub}</span>
                  </span>
                </div>
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Título do botão</p>
                  <input value={nome} onChange={(e) => { setNome(e.target.value); gravarTexto(e.target.value, sub); }} maxLength={30} className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
                </div>
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Frase pequena embaixo do título</p>
                  <input value={sub} onChange={(e) => { setSub(e.target.value); gravarTexto(nome, e.target.value); }} maxLength={60} className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background" />
                </div>
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Cor do botão</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">Também colore os botões de abrir PDF e de pedir por delivery dentro do cardápio.</p>
                  <div role="radiogroup" aria-label="Escolha a cor" className="mt-2 flex flex-wrap gap-2.5">
                    {CORES_BOTAO.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={corAtual.toLowerCase() === c.toLowerCase()}
                        aria-label={`Cor ${c}`}
                        onClick={() => trocarCor(c === CORES_BOTAO[0] ? null : c)}
                        style={{ backgroundColor: c }}
                        className={`h-11 w-11 rounded-full ring-offset-2 transition-transform active:scale-95 ${corAtual.toLowerCase() === c.toLowerCase() ? "ring-2 ring-on-background" : "ring-1 ring-black/10"}`}
                      />
                    ))}
                    <label className="relative flex h-11 min-w-[44px] cursor-pointer items-center justify-center rounded-full border border-divider px-3.5 text-[13px] font-medium text-text-secondary">
                      Outra
                      <input type="color" value={corAtual} onChange={(e) => trocarCor(e.target.value)} aria-label="Escolher outra cor" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </label>
                  </div>
                </div>
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Como mostrar os pratos</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">O cliente também pode alternar na página do cardápio.</p>
                  <div role="radiogroup" aria-label="Como mostrar os pratos" className="relative mt-2 flex rounded-full bg-black/[0.05] p-1">
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ width: "calc((100% - 8px) / 2)", transform: `translateX(${lerLayoutItens(cfg) === "cards" ? 100 : 0}%)` }} />
                    {([["lista", "Lista"], ["cards", "Cards grandes"]] as const).map(([v, r]) => (
                      <button key={v} type="button" role="radio" aria-checked={lerLayoutItens(cfg) === v} onClick={() => trocarLayout(v)} className={`relative z-10 min-h-[40px] flex-1 rounded-full px-2 text-[13.5px] ${lerLayoutItens(cfg) === v ? "font-semibold text-on-background" : "font-medium text-text-secondary"}`}>{r}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Ícone</p>
                  <div role="radiogroup" aria-label="Escolha o ícone" className="mt-2 flex flex-wrap gap-2">
                    {ICONES_CARDAPIO.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        role="radio"
                        aria-checked={iconeAtual === ic}
                        aria-label={`Ícone ${ic}`}
                        onClick={() => trocarIcone(ic)}
                        className={`flex h-11 w-11 items-center justify-center rounded-full border text-[20px] active:scale-95 ${iconeAtual === ic ? "border-on-background bg-surface-soft" : "border-divider"}`}
                      >{ic}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft p-3.5">
                  <p className="text-[14.5px] font-medium">{ativo ? "Aparece na sua página" : "Escondido do cliente"}</p>
                  <button type="button" role="switch" aria-checked={ativo} onClick={alternar} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${ativo ? "bg-on-background" : "bg-divider"}`}>
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${ativo ? "left-7" : "left-1"}`} />
                    <span className="sr-only">{ativo ? "Ligado" : "Desligado"}</span>
                  </button>
                </div>
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
