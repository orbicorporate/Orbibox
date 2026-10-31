"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";

type Cfg = { dias: number[]; abre: string; fecha: string; intervalo_min: number; capacidade: number | null; max_pessoas: number; dias_a_frente: number; antecedencia_min: number };
type Reserva = { id: string; nome: string; whatsapp: string | null; data: string; hora: string; pessoas: number; obs: string | null; status: string };

const PADRAO: Cfg = { dias: [0, 1, 2, 3, 4, 5, 6], abre: "12:00", fecha: "22:30", intervalo_min: 30, capacidade: null, max_pessoas: 12, dias_a_frente: 30, antecedencia_min: 60 };
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DIAS_NOME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const STATUS: Record<string, { rotulo: string; cor: string }> = {
  pendente: { rotulo: "Pendente", cor: "bg-[#FFF3E0] text-[#C2650A]" },
  confirmada: { rotulo: "Confirmada", cor: "bg-[#E6F4EA] text-[#1F7A45]" },
  recusada: { rotulo: "Recusada", cor: "bg-surface-soft text-text-tertiary" },
  compareceu: { rotulo: "Compareceu", cor: "bg-[#E6F4EA] text-[#1F7A45]" },
  faltou: { rotulo: "Faltou", cor: "bg-[#FDECEC] text-[#B42318]" },
  cancelada: { rotulo: "Cancelada", cor: "bg-surface-soft text-text-tertiary" },
};
const pad = (n: number) => String(n).padStart(2, "0");
const hojeBR = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
const rotuloHora = (h: string) => { const [hh, mm] = h.split(":"); return mm === "00" ? `${Number(hh)}h` : `${Number(hh)}h${mm}`; };

function rotuloDia(iso: string, hoje: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const base = `${DIAS_NOME[dt.getDay()]}, ${pad(d)}/${pad(m)}`;
  if (iso === hoje) return `Hoje, ${base}`;
  const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
  if (iso === new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(amanha)) return `Amanhã, ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function zap(r: Reserva, negocio: string, status: string) {
  if (!r.whatsapp) return null;
  const dia = rotuloDia(r.data, hojeBR()).toLowerCase();
  const quando = `${dia} às ${rotuloHora(r.hora)}, para ${r.pessoas} ${r.pessoas === 1 ? "pessoa" : "pessoas"}`;
  const txt = status === "recusada"
    ? `Oi, ${r.nome}! Aqui é do ${negocio}. Infelizmente não conseguimos sua reserva de ${quando}. Quer tentar outro horário?`
    : `Oi, ${r.nome}! Aqui é do ${negocio}. Sua reserva está confirmada: ${quando}. Te esperamos!`;
  const num = r.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${num.length <= 11 ? "55" + num : num}?text=${encodeURIComponent(txt)}`;
}

