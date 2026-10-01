"use client";

import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type GiftAchado = { id: string; code: string; value_cents: number; from_name: string | null; to_name: string | null; status: string; used_at: string | null };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const quando = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

/** Os 6 caracteres do código, aceitando com ou sem o "GIFT-", espaço ou minúscula. */
function normalizar(v: string) {
  return v.toUpperCase().replace(/^GIFT/, "").replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/**
 * Validação no balcão: quem ganhou mostra o gift, o atendente digita o
 * código, confere valor e destinatário e marca como usado. Um gift usado
 * não passa de novo; um gift não pago ou cancelado avisa pra não aceitar.
 */
export function ValidarGift({ businessId, onUsado }: { businessId: string; onUsado: (id: string, usedAt: string) => void }) {
  const supabase = createClient();
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [achado, setAchado] = useState<GiftAchado | null>(null);
  const [naoAchou, setNaoAchou] = useState(false);
  const [acabouDeUsar, setAcabouDeUsar] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  async function conferir(e: FormEvent) {
    e.preventDefault();
    if (codigo.length < 6 || buscando) return;
    setBuscando(true);
    setAchado(null);
    setNaoAchou(false);
    setAcabouDeUsar(false);
    const { data } = await supabase
      .from("gift_cards")
      .select("id, code, value_cents, from_name, to_name, status, used_at")
      .eq("business_id", businessId)
      .eq("code", `GIFT-${codigo}`)
      .maybeSingle();
    setBuscando(false);
    if (data) setAchado(data as GiftAchado);
    else setNaoAchou(true);
  }

  async function marcarUsado() {
    if (!achado || marcando) return;
    setMarcando(true);
    const agora = new Date().toISOString();
    // Só vira "usado" se ainda estiver liberado: dois atendentes ao mesmo
    // tempo não conseguem usar o mesmo gift duas vezes.
    const { data } = await supabase
      .from("gift_cards")
      .update({ status: "used", used_at: agora })
      .eq("id", achado.id)
      .eq("status", "paid")
      .select("status, used_at")
      .maybeSingle();
    setMarcando(false);
    if (data) {
      setAchado({ ...achado, status: "used", used_at: data.used_at ?? agora });
      setAcabouDeUsar(true);
      onUsado(achado.id, data.used_at ?? agora);
    } else {
      // Alguém usou antes: recarrega pra mostrar o estado real.
      const { data: atual } = await supabase.from("gift_cards").select("id, code, value_cents, from_name, to_name, status, used_at").eq("id", achado.id).maybeSingle();
      if (atual) setAchado(atual as GiftAchado);
    }
  }

  function limpar() {
    setCodigo("");
    setAchado(null);
    setNaoAchou(false);
    setAcabouDeUsar(false);
    campo.current?.focus();
  }

  const quem = achado ? [achado.to_name && `Para ${achado.to_name}`, achado.from_name && `de ${achado.from_name}`].filter(Boolean).join(", ") : "";

  return (
    <section className="rounded-[26px] bg-surface-white p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#EEF7F0]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F7A3D" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="font-[family-name:var(--font-manrope)] text-[19px] font-semibold leading-tight tracking-[-0.01em]">Validar gift</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">Cliente chegou com um gift? Digite o código que aparece na tela dele.</p>
        </div>
      </div>

      <form onSubmit={conferir} className="mt-6">
        <label className="flex h-[60px] items-center gap-1 rounded-[18px] border border-divider bg-surface-soft px-5 transition-colors focus-within:border-on-background focus-within:bg-surface-white">
          <span className="font-mono text-[19px] tracking-[0.12em] text-text-tertiary">GIFT-</span>
          <input
            ref={campo}
            value={codigo}
            onChange={(e) => { setCodigo(normalizar(e.target.value)); setAchado(null); setNaoAchou(false); }}
            placeholder="••••••"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            aria-label="Código do gift"
            className="min-w-0 flex-1 bg-transparent font-mono text-[19px] tracking-[0.12em] outline-none placeholder:text-text-tertiary/60"
          />
        </label>
        <button
          type="submit"
          disabled={codigo.length < 6 || buscando}
          className="mt-3 h-[52px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white transition-opacity disabled:opacity-35"
        >
          {buscando ? "Conferindo…" : "Conferir"}
        </button>
      </form>

      {naoAchou && (
        <Resultado tom="neutro" titulo="Código não encontrado" texto="Confira se digitou certo. O código fica embaixo da arte, na tela do cliente." onLimpar={limpar} />
      )}

      {achado && (
        <div className="mt-6">
          {achado.status === "paid" && (
            <div className="rounded-[22px] bg-[#EEF7F0] p-6 text-center">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#1F7A3D]">Gift válido</p>
              <p className="mt-3 font-[family-name:var(--font-manrope)] text-[40px] font-semibold leading-none tracking-[-0.02em]">{brl(achado.value_cents)}</p>
              {quem && <p className="mt-3 text-[14px] text-text-secondary">{quem}</p>}
              <p className="mt-1 font-mono text-[12.5px] tracking-wider text-text-tertiary">{achado.code}</p>
              <button
                onClick={marcarUsado}
                disabled={marcando}
                className="mt-6 h-[52px] w-full rounded-full bg-[#1F9E4C] text-[15px] font-medium text-white disabled:opacity-50"
              >
                {marcando ? "Registrando…" : "Marcar como usado"}
              </button>
              <p className="mt-3 text-[12px] leading-snug text-text-tertiary">Use depois de entregar a compra. Não dá pra desfazer.</p>
            </div>
          )}

          {achado.status === "used" && (
            acabouDeUsar ? (
              <div className="rounded-[22px] bg-[#EEF7F0] p-6 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1F9E4C]">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
                <p className="mt-4 font-[family-name:var(--font-manrope)] text-[19px] font-semibold">Pronto, gift usado</p>
                <p className="mt-1.5 text-[13.5px] text-text-secondary">{brl(achado.value_cents)}{quem ? `, ${quem.charAt(0).toLowerCase()}${quem.slice(1)}` : ""}. Registrado {achado.used_at ? quando(achado.used_at) : "agora"}.</p>
                <button onClick={limpar} className="mt-6 h-[48px] w-full rounded-full bg-surface-white text-[14px] font-medium">Validar outro</button>
              </div>
            ) : (
              <Resultado
                tom="alerta"
                titulo="Esse gift já foi usado"
                texto={`${brl(achado.value_cents)}${achado.used_at ? `, usado em ${quando(achado.used_at)}` : ""}. Não aceite de novo.`}
                onLimpar={limpar}
              />
            )
          )}

          {achado.status === "pending" && (
            <Resultado tom="atencao" titulo="Ainda não foi pago" texto={`${brl(achado.value_cents)}. Esse gift só vale depois que você receber e tocar em Liberar, na lista abaixo.`} onLimpar={limpar} />
          )}

          {achado.status === "canceled" && (
            <Resultado tom="alerta" titulo="Gift cancelado" texto="Esse gift não vale. Não aceite." onLimpar={limpar} />
          )}
        </div>
      )}
    </section>
  );
}

const TONS = {
  neutro: { fundo: "bg-surface-soft", cor: "#555960" },
  atencao: { fundo: "bg-[#FDF3E7]", cor: "#B4580A" },
  alerta: { fundo: "bg-[#FBEBE8]", cor: "#B0463C" },
};

function Resultado({ tom, titulo, texto, onLimpar }: { tom: keyof typeof TONS; titulo: string; texto: string; onLimpar: () => void }) {
  const t = TONS[tom];
  return (
    <div className={`mt-6 rounded-[22px] ${t.fundo} p-6 text-center`}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-white" style={{ color: t.cor }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 7.5v5.5M12 16.5v.01" />
        </svg>
      </span>
      <p className="mt-4 text-[16.5px] font-semibold" style={{ color: t.cor }}>{titulo}</p>
      <p className="mx-auto mt-1.5 max-w-[280px] text-[13.5px] leading-relaxed text-text-secondary">{texto}</p>
      <button onClick={onLimpar} className="mt-5 text-[13.5px] font-medium underline underline-offset-4">Tentar outro código</button>
    </div>
  );
}
