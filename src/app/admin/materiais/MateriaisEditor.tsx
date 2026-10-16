"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { OrbiMiniVerde } from "@/components/orbi/OrbiConcluido";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import type { Json } from "@/lib/supabase/types";
import { CORES_BOTAO, lerCorBotoes, pesoLegivel, textoSobre } from "@/lib/cardapio";
import { MAX_MATERIAIS, lerMateriais, nomeUnico, novoIdMaterial, tipoDoArquivo, type Material } from "@/lib/materiais";

const LIMITE_MB = 10;
const ICONES = ["📚", "📄", "🎓", "📘", "📊", "🧾", "🎁", "⬇️"];
const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background";

/**
 * Materiais: o dono envia guias, cursos, planilhas e documentos para o cliente
 * baixar. Cada material pode ser livre ou pedir nome e WhatsApp antes (o
 * contato vira lead). O botão na home pode ter imagem e virar um box grande.
 */
export function MateriaisEditor({ businessId, boxId: boxInicial, config, ativo: ativoInicial, totalBoxes }: { businessId: string; boxId: string | null; config: Record<string, unknown>; ativo: boolean; totalBoxes: number }) {
  const supabase = useRef(createClient()).current;
  const [boxId, setBoxId] = useState(boxInicial);
  const [cfg, setCfg] = useState(config);
  const cfgRef = useRef(config);
  const [itens, setItens] = useState<Material[]>(() => lerMateriais(config));
  const [aberto, setAberto] = useState<string | null>(null);
  const [nome, setNome] = useState((config.label as string) || "Materiais");
  const [sub, setSub] = useState((config.subtitle as string) || "Baixe nossos conteúdos");
  const [ativo, setAtivo] = useState(ativoInicial);
  const [criando, setCriando] = useState(false);
  const [subindo, setSubindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [linkDe, setLinkDe] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const inputCapa = useRef<HTMLInputElement>(null);
  const inputBotao = useRef<HTMLInputElement>(null);
  const alvo = useRef<string | null>(null);

  async function gravarConfig(patch: Record<string, Json | undefined>, titulo?: string) {
    if (!boxId) return;
    const novo = { ...cfgRef.current, ...patch } as Record<string, Json>;
    cfgRef.current = novo;
    const res = await supabase.from("smart_boxes").update({ ...(titulo ? { title: titulo } : {}), config: novo }).eq("id", boxId);
    if (conferirSalvo(res)) setCfg(novo);
  }

  async function ativar() {
    setCriando(true);
    const novo = { label: "Materiais", subtitle: "Baixe nossos conteúdos", icon: "📚", action: "materiais", color: "transparent", materiais: [] };
    const { data, error } = await supabase
      .from("smart_boxes")
      .insert({ business_id: businessId, box_type: "custom", title: "Materiais", position: totalBoxes, is_active: true, config: novo })
      .select("id")
      .single();
    setCriando(false);
    if (!error && data) { setBoxId(data.id); setCfg(novo); cfgRef.current = novo; }
  }

  // Lista de materiais: grava logo (agora) ou com pequena espera enquanto a pessoa digita.
  function mudarItens(prox: Material[], agora = false) {
    setItens(prox);
    cfgRef.current = { ...cfgRef.current, materiais: prox as unknown as Json };
    if (timer.current) clearTimeout(timer.current);
    const salvar = async () => {
      if (!boxId) return;
      const res = await supabase.from("smart_boxes").update({ config: cfgRef.current as Record<string, Json> }).eq("id", boxId);
      if (conferirSalvo(res)) setCfg(cfgRef.current);
    };
    if (agora) void salvar();
    else timer.current = setTimeout(salvar, 700);
  }
  function mudar(id: string, patch: Partial<Material>, agora = false) {
    mudarItens(itens.map((m) => (m.id === id ? { ...m, ...patch } : m)), agora);
  }

  function novo() {
    if (itens.length >= MAX_MATERIAIS) return;
    const id = novoIdMaterial();
    // url vazia só existe aqui, no editor; o visitante só vê materiais com arquivo.
    setItens((p) => [...p, { id, titulo: "", descricao: "", url: "", capa: null, acesso: "livre" }]);
    setAberto(id);
  }
  function remover(m: Material) {
    if (!window.confirm(`Apagar "${m.titulo || "este material"}"?`)) return;
    mudarItens(itens.filter((x) => x.id !== m.id), true);
    void apagarArquivo(m.url);
  }
  function mover(idx: number, d: -1 | 1) {
    const j = idx + d;
    if (j < 0 || j >= itens.length) return;
    const c = [...itens];
    [c[idx], c[j]] = [c[j], c[idx]];
    mudarItens(c, true);
  }

  async function apagarArquivo(url: string) {
    const marca = "/object/public/cardapios-pdf/";
    const i = url.indexOf(marca);
    if (i < 0) return;
    await supabase.storage.from("cardapios-pdf").remove([decodeURIComponent(url.slice(i + marca.length))]);
  }

  async function enviarArquivo(f: File | undefined) {
    const id = alvo.current;
    if (inputArquivo.current) inputArquivo.current.value = "";
    if (!f || !id) return;
    setErro(null);
    if (f.type !== "application/pdf") return setErro("Aqui só entra PDF. Para planilha, documento ou arquivo zip, cole o link do arquivo.");
    if (f.size > LIMITE_MB * 1024 * 1024) return setErro(`Esse PDF tem ${pesoLegivel(f.size)} e o limite é ${LIMITE_MB} MB. Cole o link do arquivo ou envie uma versão menor.`);
    setSubindo(id);
    const path = `${businessId}/${nomeUnico("material", "pdf")}`;
    const { error } = await supabase.storage.from("cardapios-pdf").upload(path, f, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
    setSubindo(null);
    if (error) return setErro("Não consegui enviar o arquivo. Tente de novo.");
    const url = supabase.storage.from("cardapios-pdf").getPublicUrl(path).data.publicUrl;
    const antigo = itens.find((m) => m.id === id)?.url;
    mudar(id, { url, bytes: f.size }, true);
    if (antigo) void apagarArquivo(antigo);
  }

  function salvarLink(id: string) {
    const v = link.trim();
    if (!/^https?:\/\//i.test(v)) return setErro("Cole um link que comece com https://");
    setErro(null);
    mudar(id, { url: v, bytes: undefined }, true);
    setLinkDe(null);
    setLink("");
  }

  async function subirImagem(f: File, prefixo: string): Promise<string | null> {
    if (!f.type.startsWith("image/")) { setErro("Envie uma imagem (JPG ou PNG)."); return null; }
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `${businessId}/${nomeUnico(prefixo, ext)}`;
    const { error } = await supabase.storage.from("box-images").upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
    if (error) { setErro("Não consegui enviar a imagem. Tente de novo."); return null; }
    return supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl;
  }
  async function enviarCapa(f: File | undefined) {
    const id = alvo.current;
    if (inputCapa.current) inputCapa.current.value = "";
    if (!f || !id) return;
    setErro(null);
    setSubindo(id);
    const url = await subirImagem(f, "material-capa");
    setSubindo(null);
    if (url) mudar(id, { capa: url }, true);
  }
  async function enviarImagemBotao(f: File | undefined) {
    if (inputBotao.current) inputBotao.current.value = "";
    if (!f) return;
    setErro(null);
    setSubindo("botao");
    const url = await subirImagem(f, "materiais-botao");
    setSubindo(null);
    if (url) await gravarConfig({ logo_url: url });
  }

  function gravarTexto(label: string, subtitle: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void gravarConfig({ label: label.trim() || "Materiais", subtitle: subtitle.trim() }, label.trim() || "Materiais"), 600);
  }

  async function trocarCor(cor: string | null) {
    await gravarConfig({ corBotoes: cor, color: cor ?? "#111318" });
  }

  async function alternar() {
    if (!boxId) return;
    const prox = !ativo;
    setAtivo(prox);
    const res = await supabase.from("smart_boxes").update({ is_active: prox }).eq("id", boxId);
    if (!conferirSalvo(res)) setAtivo(!prox);
  }

  const corBotoes = lerCorBotoes(cfg);
  const corAtual = corBotoes ?? lerCorBotoes({ corBotoes: (cfg as { color?: string }).color }) ?? CORES_BOTAO[0];
  const iconeAtual = (cfg as { icon?: string }).icon || "📚";
  const imagemBotao = (cfg as { logo_url?: string }).logo_url || null;
  const formato = (cfg as { layout?: string }).layout === "largo" ? "largo" : "auto";
  const prontos = itens.filter((m) => m.url).length;

  return (
    <div className="flex flex-col pb-40">
      <Link href="/admin/boxes" className="mt-12 text-[14px] text-text-tertiary hover:underline">← Botões da home</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.02em]">Materiais</h1>
      <p className="mt-1 text-[14px] leading-snug text-text-secondary">Guias, cursos, planilhas e documentos para o cliente baixar. Você escolhe o que é livre e o que pede contato antes.</p>

      <input ref={inputArquivo} type="file" accept="application/pdf" className="hidden" onChange={(e) => enviarArquivo(e.target.files?.[0])} />
      <input ref={inputCapa} type="file" accept="image/*" className="hidden" onChange={(e) => enviarCapa(e.target.files?.[0])} />
      <input ref={inputBotao} type="file" accept="image/*" className="hidden" onChange={(e) => enviarImagemBotao(e.target.files?.[0])} />

      {!boxId ? (
        <div className="mt-5 rounded-[24px] bg-surface-white p-5 ring-1 ring-black/[0.06]">
          <p className="text-[15px] font-medium">Ainda não há botão de materiais</p>
          <p className="mt-1 text-[13.5px] leading-snug text-text-secondary">Ative o botão para o cliente abrir uma página com os seus materiais. É separado do cardápio, então não muda nada do que você já tem.</p>
          <button type="button" onClick={ativar} disabled={criando} className="mt-4 min-h-[48px] rounded-full bg-on-background px-6 text-[14.5px] font-semibold text-white active:scale-[0.98] disabled:opacity-60">
            {criando ? "Criando…" : "Ativar botão de materiais"}
          </button>
        </div>
      ) : (
        <>
          <section className="mt-6" aria-label="Seus materiais">
            <h2 className="font-[family-name:var(--font-manrope)] text-[19px] font-medium">Seus materiais</h2>
            <p className="mt-0.5 text-[13px] leading-snug text-text-secondary">{prontos === 0 ? "Adicione o primeiro material." : `${prontos} ${prontos === 1 ? "material pronto" : "materiais prontos"} para o cliente.`}</p>
            {erro && <p role="alert" className="mt-2 text-[13px] text-red-600">{erro}</p>}

            <ul className="mt-3 flex flex-col gap-3">
              {itens.map((m, idx) => {
                const aberta = aberto === m.id;
                return (
                  <li key={m.id} className="rounded-[22px] bg-surface-white ring-1 ring-black/[0.06]">
                    <div className="flex items-center gap-3 p-3">
                      <button type="button" onClick={() => { alvo.current = m.id; inputCapa.current?.click(); }} disabled={subindo === m.id} aria-label={m.capa ? "Trocar capa" : "Adicionar capa"} className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-soft text-text-tertiary active:scale-[0.96]">
                        {m.capa ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.capa} alt="" className="h-full w-full object-cover" />
                        ) : subindo === m.id ? <OrbiMiniVerde size={22} /> : (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                        )}
                      </button>
                      <button type="button" onClick={() => setAberto(aberta ? null : m.id)} aria-expanded={aberta} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-medium">{m.titulo || "Material sem título"}</span>
                          <span className="block truncate text-[12.5px] text-text-tertiary">{m.url ? `${tipoDoArquivo(m.url)}${m.bytes ? ` · ${pesoLegivel(m.bytes)}` : ""}` : "Sem arquivo ainda"} · {m.acesso === "contato" ? "Pede contato" : "Livre"}</span>
                        </span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-text-secondary">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${aberta ? "rotate-180" : ""}`} aria-hidden><path d="M6 9l6 6 6-6" /></svg>
                        </span>
                      </button>
                    </div>

                    {aberta && (
                      <div className="flex flex-col gap-3 border-t border-divider p-3.5">
                        <input value={m.titulo} onChange={(e) => mudar(m.id, { titulo: e.target.value })} maxLength={80} placeholder="Título do material" aria-label="Título do material" className={campo} autoFocus={!m.titulo} />
                        <textarea value={m.descricao} onChange={(e) => mudar(m.id, { descricao: e.target.value })} rows={3} maxLength={400} placeholder="Do que se trata, para quem é" aria-label="Descrição do material" className={`${campo} resize-y text-[14px] leading-snug`} />

                        <div>
                          <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Quem pode baixar</p>
                          <div role="radiogroup" aria-label="Quem pode baixar" className="mt-1.5 flex rounded-full bg-surface-soft p-1">
                            {([["livre", "Livre"], ["contato", "Pede contato"]] as const).map(([v, r]) => (
                              <button key={v} type="button" role="radio" aria-checked={m.acesso === v} onClick={() => mudar(m.id, { acesso: v }, true)} className={`min-h-[44px] flex-1 rounded-full text-[14px] font-semibold transition-all ${m.acesso === v ? "bg-surface-white shadow-sm" : "text-text-secondary"}`}>{r}</button>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[12.5px] leading-snug text-text-tertiary">
                            {m.acesso === "contato" ? "O cliente deixa nome e WhatsApp e só então baixa. O contato aparece nas suas Conversas, com o nome do material." : "Qualquer visitante baixa direto, sem deixar contato."}
                          </p>
                        </div>

                        <div>
                          <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Arquivo</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {m.url && <a href={m.url} target="_blank" rel="noopener" className="inline-flex min-h-[44px] items-center rounded-full bg-surface-soft px-4 text-[13.5px] font-medium">Ver o arquivo ↗</a>}
                            <button type="button" onClick={() => { alvo.current = m.id; inputArquivo.current?.click(); }} disabled={subindo === m.id} className={`min-h-[44px] rounded-full px-5 text-[13.5px] font-semibold ${subindo === m.id ? "bg-surface-white text-on-background ring-1 ring-black/10" : m.url ? "border border-divider" : "bg-on-background text-white"}`}>
                              {subindo === m.id ? <span className="inline-flex items-center gap-2"><OrbiMiniVerde size={16} />Enviando…</span> : m.url ? "Trocar PDF" : "Enviar PDF"}
                            </button>
                            <button type="button" onClick={() => { setLinkDe(linkDe === m.id ? null : m.id); setLink(""); }} className="min-h-[44px] rounded-full border border-divider px-5 text-[13.5px] font-medium">{m.url ? "Usar outro link" : "Colar link"}</button>
                          </div>
                          {linkDe === m.id && (
                            <div className="mt-2">
                              <div className="flex gap-2">
                                <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." inputMode="url" className={`${campo} min-w-0 flex-1`} />
                                <button type="button" onClick={() => salvarLink(m.id)} className="min-h-[44px] rounded-full bg-on-background px-5 text-[13.5px] font-semibold text-white">Salvar</button>
                              </div>
                              <p className="mt-1.5 text-[12px] leading-snug text-text-tertiary">Serve para planilha, documento, zip ou arquivo grande. No Google Drive, deixe como &quot;Qualquer pessoa com o link&quot;.</p>
                            </div>
                          )}
                          <p className="mt-1.5 text-[12px] leading-snug text-text-tertiary">PDF de até {LIMITE_MB} MB.{m.acesso === "contato" ? " Atenção: quem tiver o endereço do arquivo consegue baixar sem passar pelo contato." : ""}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-3">
                          <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0} aria-label="Subir material" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-[16px] disabled:opacity-25">↑</button>
                          <button type="button" onClick={() => mover(idx, 1)} disabled={idx === itens.length - 1} aria-label="Descer material" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-[16px] disabled:opacity-25">↓</button>
                          {m.capa && <button type="button" onClick={() => mudar(m.id, { capa: null }, true)} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary">Tirar capa</button>}
                          <button type="button" onClick={() => remover(m)} className="ml-auto min-h-[40px] rounded-full px-3 text-[13px] font-medium text-text-tertiary">Apagar</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {itens.length < MAX_MATERIAIS ? (
              <button type="button" onClick={novo} className={`mt-3 min-h-[48px] rounded-full px-6 text-[14px] font-semibold active:scale-[0.98] ${itens.length === 0 ? "bg-on-background text-white" : "border border-divider bg-surface-white"}`}>+ Adicionar material</button>
            ) : <p className="mt-3 text-[12.5px] text-text-tertiary">Limite de {MAX_MATERIAIS} materiais.</p>}
          </section>

          <section className="mt-8" aria-label="Botão na página">
            <details className="group rounded-[22px] bg-surface-white ring-1 ring-black/[0.06]">
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span style={{ backgroundColor: corAtual, color: textoSobre(corAtual) }} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[17px]" aria-hidden>
                  {imagemBotao ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagemBotao} alt="" className="h-full w-full object-cover" />
                  ) : iconeAtual}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-snug">Botão na sua página</span>
                  <span className="block truncate text-[12.5px] leading-snug text-text-tertiary">{ativo ? "Aparece" : "Escondido"} · {nome || "Materiais"} · {sub}</span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-tertiary transition-transform group-open:rotate-180" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
              </summary>
              <div className="flex flex-col gap-3 px-4 pb-4">
                <div className={`flex items-center gap-3 p-4 ${formato === "largo" ? "min-h-[150px] flex-col justify-end overflow-hidden rounded-[26px]" : "rounded-[22px]"}`} style={{ backgroundColor: corAtual, color: textoSobre(corAtual), ...(formato === "largo" && imagemBotao ? { backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.05)), url(${imagemBotao})`, backgroundSize: "cover", backgroundPosition: "center", color: "#fff" } : {}) }} aria-hidden>
                  <div className={`flex w-full items-center gap-3 ${formato === "largo" ? "" : ""}`}>
                    {!(formato === "largo" && imagemBotao) && (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-[18px]">
                        {imagemBotao ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imagemBotao} alt="" className="h-full w-full object-cover" />
                        ) : iconeAtual}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{nome || "Materiais"}</span>
                      <span className="block truncate text-[12.5px] opacity-75">{sub}</span>
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Título do botão</p>
                  <input value={nome} onChange={(e) => { setNome(e.target.value); gravarTexto(e.target.value, sub); }} maxLength={30} className={`${campo} mt-1.5`} />
                </div>
                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Frase pequena embaixo do título</p>
                  <input value={sub} onChange={(e) => { setSub(e.target.value); gravarTexto(nome, e.target.value); }} maxLength={60} className={`${campo} mt-1.5`} />
                </div>

                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Formato na página</p>
                  <div role="radiogroup" aria-label="Formato do botão" className="mt-1.5 flex rounded-full bg-surface-soft p-1">
                    {([["auto", "Botão"], ["largo", "Box com imagem"]] as const).map(([v, r]) => (
                      <button key={v} type="button" role="radio" aria-checked={formato === v} onClick={() => gravarConfig({ layout: v })} className={`min-h-[44px] flex-1 rounded-full text-[14px] font-semibold transition-all ${formato === v ? "bg-surface-white shadow-sm" : "text-text-secondary"}`}>{r}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Imagem do botão</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">Aparece no lugar do ícone, ou como fundo se você escolher Box com imagem.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => inputBotao.current?.click()} disabled={subindo === "botao"} className="min-h-[44px] rounded-full border border-divider px-5 text-[13.5px] font-medium">{subindo === "botao" ? <span className="inline-flex items-center gap-2"><OrbiMiniVerde size={16} />Enviando…</span> : imagemBotao ? "Trocar imagem" : "Enviar imagem"}</button>
                    {imagemBotao && <button type="button" onClick={() => gravarConfig({ logo_url: null })} className="min-h-[44px] rounded-full px-4 text-[13.5px] font-medium text-text-tertiary">Tirar</button>}
                  </div>
                </div>

                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Cor</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-text-tertiary">Também colore os botões de baixar dentro da página de materiais.</p>
                  <div role="radiogroup" aria-label="Escolha a cor" className="mt-2 flex flex-wrap gap-2.5">
                    {CORES_BOTAO.map((c) => (
                      <button key={c} type="button" role="radio" aria-checked={corAtual.toLowerCase() === c.toLowerCase()} aria-label={`Cor ${c}`} onClick={() => trocarCor(c === CORES_BOTAO[0] ? null : c)} style={{ backgroundColor: c }} className={`h-11 w-11 rounded-full ring-offset-2 transition-transform active:scale-95 ${corAtual.toLowerCase() === c.toLowerCase() ? "ring-2 ring-on-background" : "ring-1 ring-black/10"}`} />
                    ))}
                    <label className="relative flex h-11 min-w-[44px] cursor-pointer items-center justify-center rounded-full border border-divider px-3.5 text-[13px] font-medium text-text-secondary">
                      Outra
                      <input type="color" value={corAtual} onChange={(e) => trocarCor(e.target.value)} aria-label="Escolher outra cor" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Ícone</p>
                  <div role="radiogroup" aria-label="Escolha o ícone" className="mt-2 flex flex-wrap gap-2">
                    {ICONES.map((ic) => (
                      <button key={ic} type="button" role="radio" aria-checked={iconeAtual === ic} aria-label={`Ícone ${ic}`} onClick={() => gravarConfig({ icon: ic })} className={`flex h-11 w-11 items-center justify-center rounded-full border text-[20px] active:scale-95 ${iconeAtual === ic ? "border-on-background bg-surface-soft" : "border-divider"}`}>{ic}</button>
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
