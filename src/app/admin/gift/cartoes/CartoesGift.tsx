"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import { AtendenteModal } from "@/components/ui/AtendenteModal";
import { GiftArt } from "@/components/mobile/GiftArt";
import { BotaoCompartilhar } from "@/components/compartilhar/Compartilhar";
import { AvisoGiftLiberado } from "../AvisoGiftLiberado";
import { origemPublica } from "@/lib/appUrl";
import { linkWhatsPresenteado, textoParaPresenteado } from "@/lib/giftAviso";

type Gift = {
  id: string; code: string; buyer_whatsapp: string | null; value_cents: number; from_name: string | null; to_name: string | null;
  message: string | null; status: string; created_at: string; used_at: string | null; liberado_por: string | null; usado_por: string | null;
};

const ABAS = [
  { id: "todos", rotulo: "Todos" },
  { id: "pending", rotulo: "A liberar" },
  { id: "paid", rotulo: "Liberados" },
  { id: "used", rotulo: "Usados" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const STATUS: Record<string, { label: string; cor: string; fundo: string }> = {
  pending: { label: "A liberar", cor: "#C2650A", fundo: "#FDEEDF" },
  paid: { label: "Liberado", cor: "#1F9E4C", fundo: "#E5F5EA" },
  used: { label: "Usado", cor: "#5B6270", fundo: "#EEF0F3" },
  canceled: { label: "Cancelado", cor: "#B3261E", fundo: "#FCE4E1" },
};

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export function CartoesGift({ negocioNome, artUrl, artTheme, gifts: giftsIniciais }: { negocioNome: string; artUrl: string | null; artTheme: string | null; gifts: Gift[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [gifts, setGifts] = useState<Gift[]>(giftsIniciais);
  const [pedirNome, setPedirNome] = useState<Gift | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState<Aba>("todos");
  const [busca, setBusca] = useState("");
  const [enviar, setEnviar] = useState<Gift | null>(null);
  const [avisar, setAvisar] = useState<Gift | null>(null);

  async function liberar(g: Gift, atendente: string) {
    setSalvando(true);
    const res = await supabase.from("gift_cards").update({ status: "paid", paid_at: new Date().toISOString(), liberado_por: atendente }).eq("id", g.id).eq("status", "pending");
    setSalvando(false);
    setPedirNome(null);
    if (!conferirSalvo(res)) return;
    const novo = { ...g, status: "paid", liberado_por: atendente };
    setGifts((prev) => prev.map((x) => (x.id === g.id ? novo : x)));
    setAvisar(novo);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function cancelar(g: Gift) {
    if (!window.confirm("Cancelar este gift? Ele não poderá mais ser liberado.")) return;
    const res = await supabase.from("gift_cards").update({ status: "canceled" }).eq("id", g.id).eq("status", "pending");
    if (!conferirSalvo(res)) return;
    setGifts((prev) => prev.map((x) => (x.id === g.id ? { ...x, status: "canceled" } : x)));
  }

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todos: gifts.length, pending: 0, paid: 0, used: 0 };
    for (const g of gifts) if (g.status in c) c[g.status]++;
    return c;
  }, [gifts]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return gifts.filter((g) => (aba === "todos" || g.status === aba) && (!q || [g.code, g.to_name, g.from_name].some((x) => (x ?? "").toLowerCase().includes(q))));
  }, [gifts, aba, busca]);

  return (
    <div className="mt-5 flex flex-col gap-4">
      {avisar && <AvisoGiftLiberado gift={avisar} negocio={negocioNome} aoFechar={() => setAvisar(null)} />}

      <div role="tablist" aria-label="Filtrar cartões" className="flex gap-1.5 overflow-x-auto pb-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`min-h-[40px] shrink-0 rounded-full px-4 text-[13.5px] font-medium transition-colors ${aba === a.id ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
          >
            {a.rotulo} <span className="tabular-nums opacity-70">{contagem[a.id]}</span>
          </button>
        ))}
      </div>

      {gifts.length > 6 && (
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código"
          aria-label="Buscar cartão"
          className="min-h-[46px] w-full rounded-full border border-divider bg-surface-white px-5 text-[15px] outline-none focus:border-on-background"
        />
      )}

      {lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-divider px-4 py-8 text-center">
          <p className="text-[14px] font-medium">{gifts.length === 0 ? "Nenhum cartão ainda" : "Nada por aqui"}</p>
          <p className="mx-auto mt-1 max-w-[280px] text-[12.5px] leading-snug text-text-secondary">
            {gifts.length === 0 ? "Assim que um cliente montar um gift, ele aparece aqui." : "Troque o filtro para ver os outros cartões."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-5">
          {lista.map((g) => {
            const st = STATUS[g.status] ?? STATUS.pending;
            const liberado = g.status === "paid";
            return (
              <li key={g.id} className="rounded-[26px] bg-surface-white p-3 ring-1 ring-divider">
                <div className={g.status === "used" || g.status === "canceled" ? "opacity-60 grayscale-[35%]" : undefined}>
                  <GiftArt
                    valorCents={g.value_cents}
                    paraQuem={g.to_name}
                    deQuem={g.from_name}
                    mensagem={g.message}
                    negocio={negocioNome}
                    codigo={g.code}
                    artUrl={artUrl}
                    artTheme={artTheme}
                    bloqueado={g.status === "pending"}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 px-1">
                  <span className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: st.cor, backgroundColor: st.fundo }}>{st.label}</span>
                  <p className="truncate text-[12px] text-text-tertiary">
                    Gerado {quando(g.created_at)}
                    {g.liberado_por ? ` · Liberado por ${g.liberado_por}` : ""}
                    {g.status === "used" && g.used_at ? ` · Usado ${quando(g.used_at)}${g.usado_por ? ` por ${g.usado_por}` : ""}` : ""}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 px-1 pb-1">
                  {g.status === "pending" && (
                    <>
                      <button onClick={() => setPedirNome(g)} className="flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#1F9E4C] px-5 text-[14px] font-semibold text-white">Liberar (pagamento recebido)</button>
                      <button onClick={() => void cancelar(g)} className="min-h-[44px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary">Cancelar</button>
                    </>
                  )}
                  {liberado && (
                    <>
                      <button onClick={() => setEnviar(g)} className="flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#1F9E4C] px-5 text-[14px] font-semibold text-white">
                        Enviar ao presenteado{g.to_name ? ` (${g.to_name})` : ""}
                      </button>
                      <button onClick={() => setAvisar(g)} className="min-h-[44px] rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary">Avisar quem comprou</button>
                    </>
                  )}
                  {(liberado || g.status === "used") && (
                    <Link href={`/gift/${g.code}?de=/admin/gift/cartoes`} className="flex min-h-[44px] items-center rounded-full bg-surface-soft px-4 text-[13.5px] font-medium text-text-secondary">Ver cartão</Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pedirNome && (
        <AtendenteModal
          titulo="Quem está liberando?"
          descricao="Seu nome fica gravado junto com a liberação deste gift. O dono vê quem liberou cada um."
          confirmar="Liberar gift"
          ocupado={salvando}
          onCancelar={() => setPedirNome(null)}
          onConfirmar={(nome) => void liberar(pedirNome, nome)}
        />
      )}
      {enviar && <EnviarFolha gift={enviar} negocio={negocioNome} aoFechar={() => setEnviar(null)} />}
    </div>
  );
}

function EnviarFolha({ gift, negocio, aoFechar }: { gift: Gift; negocio: string; aoFechar: () => void }) {
  const [fone, setFone] = useState("");
  const [copiado, setCopiado] = useState(false);
  const origin = origemPublica();
  const href = linkWhatsPresenteado(gift, negocio, origin, fone);
  const link = `${origin}/gift/${gift.code}`;

  async function copiar() {
    try { await navigator.clipboard.writeText(textoParaPresenteado(gift, negocio, origin)); setCopiado(true); window.setTimeout(() => setCopiado(false), 1800); } catch { /* sem clipboard */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={aoFechar}>
      <div role="dialog" aria-modal="true" aria-label="Enviar cartão ao presenteado" onClick={(e) => e.stopPropagation()} className="w-full max-w-[460px] rounded-t-[28px] bg-background-main p-5 pb-8 sm:rounded-[28px]">
        <p className="font-[family-name:var(--font-manrope)] text-[20px] font-semibold leading-tight">Enviar para {gift.to_name || "quem ganhou"}</p>
        <p className="mt-1.5 text-[13.5px] leading-snug text-text-secondary">A mensagem leva o link do cartão. Se souber o WhatsApp, coloque aqui. Se não, o WhatsApp deixa você escolher o contato.</p>
        <input
          value={fone}
          onChange={(e) => setFone(e.target.value)}
          placeholder="WhatsApp de quem ganhou (opcional)"
          inputMode="tel"
          aria-label="WhatsApp de quem ganhou"
          className="mt-4 min-h-[52px] w-full rounded-full border border-divider bg-surface-white px-5 text-[16px] outline-none focus:border-on-background"
        />
        <a href={href} target="_blank" rel="noreferrer" onClick={() => window.setTimeout(aoFechar, 400)} className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#25D366] text-[15px] font-semibold text-white active:scale-[.98]">
          Enviar pelo WhatsApp
        </a>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={copiar} className="min-h-[46px] flex-1 rounded-full bg-surface-soft text-[14px] font-medium text-text-secondary">{copiado ? "Mensagem copiada" : "Copiar mensagem"}</button>
          <BotaoCompartilhar
            alvo={{ url: link, titulo: "Gift card", rotulo: "Gift card", marca: negocio, capa: `/gift/${gift.code}/capa`, texto: `${gift.from_name ? gift.from_name + " te enviou" : "Você ganhou"} um presente de ${negocio}:` }}
            className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full bg-surface-soft text-[14px] font-medium text-text-secondary"
            tam={16}
          >
            <span>Compartilhar</span>
          </BotaoCompartilhar>
        </div>
        <button type="button" onClick={aoFechar} className="mt-3 w-full text-center text-[13.5px] text-text-tertiary underline underline-offset-4">Fechar</button>
      </div>
    </div>
  );
}
