"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatFone } from "@/lib/utils";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type LeadSeg = { id: string; name: string | null; whatsapp: string; motivo: string };
type Segmentos = Record<string, LeadSeg[]>;

const SEGMENTOS = [
  { id: "voucher_nao_usado", label: "Pegaram voucher e não usaram", cor: "#C0392B", fundo: "#FDE7E7", icone: "🎟️" },
  { id: "quentes", label: "Quentes sem fechar", cor: "#C2650A", fundo: "#FDEEDF", icone: "🔥" },
  { id: "sumiram", label: "Conversaram e sumiram", cor: "#1D4ED8", fundo: "#E2EAFE", icone: "◷" },
  { id: "querem_novidades", label: "Pediram pra ser avisados", cor: "#1F7A3D", fundo: "#DEF3E3", icone: "✦" },
  { id: "todos", label: "Todos os contatos", cor: "#555960", fundo: "#ECEDE9", icone: "◎" },
] as const;

/**
 * Listas montadas pelo comportamento: quem pegou voucher e não usou, quem
 * esquentou e sumiu, quem pediu aviso. A Orbi escreve a mensagem do grupo
 * e o dono manda um por um do próprio WhatsApp, com o nome já trocado.
 *
 * Não existe disparo automático de propósito: passa pelo WhatsApp do dono,
 * dentro das regras, e cada mensagem sai com cara de mensagem, não de
 * campanha.
 */
export function Segmentos({ businessId, orbiColors, refreshKey = 0 }: { businessId: string; orbiColors?: string[] | null; refreshKey?: number }) {
  const [dados, setDados] = useState<Segmentos | null>(null);
  // Lista e gancho podem chegar pela URL (ex: publicou item na vitrine).
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [aberto, setAberto] = useState<string | null>(params?.get("lista") ?? null);
  const [gancho, setGancho] = useState(params?.get("gancho") ?? "");
  const [mensagem, setMensagem] = useState("");
  const [escrevendo, setEscrevendo] = useState(false);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc("lead_segments", { p_business_id: businessId }).then(({ data }) => {
      setDados((data ?? {}) as Segmentos);
    });
    // refreshKey muda quando um contato é adicionado manualmente, pra essa
    // lista já incluir ele sem precisar recarregar a página inteira.
  }, [businessId, refreshKey]);

  async function escrever(segmento: string) {
    setEscrevendo(true);
    try {
      const r = await fetch("/api/leads/segment-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, segmento, gancho: gancho.trim() || undefined }),
      });
      const d = await r.json();
      if (r.ok && d.mensagem) setMensagem(d.mensagem);
    } finally {
      setEscrevendo(false);
    }
  }

  function personalizar(base: string, nome: string | null) {
    const n = nome?.trim().split(" ")[0];
    return n ? base.replace(/\{nome\}/g, n) : base.replace(/\{nome\},?\s*/g, "Oi, ").replace(/^Oi, Oi/, "Oi");
  }

  if (!dados) {
    return <p className="mt-5 text-[13px] text-text-tertiary">Montando as listas…</p>;
  }

  const seg = SEGMENTOS.find((s) => s.id === aberto);
  const lista = aberto ? dados[aberto] ?? [] : [];

  return (
    <div className="mt-5 flex flex-col gap-3">
      {!aberto ? (
        <>
          <p className="text-[13.5px] leading-relaxed text-text-secondary">
            Listas montadas pelo que cada pessoa fez na sua página. Escolha uma, a Orbi escreve a mensagem, e você manda do seu WhatsApp.
          </p>
          {SEGMENTOS.map((s) => {
            const n = dados[s.id]?.length ?? 0;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setAberto(s.id); setMensagem(""); setGancho(""); setEnviados(new Set()); }}
                disabled={n === 0}
                className="flex w-full cursor-pointer items-center gap-3 rounded-[22px] border border-divider bg-surface-white p-4 text-left disabled:cursor-default disabled:opacity-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px]" style={{ backgroundColor: s.fundo, color: s.cor }}>{s.icone}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-tight">{s.label}</span>
                  <span className="mt-0.5 block text-[12.5px] text-text-tertiary">{n === 0 ? "Ninguém aqui ainda" : `${n} ${n === 1 ? "pessoa" : "pessoas"}`}</span>
                </span>
                {n > 0 && <span className="shrink-0 text-text-tertiary">→</span>}
              </button>
            );
          })}
        </>
      ) : (
        <>
          <button type="button" onClick={() => setAberto(null)} className="cursor-pointer self-start text-[13px] text-text-tertiary hover:underline">← Listas</button>

          <div className="rounded-[24px] border border-divider bg-surface-white p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[17px]" style={{ backgroundColor: seg?.fundo, color: seg?.cor }}>{seg?.icone}</span>
              <div>
                <p className="text-[16px] font-semibold leading-tight">{seg?.label}</p>
                <p className="text-[12.5px] text-text-tertiary">{lista.length} {lista.length === 1 ? "pessoa" : "pessoas"}</p>
              </div>
            </div>

            <input
              value={gancho}
              onChange={(e) => setGancho(e.target.value)}
              placeholder="Gancho (opcional): ex. chegou o vestido verde"
              className="mt-4 w-full rounded-full border border-divider bg-surface-white px-4 py-2.5 text-[13.5px] outline-none focus:border-on-background"
            />

            {!mensagem ? (
              <button
                type="button"
                onClick={() => escrever(aberto)}
                disabled={escrevendo}
                className="orbi-gradient mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-on-background disabled:opacity-60"
              >
                {escrevendo ? (
                  <><span className="h-5 w-5 overflow-hidden rounded-full"><OrbiParticleSphere size={20} colors={orbiColors ?? undefined} className="rounded-full" /></span> Escrevendo…</>
                ) : "✦ Orbi, escreve a mensagem"}
              </button>
            ) : (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Mensagem (edite se quiser)</p>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={4}
                  className="mt-1.5 w-full resize-none rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[14px] leading-relaxed outline-none focus:border-on-background"
                />
                <p className="mt-1 text-[11.5px] text-text-tertiary">{"{nome}"} vira o nome de cada pessoa ao mandar.</p>
                <button type="button" onClick={() => escrever(aberto)} disabled={escrevendo} className="mt-2 cursor-pointer text-[12.5px] text-text-secondary underline">
                  {escrevendo ? "Reescrevendo…" : "Pedir outra versão"}
                </button>
              </div>
            )}
          </div>

          {mensagem && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Mandar um por um</p>
                <p className="text-[11.5px] text-text-tertiary">{enviados.size} de {lista.length}</p>
              </div>
              {lista.map((l) => {
                const feito = enviados.has(l.id);
                const texto = personalizar(mensagem, l.name);
                return (
                  <div key={l.id} className={`flex items-center gap-3 rounded-[20px] border border-divider bg-surface-white px-4 py-3 ${feito ? "opacity-55" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{l.name || formatFone(l.whatsapp)}</p>
                      <p className="truncate text-[12px] text-text-tertiary">{l.motivo}</p>
                    </div>
                    <a
                      href={`https://wa.me/${l.whatsapp}?text=${encodeURIComponent(texto)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setEnviados((s) => new Set(s).add(l.id))}
                      className={`shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-semibold ${feito ? "bg-surface-soft text-text-tertiary" : "bg-[#25D366] text-white"}`}
                    >
                      {feito ? "Enviado ✓" : "☎ Mandar"}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
