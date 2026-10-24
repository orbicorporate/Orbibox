"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatarWhatsapp } from "./MagicScreens";
import { DIAS_CURTOS, type Horario } from "@/lib/horario";

export type RevisaoDados = {
  bizId: string;
  logo: string | null;
  /** Cores da marca que a Orbi achou (hex). */
  cores: string[];
  whatsapp: string;
  endereco: string;
  /** Como a Orbi entendeu o que a pessoa vende, pelo que puxou do site. */
  modo: ModoDestaque;
  /** Cartões para tocar: categorias, produtos ou serviços (até 12). */
  destacaveis: Destacavel[];
  temInstagram: boolean;
  temVoucher: boolean;
  /** Ramo de comida: sugere ligar o Cardápio. */
  gastronomico: boolean;
  /** Ramo de serviço: sugere o botão Agendar. */
  servico: boolean;
};

export type ModoDestaque = "categoria" | "produto" | "servico" | "sugestao";
export type Destacavel = { id: string; nome: string; foto: string | null; sub?: string; itemId?: string | null; novo?: boolean };

export type RevisaoResultado = { cores: string[]; whatsapp: string; endereco: string; escolhidos: Destacavel[]; horario: Horario | null; extras: string[] };

const MAX_DESTAQUES = 4;

/** Texto legível sobre um fundo colorido. */
function corDoTexto(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#111318";
  const n = parseInt(m[1], 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.62 ? "#111318" : "#FFFFFF";
}

const campo = "w-full rounded-full bg-surface-soft px-4 py-3 text-[15px] outline-none ring-1 ring-transparent focus:ring-on-background/30";

/**
 * Antes de abrir a Home: confere o que a Orbi achou (logotipo, contato,
 * endereço) e pergunta o que vem primeiro. Cada item vira um botão ou
 * bolinha pronta, sem a pessoa montar nada do zero.
 */
export function Revisar({ dados, onConfirmar }: { dados: RevisaoDados; onConfirmar: (v: RevisaoResultado) => void }) {
  const supabase = createClient();
  const [logo, setLogo] = useState(dados.logo);
  const [cores, setCores] = useState<string[]>(dados.cores);
  const [whatsapp, setWhatsapp] = useState(dados.whatsapp);
  const [endereco, setEndereco] = useState(dados.endereco);
  const [cartoes, setCartoes] = useState<Destacavel[]>(dados.destacaveis);
  const [marcados, setMarcados] = useState<string[]>(dados.destacaveis.slice(0, 3).map((d) => d.id));
  const [novoNome, setNovoNome] = useState<string | null>(null);
  const [avisoLimite, setAvisoLimite] = useState(false);
  const [comHorario, setComHorario] = useState(false);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [abre, setAbre] = useState("09:00");
  const [fecha, setFecha] = useState("18:00");
  const [extras, setExtras] = useState<string[]>([...(dados.gastronomico ? ["cardapio"] : []), ...(dados.servico ? ["agendar"] : [])]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const waOk = whatsapp.replace(/\D/g, "").length >= 10;

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

  function alternarCartao(id: string) {
    setAvisoLimite(false);
    setMarcados((a) => {
      if (a.includes(id)) return a.filter((x) => x !== id);
      if (a.length >= MAX_DESTAQUES) { setAvisoLimite(true); return a; }
      return [...a, id];
    });
  }
  function adicionarCartao() {
    const nome = (novoNome ?? "").trim();
    if (!nome) { setNovoNome(null); return; }
    const id = `n-${Date.now()}`;
    setCartoes((c) => [...c, { id, nome, foto: null, novo: true }]);
    if (marcados.length < MAX_DESTAQUES) setMarcados((a) => [...a, id]);
    setNovoNome(null);
  }
  const usaveis = cores.length > 2 ? cores.slice(1) : cores.length > 0 ? cores : ["#111318"];
  const palavra = dados.modo === "categoria" ? "categorias" : dados.modo === "servico" ? "serviços" : dados.modo === "produto" ? "produtos" : "o que você vende";

  const itensHome = [
    waOk && "WhatsApp",
    extras.includes("agendar") && "Agendar",
    extras.includes("cardapio") && "Cardápio",
    endereco.trim() && "Mapa",
    dados.temInstagram && "Instagram",
    "Catálogo",
    dados.temVoucher && "Voucher",
  ].filter((x): x is string => !!x);

  const card = "rounded-[22px] bg-white p-4 ring-1 ring-black/[0.06]";
  const num = (n: number, ok: boolean) => (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${ok ? "bg-[#1F9E4C] text-white" : "bg-on-background text-white"}`}>{ok ? "✓" : n}</span>
  );

  return (
    <div className="orbi-linha-entra flex flex-col gap-3">
      <div className="mb-1 text-center">
        <h1 className="font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.01em]">Confira antes de abrir</h1>
        <p className="mt-1.5 text-[14px] text-text-secondary">Isso vira os botões da sua página inicial.</p>
      </div>

      <section className={card}>
        <div className="flex items-center gap-3">
          {num(1, !!logo)}
          <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold leading-tight">Logotipo</p><p className="text-[12.5px] text-text-tertiary">{logo ? "A Orbi encontrou o seu" : "Não encontrei. Envie o seu"}</p></div>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-11 w-11 rounded-full bg-white object-contain p-1 ring-1 ring-black/10" />
          )}
        </div>
        <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviarLogo(f); e.target.value = ""; }} />
        <button type="button" onClick={() => arquivo.current?.click()} disabled={enviando} className="mt-3 rounded-full px-4 py-2 text-[13px] font-medium text-text-secondary ring-[0.5px] ring-black/25 disabled:opacity-50">
          {enviando ? "Enviando…" : logo ? "Trocar logotipo" : "Enviar logotipo"}
        </button>
      </section>

      <section className={card}>
        <div className="flex items-center gap-3">
          {num(2, cores.length > 0)}
          <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold leading-tight">Cores da marca</p><p className="text-[12.5px] text-text-tertiary">{cores.length > 0 ? "Toque numa cor para trocar" : "Escolha as cores da sua marca"}</p></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {cores.map((c, i) => (
            <span key={i} className="relative">
              <label className="block h-12 w-12 cursor-pointer rounded-full ring-1 ring-black/15" style={{ backgroundColor: c }}>
                <input type="color" value={c} onChange={(e) => setCores((a) => a.map((x, j) => (j === i ? e.target.value : x)))} className="sr-only" aria-label={`Trocar a cor ${i + 1}`} />
              </label>
              {cores.length > 1 && (
                <button type="button" onClick={() => setCores((a) => a.filter((_, j) => j !== i))} aria-label="Remover cor" className="absolute -right-1 -top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-white text-[10px] text-text-secondary shadow ring-[0.5px] ring-black/20">✕</button>
              )}
            </span>
          ))}
          {cores.length < 5 && (
            <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-[20px] text-text-secondary">
              +
              <input type="color" defaultValue="#111318" onChange={(e) => setCores((a) => (a.length < 5 ? [...a, e.target.value] : a))} className="sr-only" aria-label="Adicionar cor" />
            </label>
          )}
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center gap-3">
          {num(3, waOk)}
          <div><p className="text-[15px] font-semibold leading-tight">WhatsApp ou telefone</p><p className="text-[12.5px] text-text-tertiary">Vira o botão de contato</p></div>
        </div>
        <input value={whatsapp} onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))} inputMode="tel" placeholder="(11) 99999-9999" className={`${campo} mt-3`} />
      </section>

      <section className={card}>
        <div className="flex items-center gap-3">
          {num(4, !!endereco.trim())}
          <div><p className="text-[15px] font-semibold leading-tight">Endereço</p><p className="text-[12.5px] text-text-tertiary">Vira a bolinha de mapa. Pule se não atende no local</p></div>
        </div>
        <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, cidade" className={`${campo} mt-3`} />
        {endereco.trim() && (
          <div className="mt-3">
            <button type="button" aria-pressed={comHorario} onClick={() => setComHorario((v) => !v)} className={`min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${comHorario ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>
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
      </section>

      <section className={card}>
        <div className="flex items-center gap-3">
          {num(5, marcados.length > 0)}
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-tight">Seus destaques</p>
            <p className="text-[12.5px] text-text-tertiary">{dados.modo === "sugestao" ? "Toque no que você vende. Vira a frente da sua página" : `Toque nos ${palavra} que mais vendem`}</p>
          </div>
          <span className="shrink-0 text-[12px] font-medium text-text-tertiary">{marcados.length}/{MAX_DESTAQUES}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {cartoes.map((c, i) => {
            const ordem = marcados.indexOf(c.id);
            const on = ordem >= 0;
            const bg = usaveis[i % usaveis.length];
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => alternarCartao(c.id)}
                className={`relative aspect-[4/5] overflow-hidden rounded-[20px] text-left transition-transform active:scale-[0.97] ${on ? "ring-[2.5px] ring-on-background ring-offset-2" : "ring-[0.5px] ring-black/10"}`}
                style={c.foto ? undefined : { backgroundColor: bg }}
              >
                {c.foto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.foto} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />
                  </>
                ) : null}
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="block text-[15px] font-semibold leading-tight line-clamp-2" style={{ color: c.foto ? "#fff" : corDoTexto(bg) }}>{c.nome}</span>
                  {c.sub && <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: c.foto ? "rgba(255,255,255,.8)" : corDoTexto(bg), opacity: c.foto ? 1 : 0.75 }}>{c.sub}</span>}
                </span>
                <span className={`absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] font-semibold shadow ${on ? "bg-on-background text-white" : "bg-white/85 text-transparent ring-[0.5px] ring-black/15"}`}>{on ? ordem + 1 : "·"}</span>
              </button>
            );
          })}
          {novoNome === null ? (
            <button type="button" onClick={() => setNovoNome("")} className="flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-[20px] bg-surface-soft text-text-secondary active:scale-[0.97]">
              <span className="text-[26px] leading-none">+</span>
              <span className="text-[13px] font-medium">Adicionar</span>
            </button>
          ) : (
            <div className="flex aspect-[4/5] flex-col justify-end gap-2 rounded-[20px] bg-surface-soft p-3">
              <input autoFocus value={novoNome} onChange={(e) => setNovoNome(e.target.value.slice(0, 40))} onKeyDown={(e) => { if (e.key === "Enter") adicionarCartao(); }} placeholder="Nome" className="w-full rounded-full bg-white px-3 py-2 text-[14px] outline-none" />
              <button type="button" onClick={adicionarCartao} className="rounded-full bg-on-background py-2 text-[13px] font-semibold text-white">Ok</button>
            </div>
          )}
        </div>
        {avisoLimite && <p className="mt-2 text-[12.5px] text-text-secondary">Até {MAX_DESTAQUES}. Desmarque um para trocar.</p>}
      </section>

      {(dados.gastronomico || dados.servico) && (
        <section className={card}>
          <p className="text-[15px] font-semibold leading-tight">Sugerido para o seu ramo</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              dados.gastronomico && { id: "cardapio", t: "Cardápio com pratos e fotos" },
              dados.servico && { id: "agendar", t: "Botão Agendar horário" },
            ].filter((x): x is { id: string; t: string } => !!x).map((x) => {
              const on = extras.includes(x.id);
              return <button key={x.id} type="button" aria-pressed={on} onClick={() => setExtras((a) => (on ? a.filter((y) => y !== x.id) : [...a, x.id]))} className={`min-h-[40px] rounded-full px-4 text-[13.5px] font-medium ${on ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{on ? "✓ " : ""}{x.t}</button>;
            })}
          </div>
        </section>
      )}

      <section className="rounded-[22px] bg-surface-soft p-4">
        <p className="text-[12.5px] font-medium text-text-tertiary">Sua página inicial vai ter</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {itensHome.map((i) => <span key={i} className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-medium">{i}</span>)}
        </div>
      </section>

      {erro && <p className="px-1 text-[13px] text-red-600">{erro}</p>}
      <button type="button" onClick={() => onConfirmar({ cores, whatsapp, endereco, escolhidos: marcados.map((id) => cartoes.find((c) => c.id === id)).filter((c): c is Destacavel => !!c), horario: comHorario && endereco.trim() && dias.length > 0 && abre < fecha ? { dias, abre, fecha } : null, extras })} className="orbi-gradient mt-1 w-full rounded-full py-4 text-[16px] font-medium text-on-background transition-transform active:scale-[0.98]">
        Montar minha página →
      </button>
    </div>
  );
}
