"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OrbiSimbolo } from "@/components/orbi/OrbiSimbolo";
import { ResponderPergunta } from "./agent/ResponderPergunta";
import { CampanhaDataSheet } from "./CampanhaDataSheet";

type Gift = { id: string; value_cents: number; from_name: string | null; to_name: string | null };
type Pergunta = { id: string; pergunta: string; vezes: number };
type Data = { id: string; nome: string; dias: number; clima: string };
type VoucherBaixo = { id: string; title: string; restam: number; quantity_total: number };
type Pendencia = { title: string; description: string; ctaLabel: string; href: string };

type Acao =
  | { tipo: "gift"; chave: string; gift: Gift }
  | { tipo: "pergunta"; chave: string; p: Pergunta }
  | { tipo: "data"; chave: string; data: Data }
  | { tipo: "estoque"; chave: string; v: VoucherBaixo }
  | { tipo: "pendencia"; chave: string; p: Pendencia };

const agoraMs = () => Date.now();
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// "Agora não" de uma data comemorativa vale por 3 dias, guardado no aparelho.
const CHAVE_ADIADAS = "orbibox-acoes-adiadas";
function lerAdiadas(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(CHAVE_ADIADAS) || "{}"); } catch { return {}; }
}
const assinar = (cb: () => void) => { window.addEventListener("storage", cb); window.addEventListener(CHAVE_ADIADAS, cb); return () => { window.removeEventListener("storage", cb); window.removeEventListener(CHAVE_ADIADAS, cb); }; };
function adiar(chave: string, dias: number) {
  try {
    const a = lerAdiadas();
    a[chave] = Date.now() + dias * 86400000;
    localStorage.setItem(CHAVE_ADIADAS, JSON.stringify(a));
  } catch { /* sem storage, vale só nesta visita */ }
  window.dispatchEvent(new Event(CHAVE_ADIADAS));
}

/**
 * A próxima ação: em vez de um painel cheio, o painel mostra a coisa mais
 * importante pra fazer agora, já resolvível ali, num toque. Feita (ou
 * deixada pra depois), aparece a próxima.
 */
