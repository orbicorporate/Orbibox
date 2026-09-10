"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";

type Msg = { role: string; content: string };

export function OrbiTrial({ businessId, agentName, orbiColors }: { businessId: string; agentName: string; orbiColors: string[] | null }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function abrirTeste() {
    setOpen(true);
    // Cria uma conversa de teste e checa quantos testes restam.
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

  async function enviar() {
    const text = input.trim();
    if (!text || sending || blocked || !conversationId) return;

    // Cada pergunta gasta um teste (só pra Titânio; Nióbio é ilimitado).
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
    setMessages((m) => [...m, { role: "visitor", content: text }]);
    setSending(true);
    try {
      const res = await fetch("/api/orbi-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, conversationId, message: text, history }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "agent", content: data.reply || "Desculpe, não consegui responder agora." }]);
      // Depois de responder, se acabaram os testes, bloqueia a próxima.
      if (!trial.unlimited && trial.remaining <= 0) setBlocked(true);
    } catch {
      setMessages((m) => [...m, { role: "agent", content: "Erro de conexão. Tente de novo." }]);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={abrirTeste}
        className="orbi-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold text-on-background"
      >
        <OrbiParticleSphere size={24} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        Experimentar a {agentName} grátis
      </button>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-[24px] border border-divider bg-surface-white">
      <div className="flex items-center justify-between border-b border-divider px-4 py-3">
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <OrbiParticleSphere size={26} colors={orbiColors ?? undefined} vivid className="rounded-full" />
          Testando a {agentName}
        </span>
        {remaining !== null && !blocked && (
          <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] text-text-secondary">
            {remaining} {remaining === 1 ? "teste restante" : "testes restantes"}
          </span>
        )}
      </div>

      <div className="flex max-h-[320px] min-h-[180px] flex-col gap-2.5 overflow-y-auto p-4">
        {messages.length === 0 && !blocked && (
          <p className="text-[13px] text-text-tertiary">
            Faça uma pergunta como se fosse um cliente seu — veja a {agentName} responder de verdade, com o que ela sabe do seu negócio.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
              m.role === "agent"
                ? "bg-gradient-to-br from-orbi-gradient-start/15 via-surface-white to-orbi-gradient-end/10"
                : "ml-auto bg-on-background text-white"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 self-start rounded-2xl bg-surface-white px-3 py-2">
            <OrbiParticleSphere size={28} colors={orbiColors ?? undefined} vivid className="rounded-full" />
            <span className="text-[12px] text-text-tertiary">{agentName} está pensando…</span>
          </div>
        )}
        {blocked && (
          <div className="mt-2 rounded-2xl bg-surface-soft p-4 text-center">
            <p className="text-[14px] font-semibold">Gostou da {agentName}? 💎</p>
            <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
              Seus testes grátis acabaram. No plano Nióbio a {agentName} fica ativa 24h na sua página, conversando com
              todos os seus clientes, recomendando produtos e capturando contatos automaticamente.
            </p>
            <Link
              href="/admin/planos"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-button-primary px-5 py-2.5 text-[13px] font-medium text-white"
            >
              Assinar Nióbio
            </Link>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!blocked && (
        <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex items-center gap-2 border-t border-divider p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte algo, como um cliente…"
            className="flex-1 rounded-full bg-surface-soft px-4 py-2.5 text-[14px] outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${input.trim() && !sending ? "orbi-gradient" : "bg-surface-soft"}`}
          >
            <span className="text-[16px] text-on-background">↑</span>
          </button>
        </form>
      )}
    </div>
  );
}
