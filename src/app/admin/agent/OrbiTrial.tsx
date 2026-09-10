"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type Msg = { role: string; content: string };

export function OrbiTrial({ businessId, agentName, orbiColors }: { businessId: string; agentName: string; orbiColors: string[] | null }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending, blocked]);

  // Trava o scroll de trás quando o chat de teste (tela cheia) abre.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  async function abrirTeste() {
    setOpen(true);
    const { data: conv } = await supabase
      .from("conversations")
      .insert({ business_id: businessId, channel: "web" })
      .select("id")
      .single();
    if (conv) setConversationId(conv.id);
    const res = await fetch("/api/orbi-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, consume: false }),
    });
    const data = await res.json();
    setRemaining(data.remaining ?? 0);
    setBlocked(!!data.blocked);
  }

  async function enviar(text: string) {
    const t = text.trim();
    if (!t || sending || blocked || !conversationId) return;

    const trialRes = await fetch("/api/orbi-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, consume: true }),
    });
    const trial = await trialRes.json();
    if (trial.blocked) {
      setBlocked(true);
      setRemaining(0);
      return;
    }
    setRemaining(trial.unlimited ? null : trial.remaining);

    setInput("");
    const history = messages;
    setMessages((m) => [...m, { role: "visitor", content: t }]);
    setSending(true);
    try {
      const res = await fetch("/api/orbi-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, conversationId, message: t, history, trialMode: true }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "agent", content: data.reply || "Desculpe, não consegui responder agora." }]);
      if (!trial.unlimited && trial.remaining <= 0) setBlocked(true);
    } catch {
      setMessages((m) => [...m, { role: "agent", content: "Erro de conexão. Tente de novo." }]);
    } finally {
      setSending(false);
    }
  }

  const SUGGESTIONS = ["O que vocês fazem?", "Me mostra o que tem", "Como funciona pra comprar?"];

  if (!open) {
    return (
      <button
        onClick={abrirTeste}
        className="orbi-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold text-on-background transition-transform active:scale-[0.98]"
      >
        <OrbiParticleSphere size={24} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        Experimentar a {agentName} grátis
      </button>
    );
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] mx-auto flex max-w-[440px] flex-col bg-background-main">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-divider px-5 pb-3 pt-14">
        <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[15px]">✕</button>
        <span className="flex items-center gap-2 text-[14px] font-medium">
          <OrbiParticleSphere size={28} colors={orbiColors ?? undefined} vivid className="rounded-full" />
          Testando a {agentName}
        </span>
        {remaining !== null && !blocked ? (
          <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-medium text-text-secondary">{remaining} {remaining === 1 ? "restante" : "restantes"}</span>
        ) : (
          <span className="w-9" />
        )}
      </div>

      {/* Mensagens */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6">
        {messages.length === 0 && !blocked && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <OrbiParticleSphere size={96} colors={orbiColors ?? undefined} vivid className="rounded-full" />
            <h2 className="mt-6 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.01em]">
              Converse como<br />se fosse um cliente
            </h2>
            <p className="mt-3 max-w-[300px] text-[14px] leading-relaxed text-text-secondary">
              Pergunte qualquer coisa. A {agentName} responde de verdade, com o que sabe do seu negócio, e até recomenda
              seus produtos e serviços com cards, pra você ver como fica pro seu cliente.
            </p>
            <div className="mt-6 flex w-full flex-col gap-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="flex items-center justify-between gap-3 rounded-[20px] bg-surface-white px-5 py-3.5 text-left text-[15px] shadow-[0_2px_12px_rgba(17,19,24,0.06)]"
                >
                  <span>{s}</span> <span className="shrink-0 text-text-tertiary">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-5 py-4 text-[16px] leading-[1.6] ${
              m.role === "agent"
                ? "bg-gradient-to-br from-orbi-gradient-start/15 via-surface-white to-orbi-gradient-end/10 shadow-[0_2px_12px_rgba(17,19,24,0.06)]"
                : "ml-auto bg-on-background text-white"
            }`}
          >
            {m.content.replace(/\[\[produto:[^\]]+\]\]/g, "").replace(/\[\[endereco\]\]/gi, "").trim()}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2.5 self-start rounded-2xl bg-surface-white px-3 py-2 shadow-[0_2px_12px_rgba(17,19,24,0.06)]">
            <OrbiParticleSphere size={36} colors={orbiColors ?? undefined} vivid className="rounded-full" />
            <span className="text-[13px] text-text-tertiary">{agentName} está pensando…</span>
          </div>
        )}

        {blocked && (
          <div className="mt-2 rounded-[24px] orbi-gradient p-[2px]">
            <div className="rounded-[22px] bg-surface-white p-6 text-center">
              <OrbiParticleSphere size={64} colors={orbiColors ?? undefined} vivid className="mx-auto rounded-full" />
              <p className="mt-4 text-[18px] font-semibold">Gostou da {agentName}? 💎</p>
              <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
                Seus testes acabaram. Com o Nióbio, a {agentName} fica ativa 24h na sua página, conversando com todos os
                seus clientes, recomendando produtos e capturando contatos, sozinha.
              </p>
              <Link href="/admin/planos" className="mt-4 inline-flex w-full items-center justify-center rounded-full orbi-gradient py-3.5 text-[15px] font-semibold text-on-background">
                ✦ Assinar Nióbio
              </Link>
              <button onClick={() => setOpen(false)} className="mt-2 w-full rounded-full py-2.5 text-[13px] text-text-secondary">
                Agora não
              </button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Campo de digitar */}
      {!blocked && (
        <div className="border-t border-divider bg-background-main px-5 pb-8 pt-3">
          <form onSubmit={(e) => { e.preventDefault(); enviar(input); }} className="flex items-center gap-2 rounded-full bg-surface-white p-2 pl-5 shadow-[0_8px_30px_rgba(17,19,24,0.1)]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo, como um cliente…"
              className="flex-1 bg-transparent text-[15px] outline-none"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${input.trim() && !sending ? "orbi-gradient" : "bg-surface-soft"}`}
            >
              <span className="text-[18px] text-on-background">↑</span>
            </button>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
}
