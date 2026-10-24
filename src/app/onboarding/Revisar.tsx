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
  opcoes: string[];
  principal: string | null;
  temInstagram: boolean;
  temVoucher: boolean;
  /** Ramo de comida: sugere ligar o Cardápio. */
  gastronomico: boolean;
  /** Ramo de serviço: sugere o botão Agendar. */
  servico: boolean;
};

export type RevisaoResultado = { cores: string[]; whatsapp: string; endereco: string; principal: string | null; horario: Horario | null; extras: string[] };

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
  const [principal, setPrincipal] = useState(dados.principal);
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

      {dados.opcoes.length > 0 && (
        <section className={card}>
          <div className="flex items-center gap-3">
            {num(5, !!principal)}
            <div><p className="text-[15px] font-semibold leading-tight">O que vem primeiro?</p><p className="text-[12.5px] text-text-tertiary">Seu principal produto ou serviço, na frente de tudo</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {dados.opcoes.map((o) => (
              <button key={o} type="button" aria-pressed={principal === o} onClick={() => setPrincipal(principal === o ? null : o)} className={`min-h-[40px] rounded-full px-4 text-[14px] font-medium ${principal === o ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{o}</button>
            ))}
          </div>
        </section>
      )}

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
      <button type="button" onClick={() => onConfirmar({ cores, whatsapp, endereco, principal, horario: comHorario && endereco.trim() && dias.length > 0 && abre < fecha ? { dias, abre, fecha } : null, extras })} className="orbi-gradient mt-1 w-full rounded-full py-4 text-[16px] font-medium text-on-background transition-transform active:scale-[0.98]">
        Montar minha página →
      </button>
    </div>
  );
}
