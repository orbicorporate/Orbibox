"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarWhatsapp } from "./MagicScreens";
import { DIAS_CURTOS, type Horario } from "@/lib/horario";
import { coresDosCards } from "@/lib/paletaCards";
import { IconeOrbi, type NomeIcone } from "./IconesOrbi";

/** Categoria que veio do site (ou sugerida pelo ramo). */
export type CategoriaRevisao = { nome: string; n: number; foto: string | null };
/** Item que veio do site: produto ou serviço. */
export type ItemRevisao = { id: string; nome: string; foto: string | null; sub?: string; categoria: string | null };

export type RevisaoDados = {
  bizId: string;
  logo: string | null;
  /** Cores da marca que a Orbi achou (hex). */
  cores: string[];
  whatsapp: string;
  endereco: string;
  /** Categorias do site, com quantos itens e a melhor foto de cada uma. */
  categorias: CategoriaRevisao[];
  /** Sem categorias no site: sugestões do ramo para tocar. */
  sugestoes: string[];
  /** Tudo o que veio do site (produtos ou serviços). */
  itens: ItemRevisao[];
  temInstagram: boolean;
  temVoucher: boolean;
  /** Ramo de comida: sugere ligar o Cardápio. */
  gastronomico: boolean;
  /** Ramo de serviço: sugere o botão Agendar e fala em serviços. */
  servico: boolean;
};

/** Destaque escolhido: um item do site (itemId) ou um novo, escrito pela pessoa. */
export type ItemEscolhido = { itemId: string | null; nome: string; categoria: string | null };

export type RevisaoResultado = {
  cores: string[];
  whatsapp: string;
  endereco: string;
  /** Categorias importantes, na ordem em que foram tocadas (inclui as novas). */
  categorias: string[];
  /** Produtos ou serviços em destaque na página inicial (inclui os novos). */
  itens: ItemEscolhido[];
  horario: Horario | null;
  extras: string[];
};

/** Cor e ícone de cada etapa da revisão. */
const VISUAL_ETAPA: Record<string, { cor: string; icone: NomeIcone }> = {
  logo: { cor: "#111318", icone: "orbita" },
  cores: { cor: "#8758BE", icone: "paleta" },
  contato: { cor: "#1FA855", icone: "whatsapp" },
  endereco: { cor: "#EA4335", icone: "pino" },
  categorias: { cor: "#3B82F6", icone: "grade" },
  itens: { cor: "#E9A100", icone: "estrela" },
  resumo: { cor: "#1F9E4C", icone: "check" },
};

const MAX_CATEGORIAS = 4;
const MAX_ITENS = 4;