export function ReservasEditor({ businessId, nomeNegocio, boxId: boxInicial, ativo: ativoInicial, totalBoxes, config, reservas: iniciais }: { businessId: string; nomeNegocio: string; boxId: string | null; ativo: boolean; totalBoxes: number; config: Cfg | null; reservas: Reserva[] }) {
  const supabase = useRef(createClient()).current;
  const [boxId, setBoxId] = useState(boxInicial);
  const [ativo, setAtivo] = useState(ativoInicial);
  const [cfg, setCfg] = useState<Cfg>({ ...PADRAO, ...(config ?? {}) });
  const [lista, setLista] = useState<Reserva[]>(iniciais);
  const [aba, setAba] = useState<"proximas" | "config">("proximas");
  const [criando, setCriando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoje = hojeBR();

  async function ativar() {
    setCriando(true);
    const novo = { label: "Reserve sua mesa", subtitle: "Escolha dia e horário", icon: "🍽️", action: "reserva", color: "transparent" };
    const { data, error } = await supabase.from("smart_boxes").insert({ business_id: businessId, box_type: "custom", title: "Reserve sua mesa", position: totalBoxes, is_active: true, config: novo }).select("id").single();
    if (!error && data) {
      setBoxId(data.id);
      await supabase.from("reservas_config").upsert({ business_id: businessId, ...cfg });
    }
    setCriando(false);
  }

  async function alternar() {
    if (!boxId) return;
    const v = !ativo;
    setAtivo(v);
    const res = await supabase.from("smart_boxes").update({ is_active: v }).eq("id", boxId);
    if (!conferirSalvo(res)) setAtivo(!v);
  }

  function mudarCfg(parte: Partial<Cfg>) {
    const novo = { ...cfg, ...parte };
    setCfg(novo);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      conferirSalvo(await supabase.from("reservas_config").upsert({ business_id: businessId, ...novo, updated_at: new Date().toISOString() }));
    }, 600);
  }

  async function marcar(r: Reserva, status: string) {
    const antes = r.status;
    setLista((l) => l.map((x) => (x.id === r.id ? { ...x, status } : x)));
    const res = await supabase.from("reservas").update({ status, updated_at: new Date().toISOString() }).eq("id", r.id);
    if (!conferirSalvo(res)) setLista((l) => l.map((x) => (x.id === r.id ? { ...x, status: antes } : x)));
  }

  const grupos = useMemo(() => {
    const proximas = lista.filter((r) => r.data >= hoje);
    const mapa = new Map<string, Reserva[]>();
    proximas.forEach((r) => mapa.set(r.data, [...(mapa.get(r.data) ?? []), r]));
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [lista, hoje]);
  const pendentes = lista.filter((r) => r.status === "pendente" && r.data >= hoje).length;

  const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14.5px] outline-none focus:border-on-background";

  return (
    <div className="flex flex-col pb-10">
      <Link href="/admin/cardapio" className="mt-2 text-[14px] text-text-tertiary hover:underline">← Cardápio</Link>
      <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.02em]">Reservas</h1>
      <p className="mt-1 text-[14px] leading-snug text-text-secondary">Um botão na sua página para o cliente escolher dia, horário e número de pessoas. O pedido chega aqui e no seu WhatsApp.</p>

      {!boxId ? (
        <button type="button" onClick={ativar} disabled={criando} className="mt-6 min-h-[52px] rounded-full bg-gradient-to-r from-[#8E1236] to-[#C2185B] px-6 text-[15px] font-semibold text-white disabled:opacity-60">
          {criando ? "Ligando..." : "Ligar reservas"}
        </button>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between rounded-[22px] bg-surface-white px-4 py-3 ring-1 ring-black/[0.06]">
            <span>
              <span className="block text-[15px] font-semibold">Botão na página</span>
              <span className="block text-[12.5px] text-text-tertiary">{ativo ? "Visível para seus clientes" : "Desligado"}</span>
            </span>
            <button type="button" role="switch" aria-checked={ativo} onClick={alternar} className={`relative h-8 w-14 rounded-full transition-colors ${ativo ? "bg-[#1F7A45]" : "bg-divider"}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${ativo ? "left-7" : "left-1"}`} />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            {([["proximas", pendentes ? `Próximas (${pendentes} novas)` : "Próximas"], ["config", "Horários"]] as const).map(([id, nome]) => (
              <button key={id} type="button" onClick={() => setAba(id)} className={`min-h-[40px] rounded-full px-4 text-[14px] font-medium ${aba === id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{nome}</button>
            ))}
          </div>

          {aba === "proximas" && (
            <div className="mt-4 flex flex-col gap-5">
              {grupos.length === 0 && <p className="rounded-[22px] bg-surface-soft px-4 py-6 text-center text-[14px] text-text-tertiary">Nenhuma reserva por enquanto. Quando alguém reservar, aparece aqui.</p>}
              {grupos.map(([dia, itens]) => (
                <section key={dia}>
                  <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">{rotuloDia(dia, hoje)} · {itens.reduce((s, r) => s + (r.status === "recusada" || r.status === "cancelada" ? 0 : r.pessoas), 0)} pessoas</h2>
                  <div className="flex flex-col gap-2">
                    {itens.map((r) => {
                      const st = STATUS[r.status] ?? STATUS.pendente;
                      const link = zap(r, nomeNegocio, r.status === "recusada" ? "recusada" : "confirmada");
                      return (
                        <div key={r.id} className="rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.06]">
                          <div className="flex items-start justify-between gap-3">
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-semibold">{r.nome}</span>
                              <span className="block text-[13px] text-text-secondary">{rotuloHora(r.hora)} · {r.pessoas} {r.pessoas === 1 ? "pessoa" : "pessoas"}</span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${st.cor}`}>{st.rotulo}</span>
                          </div>
                          {r.obs && <p className="mt-2 text-[13px] leading-snug text-text-secondary">{r.obs}</p>}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {r.status === "pendente" && (
                              <>
                                <button type="button" onClick={() => marcar(r, "confirmada")} className="min-h-[40px] rounded-full bg-on-background px-4 text-[13.5px] font-semibold text-white">Confirmar</button>
                                <button type="button" onClick={() => marcar(r, "recusada")} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary">Recusar</button>
                              </>
                            )}
                            {r.status === "confirmada" && (
                              <>
                                <button type="button" onClick={() => marcar(r, "compareceu")} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium">Compareceu</button>
                                <button type="button" onClick={() => marcar(r, "faltou")} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary">Faltou</button>
                                <button type="button" onClick={() => marcar(r, "cancelada")} className="min-h-[40px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary">Cancelar</button>
                              </>
                            )}
                            {link && (r.status === "pendente" || r.status === "confirmada" || r.status === "recusada") && (
                              <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center rounded-full border border-divider px-4 text-[13.5px] font-medium">Avisar pelo WhatsApp</a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {aba === "config" && (
            <div className="mt-4 flex flex-col gap-5">
              <div>
                <p className="mb-2 text-[13.5px] font-semibold">Dias que atende</p>
                <div className="flex gap-2">
                  {DIAS.map((d, i) => {
                    const on = cfg.dias.includes(i);
                    return (
                      <button key={i} type="button" aria-label={DIAS_NOME[i]} aria-pressed={on} onClick={() => mudarCfg({ dias: on ? cfg.dias.filter((x) => x !== i) : [...cfg.dias, i].sort() })} className={`h-11 w-11 rounded-full text-[14px] font-semibold ${on ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{d}</button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[13px] font-semibold">Abre às<input type="time" value={cfg.abre} onChange={(e) => e.target.value && mudarCfg({ abre: e.target.value })} className={`${campo} mt-1.5 font-normal`} /></label>
                <label className="block text-[13px] font-semibold">Último horário<input type="time" value={cfg.fecha} onChange={(e) => e.target.value && mudarCfg({ fecha: e.target.value })} className={`${campo} mt-1.5 font-normal`} /></label>
              </div>
              <div>
                <p className="mb-2 text-[13.5px] font-semibold">Intervalo entre horários</p>
                <div className="flex gap-2">
                  {[15, 30, 60].map((m) => (
                    <button key={m} type="button" onClick={() => mudarCfg({ intervalo_min: m })} className={`min-h-[40px] rounded-full px-4 text-[14px] font-medium ${cfg.intervalo_min === m ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}>{m} min</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[13px] font-semibold">Pessoas por horário<input type="number" inputMode="numeric" min={1} placeholder="Sem limite" value={cfg.capacidade ?? ""} onChange={(e) => mudarCfg({ capacidade: e.target.value ? Math.max(1, Number(e.target.value)) : null })} className={`${campo} mt-1.5 font-normal`} /></label>
                <label className="block text-[13px] font-semibold">Máx. por reserva<input type="number" inputMode="numeric" min={1} value={cfg.max_pessoas} onChange={(e) => mudarCfg({ max_pessoas: Math.max(1, Number(e.target.value) || 1) })} className={`${campo} mt-1.5 font-normal`} /></label>
                <label className="block text-[13px] font-semibold">Dias à frente<input type="number" inputMode="numeric" min={1} max={90} value={cfg.dias_a_frente} onChange={(e) => mudarCfg({ dias_a_frente: Math.min(90, Math.max(1, Number(e.target.value) || 1)) })} className={`${campo} mt-1.5 font-normal`} /></label>
                <label className="block text-[13px] font-semibold">Antecedência (min)<input type="number" inputMode="numeric" min={0} step={15} value={cfg.antecedencia_min} onChange={(e) => mudarCfg({ antecedencia_min: Math.max(0, Number(e.target.value) || 0) })} className={`${campo} mt-1.5 font-normal`} /></label>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
