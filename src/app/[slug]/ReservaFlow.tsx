"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackClick } from "@/lib/track";

type Config = { dias: number[]; abre: string; fecha: string; intervalo_min: number; capacidade: number | null; max_pessoas: number; dias_a_frente: number; antecedencia_min: number };

const DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const pad = (n: number) => String(n).padStart(2, "0");
const chave = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rotuloHora = (h: string) => { const [hh, mm] = h.split(":"); return mm === "00" ? `${Number(hh)}h` : `${Number(hh)}h${mm}`; };
const minutos = (h: string) => { const [hh, mm] = h.split(":").map(Number); return hh * 60 + mm; };

/** Hoje no horário de Brasília, onde o restaurante está. */
function agoraBR() {
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return new Date(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"));
}

/** Tela "Reserve sua mesa": dia, horário, nome e pessoas. Grava a reserva e avisa o restaurante pelo WhatsApp. */
export function ReservaFlow({ businessId, businessName, whatsapp, sessionId, onBack }: { businessId: string; businessName: string; whatsapp: string | null; sessionId: string | null; onBack: () => void }) {
  const [cfg, setCfg] = useState<Config | null | undefined>(undefined);
  const [diaEscolhido, setDia] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [pessoas, setPessoas] = useState(2);
  const [obs, setObs] = useState("");
  const [ocupacao, setOcupacao] = useState<Record<string, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    createClient().from("reservas_config").select("dias, abre, fecha, intervalo_min, capacidade, max_pessoas, dias_a_frente, antecedencia_min").eq("business_id", businessId).maybeSingle().then(({ data }) => setCfg((data as Config | null) ?? null));
  }, [businessId]);

  const dias = useMemo(() => {
    if (!cfg) return [];
    const base = agoraBR();
    const out: Date[] = [];
    for (let i = 0; i <= cfg.dias_a_frente && out.length < 21; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      if (cfg.dias.includes(d.getDay())) out.push(d);
    }
    return out;
  }, [cfg]);

  const dia = diaEscolhido ?? (dias[0] ? chave(dias[0]) : null);

  useEffect(() => {
    if (!dia || !cfg || cfg.capacidade == null) return;
    let vivo = true;
    createClient().rpc("reserva_ocupacao", { p_business: businessId, p_data: dia }).then(({ data }) => { if (vivo) setOcupacao((data as Record<string, number> | null) ?? {}); });
    return () => { vivo = false; };
  }, [dia, cfg, businessId]);

  const horarios = useMemo(() => {
    if (!cfg) return [];
    const out: string[] = [];
    for (let m = minutos(cfg.abre); m <= minutos(cfg.fecha); m += cfg.intervalo_min) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
    return out;
  }, [cfg]);

  function indisponivel(h: string) {
    if (!cfg || !dia) return true;
    const agora = agoraBR();
    const [a, mo, d] = dia.split("-").map(Number);
    const quando = new Date(a, mo - 1, d, ...(h.split(":").map(Number) as [number, number]));
    if (quando.getTime() < agora.getTime() + cfg.antecedencia_min * 60000) return true;
    if (cfg.capacidade != null && (ocupacao[h] ?? 0) + pessoas > cfg.capacidade) return true;
    return false;
  }

  const dataSel = dia ? (() => { const [a, m, d] = dia.split("-").map(Number); return new Date(a, m - 1, d); })() : null;
  const resumoData = dataSel ? `${DIAS_LONGOS[dataSel.getDay()]}, ${pad(dataSel.getDate())}/${pad(dataSel.getMonth() + 1)}` : "";

  async function enviar() {
    if (!dia || !hora || !cfg) return;
    if (!nome.trim()) return setErro("Diga seu nome para a reserva.");
    const digitos = tel.replace(/\D/g, "");
    if (digitos && digitos.length < 10) return setErro("Digite o WhatsApp com DDD ou deixe em branco.");
    setEnviando(true); setErro(null);
    const texto = [`Olá! Gostaria de reservar uma mesa em ${businessName}.`, "", `Nome: ${nome.trim()}`, `Dia: ${resumoData}`, `Horário: ${rotuloHora(hora)}`, `Pessoas: ${pessoas}`, ...(obs.trim() ? [`Obs: ${obs.trim()}`] : [])].join("\n");
    const { data, error } = await createClient().rpc("criar_reserva", { p_business: businessId, p_nome: nome.trim(), p_whatsapp: digitos, p_data: dia, p_hora: hora, p_pessoas: pessoas, p_obs: obs.trim() });
    setEnviando(false);
    const r = (data ?? {}) as { ok?: boolean; motivo?: string };
    if (error || !r.ok) {
      const m: Record<string, string> = { lotado: "Esse horário acabou de lotar. Escolha outro.", antecedencia: "Esse horário já não aceita reserva. Escolha outro.", dia: "Não atendemos nesse dia.", hora: "Horário fora do atendimento.", pessoas: `Para esse tamanho de grupo, fale direto com o restaurante.`, longe: "Ainda não abrimos reservas para essa data.", desligado: "As reservas estão fechadas no momento." };
      return setErro(m[r.motivo ?? ""] ?? "Não consegui reservar agora. Tente de novo.");
    }
    trackClick({ businessId, kind: "reserva", sessionId });
    setFeito(true);
    const zap = (whatsapp ?? "").replace(/\D/g, "");
    if (zap) window.open(`https://wa.me/${zap}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  }

  const rotulo = "text-[12px] font-medium uppercase tracking-[0.14em] text-text-tertiary";

  if (cfg === undefined) return <div className="w-full py-10 text-center text-[14px] text-text-tertiary">Carregando…</div>;
  if (cfg === null) {
    return (
      <div className="w-full">
        <button onClick={onBack} className="mb-3 text-[14px] text-text-tertiary hover:underline">← voltar</button>
        <div className="rounded-[24px] border border-divider bg-surface-white p-6 text-center text-[14px] text-text-secondary">As reservas ainda não estão abertas aqui.</div>
      </div>
    );
  }

  if (feito) {
    return (
      <div className="w-full">
        <div className="rounded-[28px] bg-surface-white p-6 text-center ring-1 ring-divider">
          <p className="font-[family-name:var(--font-manrope)] text-[24px] font-medium tracking-[-0.01em]">Pedido enviado</p>
          <p className="mt-2 text-[14.5px] leading-snug text-text-secondary">{nome.trim()}, {resumoData} às {hora ? rotuloHora(hora) : ""}, {pessoas} {pessoas === 1 ? "pessoa" : "pessoas"}.</p>
          <p className="mt-3 text-[13.5px] leading-snug text-text-tertiary">{businessName} vai confirmar sua reserva. {whatsapp ? "Se o WhatsApp não abriu, toque abaixo para enviar o pedido." : ""}</p>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Fiz um pedido de reserva em ${businessName}: ${nome.trim()}, ${resumoData} às ${hora ? rotuloHora(hora) : ""}, ${pessoas} ${pessoas === 1 ? "pessoa" : "pessoas"}.`)}`} target="_blank" rel="noopener noreferrer" className="mt-4 flex min-h-[48px] items-center justify-center rounded-full bg-[#25D366] text-[15px] font-semibold text-white active:scale-[0.98]">Abrir WhatsApp</a>
          )}
          <button onClick={onBack} className="mt-3 block w-full py-2 text-[13.5px] text-text-secondary underline">Voltar ao início</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button onClick={onBack} className="mb-3 text-[14px] text-text-tertiary hover:underline">← voltar</button>
      <h2 className="font-[family-name:var(--font-manrope)] text-[28px] font-medium leading-tight tracking-[-0.02em]">Reserve sua <em className="font-medium italic">mesa</em></h2>
      <p className="mt-1.5 text-[14px] leading-snug text-text-secondary">Escolha o dia, o horário e o número de pessoas. Enviamos o pedido pelo WhatsApp.</p>

      <p className={`mt-6 ${rotulo}`}>Dia</p>
      <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {dias.map((d) => {
          const k = chave(d);
          const ativo = dia === k;
          return (
            <button key={k} type="button" onClick={() => { setDia(k); setHora(null); }} className={`flex min-h-[68px] w-[58px] shrink-0 flex-col items-center justify-center rounded-[20px] border transition active:scale-[0.96] ${ativo ? "border-on-background bg-on-background text-white" : "border-divider bg-surface-white"}`}>
              <span className={`text-[11px] tracking-[0.12em] ${ativo ? "text-white/80" : "text-text-tertiary"}`}>{DIAS[d.getDay()]}</span>
              <span className="text-[22px] font-medium leading-tight">{d.getDate()}</span>
              <span className={`text-[10px] tracking-[0.1em] ${ativo ? "text-white/70" : "text-text-tertiary"}`}>{MESES[d.getMonth()]}</span>
            </button>
          );
        })}
      </div>

      <p className={`mt-6 ${rotulo}`}>Horário</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {horarios.map((h) => {
          const off = indisponivel(h);
          const ativo = hora === h;
          return (
            <button key={h} type="button" disabled={off} onClick={() => setHora(h)} className={`min-h-[44px] rounded-full border text-[14px] transition active:scale-[0.96] ${ativo ? "border-on-background bg-on-background text-white" : off ? "border-divider bg-surface-soft text-text-tertiary line-through opacity-50" : "border-divider bg-surface-white"}`}>
              {rotuloHora(h)}
            </button>
          );
        })}
      </div>

      <p className={`mt-6 ${rotulo}`}>Seu nome</p>
      <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" className="mt-2 min-h-[52px] w-full rounded-full border border-divider bg-surface-white px-5 text-[16px] outline-none focus:border-on-background" />

      <p className={`mt-5 ${rotulo}`}>Seu WhatsApp (opcional)</p>
      <input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" className="mt-2 min-h-[52px] w-full rounded-full border border-divider bg-surface-white px-5 text-[16px] outline-none placeholder:text-text-tertiary focus:border-on-background" />

      <p className={`mt-5 ${rotulo}`}>Pessoas</p>
      <div className="mt-2 flex items-center gap-5">
        <button type="button" aria-label="Menos uma pessoa" disabled={pessoas <= 1} onClick={() => setPessoas((p) => Math.max(1, p - 1))} className="grid h-11 w-11 place-items-center rounded-full border border-divider bg-surface-white text-[20px] disabled:opacity-40 active:scale-95">−</button>
        <span className="min-w-[2ch] text-center text-[30px] font-medium leading-none tabular-nums">{pessoas}</span>
        <button type="button" aria-label="Mais uma pessoa" disabled={pessoas >= cfg.max_pessoas} onClick={() => setPessoas((p) => Math.min(cfg.max_pessoas, p + 1))} className="grid h-11 w-11 place-items-center rounded-full border border-divider bg-surface-white text-[20px] disabled:opacity-40 active:scale-95">+</button>
        <span className="text-[15px] text-text-secondary">{pessoas === 1 ? "pessoa" : "pessoas"}</span>
      </div>

      <p className={`mt-5 ${rotulo}`}>Observação (opcional)</p>
      <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Aniversário, cadeirinha, mesa na área externa..." className="mt-2 min-h-[52px] w-full rounded-full border border-divider bg-surface-white px-5 text-[16px] outline-none placeholder:text-text-tertiary focus:border-on-background" />

      <div className="mt-6 rounded-[22px] bg-surface-white p-4 ring-1 ring-divider">
        <p className="text-[16px] font-semibold">{nome.trim() || "Seu nome"}</p>
        <p className="mt-1 text-[14.5px] text-text-secondary">{resumoData}{hora ? ` às ${rotuloHora(hora)}` : ""}</p>
        <p className="mt-0.5 text-[14.5px] text-text-secondary">{pessoas} {pessoas === 1 ? "pessoa" : "pessoas"}</p>
      </div>

      {erro && <p role="alert" className="mt-3 text-[13px] text-red-600">{erro}</p>}
      <button type="button" onClick={enviar} disabled={!hora || enviando} className="mt-4 min-h-[52px] w-full rounded-full bg-on-background text-[15px] font-semibold text-white active:scale-[0.98] disabled:opacity-45">
        {enviando ? "Enviando…" : hora ? "Enviar pedido de reserva" : "Escolha um horário"}
      </button>
    </div>
  );
}