/** Texto legível sobre um fundo colorido. */
function corDoTexto(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#111318";
  const n = parseInt(m[1], 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.62 ? "#111318" : "#FFFFFF";
}

const campo = "w-full rounded-full bg-surface-soft px-4 py-3 text-[15px] outline-none ring-1 ring-transparent focus:ring-on-background/30";
const chip = (on: boolean) => `min-h-[40px] rounded-full px-4 text-[14px] font-medium transition-colors ${on ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`;

type Etapa = "logo" | "cores" | "contato" | "endereco" | "categorias" | "itens" | "resumo";

/**
 * Antes de abrir a página inicial: uma etapa por vez, cada uma editável. A pessoa confere
 * o que a Orbi achou no site (logotipo, cores, contato, endereço), toca nas
 * categorias e nos produtos ou serviços mais importantes e pode adicionar o que
 * faltou. Tudo vira item do catálogo e os escolhidos já entram em destaque na página inicial.
 */
export function Revisar({ dados, onConfirmar }: { dados: RevisaoDados; onConfirmar: (v: RevisaoResultado) => void }) {
  const supabase = createClient();
  const [logo, setLogo] = useState(dados.logo);
  const [cores, setCores] = useState<string[]>(dados.cores);
  const [whatsapp, setWhatsapp] = useState(dados.whatsapp);
  const [endereco, setEndereco] = useState(dados.endereco);
  const [comHorario, setComHorario] = useState(false);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [abre, setAbre] = useState("09:00");
  const [fecha, setFecha] = useState("18:00");
  const [extras, setExtras] = useState<string[]>([...(dados.gastronomico ? ["cardapio"] : []), ...(dados.servico ? ["agendar"] : [])]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  // Categorias: as do site (ou as sugestões do ramo) mais as que a pessoa escreveu.
  const catsIniciais = dados.categorias.length > 0 ? dados.categorias : dados.sugestoes.map((nome) => ({ nome, n: 0, foto: null }));
  const [cats, setCats] = useState<CategoriaRevisao[]>(catsIniciais);
  const [catsMarcadas, setCatsMarcadas] = useState<string[]>([...catsIniciais].sort((a, b) => b.n - a.n).slice(0, 3).map((c) => c.nome));
  const [novaCat, setNovaCat] = useState("");

  // Itens: os do site mais os novos. Começa com os 3 primeiros com foto marcados.
  const [itens, setItens] = useState<ItemRevisao[]>(dados.itens);
  const [itensMarcados, setItensMarcados] = useState<string[]>(dados.itens.filter((i) => i.foto).slice(0, 3).map((i) => i.id));
  const [filtro, setFiltro] = useState<string | null>(null);
  const [novoItem, setNovoItem] = useState("");
  const [novoItemCat, setNovoItemCat] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const etapas: Etapa[] = ["logo", "cores", "contato", "endereco", "categorias", "itens", "resumo"];
  const [passo, setPasso] = useState(0);
  const etapa = etapas[passo];

  const waOk = whatsapp.replace(/\D/g, "").length >= 10;
  const usaveis = coresDosCards(cores);
  const palavraItens = dados.servico ? "serviços" : "produtos";

  async function enviarLogo(f: File) {
    if (f.size > 4_000_000) { setErro("Imagem muito grande. Use uma de até 4 MB."); return; }
    setErro(null);
    setEnviando(true);
    const ext = f.type.includes("png") ? "png" : f.type.includes("webp") ? "webp" : "jpg";
    const path = `${dados.bizId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("box-images").upload(path, f, { contentType: f.type, cacheControl: "31536000" });
    if (error) { setEnviando(false); setErro("Não consegui enviar. Tente de novo."); return; }
    const url = supabase.storage.from("box-images").getPublicUrl(path).data.publicUrl;
    await supabase.from("businesses").update({ logo_url: url }).eq("id", dados.bizId);
    setLogo(url);
    setEnviando(false);
  }

  function alternarCat(nome: string) {
    setAviso(null);
    setCatsMarcadas((a) => {
      if (a.includes(nome)) return a.filter((x) => x !== nome);
      if (a.length >= MAX_CATEGORIAS) { setAviso(`Até ${MAX_CATEGORIAS}. Desmarque uma para trocar.`); return a; }
      return [...a, nome];
    });
  }
  function adicionarCat() {
    const nome = novaCat.trim().slice(0, 30);
    if (!nome) return;
    if (!cats.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) setCats((c) => [...c, { nome, n: 0, foto: null }]);
    if (!catsMarcadas.includes(nome) && catsMarcadas.length < MAX_CATEGORIAS) setCatsMarcadas((a) => [...a, nome]);
    setNovaCat("");
  }
  function alternarItem(id: string) {
    setAviso(null);
    setItensMarcados((a) => {
      if (a.includes(id)) return a.filter((x) => x !== id);
      if (a.length >= MAX_ITENS) { setAviso(`Até ${MAX_ITENS} em destaque. Desmarque um para trocar.`); return a; }
      return [...a, id];
    });
  }
  function adicionarItem() {
    const nome = novoItem.trim().slice(0, 60);
    if (!nome) return;
    const id = `n-${Date.now()}`;
    setItens((l) => [{ id, nome, foto: null, categoria: novoItemCat, sub: "Novo" }, ...l]);
    if (itensMarcados.length < MAX_ITENS) setItensMarcados((a) => [...a, id]);
    setNovoItem("");
  }

  function confirmar() {
    onConfirmar({
      cores,
      whatsapp,
      endereco,
      categorias: catsMarcadas,
      itens: itensMarcados
        .map((id) => itens.find((i) => i.id === id))
        .filter((i): i is ItemRevisao => !!i)
        .map((i) => ({ itemId: i.id.startsWith("n-") ? null : i.id, nome: i.nome, categoria: i.categoria })),
      horario: comHorario && endereco.trim() && dias.length > 0 && abre < fecha ? { dias, abre, fecha } : null,
      extras,
    });
  }

  const titulos: Record<Etapa, { t: string; d: string }> = {
    logo: { t: "Seu logotipo", d: logo ? "A Orbi encontrou este. Está certo?" : "Não encontrei. Envie o seu." },
    cores: { t: "Cores da marca", d: "Toque numa cor para trocar." },
    contato: { t: "WhatsApp ou telefone", d: "Vira o botão de contato." },
    endereco: { t: "Endereço", d: "Vira a bolinha de mapa. Pule se não atende no local." },
    categorias: { t: dados.servico ? "Tipos de serviço" : "Categorias", d: dados.categorias.length > 0 ? `A Orbi achou ${dados.categorias.length} no seu site. Toque nas mais importantes.` : "Toque nas que combinam com você ou escreva as suas." },
    itens: { t: `Seus ${palavraItens}`, d: itens.length > 0 ? `Toque em até ${MAX_ITENS} para destaque na página inicial. Fotos você coloca depois.` : `Escreva seus principais ${palavraItens}.` },
    resumo: { t: "Sua página inicial está sendo montada", d: "Vamos concluir juntos, logo depois de abrir." },
  };

  const listaFiltrada = filtro ? itens.filter((i) => i.categoria === filtro) : itens;
  const catsComItens = cats.filter((c) => itens.some((i) => i.categoria === c.nome));
  const podeAvancar = etapa !== "contato" || waOk || whatsapp.trim() === "";
  const opcional = etapa === "logo" || etapa === "endereco" || etapa === "contato";

  return (
    <div className="orbi-linha-entra flex min-h-[calc(100dvh-64px)] flex-col gap-6 pb-32">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-text-tertiary">Confira antes de abrir · {passo + 1} de {etapas.length}</p>
          {passo > 0 && <button type="button" onClick={() => { setAviso(null); setPasso((p) => p - 1); }} className="text-[13px] font-medium text-text-secondary">← Voltar</button>}
        </div>
        <div className="mt-2 flex gap-1" aria-hidden>
          {etapas.map((e, i) => <span key={e} className={`h-1.5 flex-1 rounded-full ${i < passo ? "bg-[#1F9E4C]" : i === passo ? "bg-on-background" : "bg-black/10"}`} />)}
        </div>
        {/* Ícone grande da etapa, flutuando: dá cara e ocupa o espaço com intenção. */}
        <div key={etapa} className="orbi-linha-entra mt-7 flex flex-col items-center text-center">
          {etapa === "logo" && logo ? (
            <span className="icone-etapa flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full bg-white p-3 shadow-[0_22px_40px_-18px_rgba(17,19,24,0.55)] ring-1 ring-black/[0.06]" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="" className="h-full w-full object-contain" />
            </span>
          ) : etapa === "cores" && cores.length > 0 ? (
            <span className="icone-etapa flex h-[92px] w-[92px] items-center justify-center rounded-full shadow-[0_22px_40px_-18px_rgba(17,19,24,0.55)]" style={{ backgroundColor: VISUAL_ETAPA.cores.cor }} aria-hidden>
              <span className="grid grid-cols-2 gap-1">{cores.slice(0, 4).map((c, i) => <span key={i} className="h-5 w-5 rounded-full ring-2 ring-white/80" style={{ backgroundColor: c }} />)}</span>
            </span>
          ) : (
            <IconeOrbi nome={VISUAL_ETAPA[etapa].icone} cor={VISUAL_ETAPA[etapa].cor} tamanho={92} traco={1.5} className="icone-etapa shadow-[0_22px_40px_-18px_rgba(17,19,24,0.55)]" />
          )}
          <h1 className="mt-5 font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-tight tracking-[-0.01em]">{titulos[etapa].t}</h1>
          <p className="mt-1.5 max-w-[320px] text-[14.5px] leading-snug text-text-secondary">{titulos[etapa].d}</p>
        </div>
      </div>

      <section className="flex flex-1 flex-col justify-center">
        {etapa === "logo" && (
          <div className="flex flex-col items-center gap-4 py-2">
            <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-surface-soft ring-1 ring-black/10">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="h-full w-full object-contain p-3" />
              ) : (
                <span className="text-[13px] text-text-tertiary">Sem logo</span>
              )}
            </span>
            <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviarLogo(f); e.target.value = ""; }} />
            <button type="button" onClick={() => arquivo.current?.click()} disabled={enviando} className="rounded-full px-5 py-2.5 text-[14px] font-medium text-text-secondary ring-[0.5px] ring-black/25 disabled:opacity-50">
              {enviando ? "Enviando…" : logo ? "Trocar logotipo" : "Enviar logotipo"}
            </button>
          </div>
        )}

        {etapa === "cores" && (
          <div className="flex flex-wrap items-center gap-3">
            {cores.map((c, i) => (
              <span key={i} className="relative">
                <label className="block h-14 w-14 cursor-pointer rounded-full ring-1 ring-black/15" style={{ backgroundColor: c }}>
                  <input type="color" value={c} onChange={(e) => setCores((a) => a.map((x, j) => (j === i ? e.target.value : x)))} className="sr-only" aria-label={`Trocar a cor ${i + 1}`} />
                </label>
                {cores.length > 1 && (
                  <button type="button" onClick={() => setCores((a) => a.filter((_, j) => j !== i))} aria-label="Remover cor" className="absolute -right-1 -top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-[10px] text-text-secondary shadow ring-[0.5px] ring-black/20">✕</button>
                )}
              </span>
            ))}
            {cores.length < 5 && (
              <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-[22px] text-text-secondary">
                +
                <input type="color" defaultValue="#111318" onChange={(e) => setCores((a) => (a.length < 5 ? [...a, e.target.value] : a))} className="sr-only" aria-label="Adicionar cor" />
              </label>
            )}
          </div>
        )}

        {etapa === "contato" && (
          <>
            <input value={whatsapp} onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))} inputMode="tel" placeholder="(11) 99999-9999" className={campo} />
            {whatsapp.trim() !== "" && !waOk && <p className="mt-2 text-[12.5px] text-red-600">Número incompleto. Coloque o DDD.</p>}
          </>
        )}

        {etapa === "endereco" && (
          <>
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, cidade" className={campo} />
            {endereco.trim() && (
              <div className="mt-3">
                <button type="button" aria-pressed={comHorario} onClick={() => setComHorario((v) => !v)} className={chip(comHorario)}>
                  {comHorario ? "✓ Mostrar Aberto agora no mapa" : "Mostrar Aberto agora no mapa"}
                </button>
                {comHorario && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {DIAS_CURTOS.map((d, i) => {
                        const on = dias.includes(i);
                        return <button key={d} type="button" aria-pressed={on} onClick={() => setDias((a) => (on ? a.filter((x) => x !== i) : [...a, i]))} className={`h-9 min-w-[44px] rounded-full px-3 text-[13px] font-medium ${on ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{d}</button>;
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[13px] text-text-secondary">
                      <span>Das</span>
                      <input type="time" value={abre} onChange={(e) => setAbre(e.target.value)} className="rounded-full bg-surface-soft px-3 py-2 text-[14px] outline-none" />
                      <span>às</span>
                      <input type="time" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-full bg-surface-soft px-3 py-2 text-[14px] outline-none" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {etapa === "categorias" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-text-tertiary">As marcadas viram bolinhas no topo da página inicial</p>
              <span className="text-[12px] font-medium text-text-tertiary">{catsMarcadas.length}/{MAX_CATEGORIAS}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {cats.map((c) => {
                const ordem = catsMarcadas.indexOf(c.nome);
                const on = ordem >= 0;
                return (
                  <button key={c.nome} type="button" aria-pressed={on} onClick={() => alternarCat(c.nome)} className={`flex items-center gap-3 rounded-2xl p-2 pr-3 text-left transition-colors ${on ? "bg-on-background text-white" : "bg-surface-soft"}`}>
                    <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/80">
                      {c.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.foto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="block h-full w-full" style={{ backgroundColor: usaveis[cats.indexOf(c) % usaveis.length] }} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{c.nome}</span>
                      <span className={`block text-[12px] ${on ? "text-white/70" : "text-text-tertiary"}`}>{c.n > 0 ? `${c.n} ${c.n === 1 ? "item" : "itens"} do site` : "Nova"}</span>
                    </span>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold ${on ? "bg-white text-on-background" : "bg-white text-transparent ring-[0.5px] ring-black/15"}`}>{on ? ordem + 1 : "·"}</span>
                  </button>
                );
              })}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); adicionarCat(); }} className="mt-3 flex items-center gap-2 rounded-full bg-surface-soft p-1.5 pl-4">
              <input value={novaCat} onChange={(e) => setNovaCat(e.target.value)} placeholder={dados.servico ? "Outro tipo de serviço" : "Outra categoria"} className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none" enterKeyHint="done" />
              <button type="submit" disabled={!novaCat.trim()} className="rounded-full bg-on-background px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-30">+ Adicionar</button>
            </form>
          </>
        )}

        {etapa === "itens" && (
          <>
            {catsComItens.length > 1 && (
              <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
                <button type="button" onClick={() => setFiltro(null)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium ${filtro === null ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>Todos</button>
                {catsComItens.map((c) => (
                  <button key={c.nome} type="button" onClick={() => setFiltro(c.nome)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium ${filtro === c.nome ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{c.nome}</button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {listaFiltrada.map((it) => {
                const ordem = itensMarcados.indexOf(it.id);
                const on = ordem >= 0;
                const bg = usaveis[itens.indexOf(it) % usaveis.length];
                return (
                  <button
                    key={it.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => alternarItem(it.id)}
                    className={`relative aspect-square overflow-hidden rounded-[20px] text-left transition-transform active:scale-[0.97] ${on ? "ring-[2.5px] ring-on-background ring-offset-2" : ""}`}
                    style={it.foto ? undefined : { backgroundColor: bg }}
                  >
                    {it.foto && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.foto} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
                      </>
                    )}
                    <span className="absolute inset-x-0 bottom-0 p-3">
                      <span className="block text-[14px] font-semibold leading-tight line-clamp-2" style={{ color: it.foto ? "#fff" : corDoTexto(bg) }}>{it.nome}</span>
                      {it.sub && it.sub !== "Novo" && <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: it.foto ? "rgba(255,255,255,.8)" : corDoTexto(bg), opacity: it.foto ? 1 : 0.75 }}>{it.sub}</span>}
                    </span>
                    {on && <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-on-background text-[12.5px] font-semibold text-white shadow">{ordem + 1}</span>}
                  </button>
                );
              })}
              {!adicionando && (
                <button type="button" onClick={() => setAdicionando(true)} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[20px] bg-surface-soft text-text-secondary active:scale-[0.97]">
                  <span className="text-[26px] leading-none">+</span>
                  <span className="text-[13px] font-medium">Adicionar</span>
                </button>
              )}
            </div>

            {(adicionando || itens.length === 0) && (
              <form onSubmit={(e) => { e.preventDefault(); adicionarItem(); }} className="mt-3 rounded-2xl bg-surface-soft p-2">
                <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4">
                  <input autoFocus={itens.length > 0} value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder={dados.servico ? "Ex: Corte feminino" : "Nome do produto"} className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none" enterKeyHint="done" />
                  <button type="submit" disabled={!novoItem.trim()} className="rounded-full bg-on-background px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-30">Ok</button>
                </div>
                {cats.length > 0 && novoItem.trim() && (
                  <div className="mt-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
                    {cats.map((c) => (
                      <button key={c.nome} type="button" onClick={() => setNovoItemCat(novoItemCat === c.nome ? null : c.nome)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${novoItemCat === c.nome ? "bg-on-background text-white" : "bg-white text-text-secondary"}`}>{c.nome}</button>
                    ))}
                  </div>
                )}
              </form>
            )}

          </>
        )}

        {etapa === "resumo" && (
          <>
            {/* Em vez de uma prévia que não fica igual à de verdade: o que já está pronto e o que fazemos juntos depois. */}
            <ul className="flex flex-col gap-2">
              {[
                { ok: !!logo, nome: "orbita" as const, cor: "#111318", t: "Logotipo", d: logo ? "Pronto" : "Você coloca depois" },
                { ok: cores.length > 0, nome: "paleta" as const, cor: "#8758BE", t: "Cores da marca", d: cores.length > 0 ? `${cores.length} cores` : "Você escolhe depois" },
                { ok: waOk, nome: "whatsapp" as const, cor: "#1FA855", t: "WhatsApp", d: waOk ? formatarWhatsapp(whatsapp) : "Você coloca depois" },
                { ok: !!endereco.trim(), nome: "pino" as const, cor: "#EA4335", t: "Endereço", d: endereco.trim() || "Você coloca depois" },
                { ok: catsMarcadas.length > 0, nome: "grade" as const, cor: "#3B82F6", t: "Categorias", d: catsMarcadas.length > 0 ? catsMarcadas.join(", ") : "Você escolhe depois" },
                { ok: itensMarcados.length > 0, nome: "estrela" as const, cor: "#E9A100", t: "Destaques", d: itensMarcados.length > 0 ? `${itensMarcados.length} na página inicial` : "Você escolhe depois" },
              ].map((x, i) => (
                <li key={x.t} style={{ animationDelay: `${i * 0.05}s` }} className="orbi-linha-entra flex items-center gap-3 rounded-[20px] bg-white/70 p-3 ring-1 ring-white/80 backdrop-blur-xl">
                  <IconeOrbi nome={x.nome} cor={x.ok ? x.cor : "#B8B8B2"} tamanho={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-medium leading-tight">{x.t}</span>
                    <span className="block truncate text-[12.5px] text-text-secondary">{x.d}</span>
                  </span>
                  {x.ok && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F9E4C] text-[12px] text-white" aria-hidden>✓</span>}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-3 rounded-[20px] bg-on-background p-4 text-white">
              <IconeOrbi nome="brilho" cor="#1F9E4C" tamanho={40} />
              <p className="text-[13.5px] leading-snug">Depois de abrir, a Orbi te mostra o que falta: fotos, bolinhas e os últimos ajustes.</p>
            </div>
            {(dados.gastronomico || dados.servico) && (
              <>
                <p className="mt-4 text-[12.5px] font-medium text-text-tertiary">Sugerido para o seu ramo</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    dados.gastronomico && { id: "cardapio", t: "Cardápio com pratos e fotos" },
                    dados.servico && { id: "agendar", t: "Botão Agendar horário" },
                  ].filter((x): x is { id: string; t: string } => !!x).map((x) => {
                    const on = extras.includes(x.id);
                    return <button key={x.id} type="button" aria-pressed={on} onClick={() => setExtras((a) => (on ? a.filter((y) => y !== x.id) : [...a, x.id]))} className={chip(on)}>{on ? "✓ " : ""}{x.t}</button>;
                  })}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {aviso && <p className="px-1 text-[13px] text-text-secondary">{aviso}</p>}
      {erro && <p className="px-1 text-[13px] text-red-600">{erro}</p>}

      <div className="fixed inset-x-0 bottom-0 z-20 px-5 pb-6 pt-3">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
          {etapa === "resumo" ? (
            <button type="button" onClick={confirmar} className="orbi-gradient w-full rounded-full py-4 text-[16px] font-medium text-on-background transition-transform active:scale-[0.98]">
              Montar minha página →
            </button>
          ) : (
            <button type="button" disabled={!podeAvancar} onClick={() => { setAviso(null); setPasso((p) => p + 1); }} className="w-full rounded-full bg-on-background py-4 text-[16px] font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-40">
              Continuar →
            </button>
          )}
          {opcional && (
            <button type="button" onClick={() => { if (etapa === "endereco") setEndereco(""); if (etapa === "contato") setWhatsapp(""); setPasso((p) => p + 1); }} className="text-[13px] font-medium text-text-tertiary">Pular</button>
          )}
        </div>
      </div>
    </div>
  );
}