export function ProximaAcao({
  businessId,
  hasVouchers,
  gifts,
  perguntas,
  data,
  vouchersBaixos,
  pendencia,
}: {
  businessId: string;
  hasVouchers: boolean;
  gifts: Gift[];
  perguntas: Pergunta[];
  data: Data | null;
  vouchersBaixos: VoucherBaixo[];
  pendencia: Pendencia | null;
}) {
  const supabase = createClient();
  const adiadasRaw = useSyncExternalStore(assinar, () => localStorage.getItem(CHAVE_ADIADAS) ?? "{}", () => "{}");
  const [feitas, setFeitas] = useState<Set<string>>(new Set());
  const [puladas, setPuladas] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [folha, setFolha] = useState<Data | null>(null);
  const [concluida, setConcluida] = useState<string | null>(null);
  const [ensinou, setEnsinou] = useState<string | null>(null);

  const acoes = useMemo(() => {
    let adiadas: Record<string, number> = {};
    try { adiadas = JSON.parse(adiadasRaw); } catch { /* vazio */ }
    const agora = agoraMs();
    const lista: Acao[] = [
      ...gifts.map((g) => ({ tipo: "gift" as const, chave: `gift-${g.id}`, gift: g })),
      ...perguntas.slice(0, 3).map((p) => ({ tipo: "pergunta" as const, chave: `perg-${p.id}`, p })),
      ...(data ? [{ tipo: "data" as const, chave: `data-${data.id}`, data }] : []),
      ...vouchersBaixos.map((v) => ({ tipo: "estoque" as const, chave: `est-${v.id}`, v })),
      ...(pendencia ? [{ tipo: "pendencia" as const, chave: `pend-${pendencia.href}`, p: pendencia }] : []),
    ];
    const vivas = lista.filter((a) => !feitas.has(a.chave) && !(adiadas[a.chave] && adiadas[a.chave] > agora));
    // As puladas vão pro fim da fila, na ordem em que foram puladas.
    return [...vivas.filter((a) => !puladas.includes(a.chave)), ...puladas.map((k) => vivas.find((a) => a.chave === k)).filter((a): a is Acao => !!a)];
  }, [gifts, perguntas, data, vouchersBaixos, pendencia, feitas, puladas, adiadasRaw]);

  const atual = acoes[0];

  function concluir(chave: string, mensagem: string) {
    setConcluida(mensagem);
    setTimeout(() => {
      setFeitas((s) => new Set(s).add(chave));
      setConcluida(null);
    }, 1400);
  }

  function pular(chave: string) {
    setPuladas((p) => [...p.filter((k) => k !== chave), chave]);
  }

  async function liberarGift(g: Gift, chave: string) {
    setOcupado(true);
    const { error } = await supabase.from("gift_cards").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", g.id).eq("status", "pending");
    setOcupado(false);
    if (!error) concluir(chave, "Gift liberado. A arte já está pronta pra quem vai ganhar.");
  }

  async function repor(v: VoucherBaixo, chave: string) {
    setOcupado(true);
    const { error } = await supabase.from("vouchers").update({ quantity_total: v.quantity_total + 20 }).eq("id", v.id);
    setOcupado(false);
    if (!error) concluir(chave, `Mais 20 unidades de "${v.title}" no ar.`);
  }

  if (!atual && !concluida) return null;

  const total = acoes.length;

  return (
    <section aria-label="Próxima ação" className="mt-3">
      <div className="rounded-[22px] bg-surface-white p-4 shadow-[0_18px_40px_-28px_rgba(17,19,24,.35)]">
        <div className="flex items-center gap-2.5">
          <OrbiSimbolo size={22} />
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Agora</p>
          {total > 1 && !concluida && (
            <p className="ml-auto text-[12px] tabular-nums text-text-tertiary" aria-label={`${total} coisas pra fazer`}>1 de {total}</p>
          )}
        </div>

        {concluida ? (
          <div key="ok" className="acao-entra mt-3 flex items-start gap-3" aria-live="polite">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F9E4C]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
            <p className="text-[15px] font-medium leading-snug">{concluida}</p>
          </div>
        ) : atual ? (
          <div key={atual.chave} className="acao-entra mt-3">
            {atual.tipo === "gift" && (
              <>
                <p className="text-[15.5px] font-medium leading-snug">
                  {atual.gift.from_name ? `${atual.gift.from_name} montou` : "Um cliente montou"} um gift de {brl(atual.gift.value_cents)}
                  {atual.gift.to_name ? ` pra ${atual.gift.to_name}` : ""}.
                </p>
                <p className="mt-1 text-[13px] leading-snug text-text-secondary">Recebeu o pagamento? Libere e a arte fica pronta na hora.</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={ocupado} onClick={() => liberarGift(atual.gift, atual.chave)} className="min-h-[42px] flex-1 rounded-full bg-[#1F9E4C] text-[14px] font-medium text-white transition-transform active:scale-[.98] disabled:opacity-50">
                    {ocupado ? "Liberando…" : "Liberar gift"}
                  </button>
                  <button type="button" onClick={() => pular(atual.chave)} className="min-h-[42px] rounded-full bg-surface-soft px-5 text-[14px] text-text-secondary">Depois</button>
                </div>
              </>
            )}

            {atual.tipo === "pergunta" && (
              <>
                <ResponderPergunta id={atual.p.id} pergunta={atual.p.pergunta} vezes={atual.p.vezes} compacto onEnsinado={() => { setEnsinou(atual.chave); setTimeout(() => setFeitas((s) => new Set(s).add(atual.chave)), 1800); }} />
                {ensinou !== atual.chave && (
                  <button type="button" onClick={() => pular(atual.chave)} className="mt-3 min-h-[40px] text-[13px] text-text-tertiary underline underline-offset-4">Responder depois</button>
                )}
              </>
            )}

            {atual.tipo === "data" && (
              <>
                <p className="text-[15.5px] font-medium leading-snug">
                  {atual.data.nome} {atual.data.dias === 0 ? "é hoje" : atual.data.dias === 1 ? "é amanhã" : `em ${atual.data.dias} dias`}.
                </p>
                <p className="mt-1 text-[13px] leading-snug text-text-secondary">A Orbi monta um voucher da data e os textos pra divulgar, com a cara do seu negócio.</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setFolha(atual.data)} className="min-h-[42px] flex-1 rounded-full bg-on-background text-[14px] font-medium text-white transition-transform active:scale-[.98]">
                    Ver campanha pronta
                  </button>
                  <button type="button" onClick={() => adiar(atual.chave, 3)} className="min-h-[42px] rounded-full bg-surface-soft px-5 text-[14px] text-text-secondary">Agora não</button>
                </div>
              </>
            )}

            {atual.tipo === "estoque" && (
              <>
                <p className="text-[15.5px] font-medium leading-snug">
                  {atual.v.restam === 0 ? `"${atual.v.title}" esgotou.` : `Só ${atual.v.restam === 1 ? "resta 1 unidade" : `restam ${atual.v.restam} unidades`} de "${atual.v.title}".`}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-text-secondary">Esse voucher está funcionando. Quer manter ele no ar?</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={ocupado} onClick={() => repor(atual.v, atual.chave)} className="min-h-[42px] flex-1 rounded-full bg-on-background text-[14px] font-medium text-white transition-transform active:scale-[.98] disabled:opacity-50">
                    {ocupado ? "Salvando…" : "Mais 20 unidades"}
                  </button>
                  <button type="button" onClick={() => pular(atual.chave)} className="min-h-[42px] rounded-full bg-surface-soft px-5 text-[14px] text-text-secondary">Depois</button>
                </div>
              </>
            )}

            {atual.tipo === "pendencia" && (
              <>
                <p className="text-[15.5px] font-medium leading-snug">{atual.p.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-text-secondary">{atual.p.description}</p>
                <div className="mt-3 flex gap-2">
                  <Link href={atual.p.href} className="flex min-h-[42px] flex-1 items-center justify-center rounded-full bg-on-background text-[14px] font-medium text-white">{atual.p.ctaLabel}</Link>
                  {total > 1 && <button type="button" onClick={() => pular(atual.chave)} className="min-h-[42px] rounded-full bg-surface-soft px-5 text-[14px] text-text-secondary">Depois</button>}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {folha && (
        <CampanhaDataSheet
          businessId={businessId}
          data={folha}
          hasVouchers={hasVouchers}
          onClose={() => setFolha(null)}
          onAtivada={() => adiar(`data-${folha.id}`, 60)}
        />
      )}
    </section>
  );
}
