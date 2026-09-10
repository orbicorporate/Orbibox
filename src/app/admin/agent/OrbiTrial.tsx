"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { formatPrice } from "@/lib/showcase";

type Msg = { role: string; content: string };
type Product = { id: string; title: string; price: number | null; price_type: string; price_max: number | null; image_url: string | null; link_kind: string | null; target_url: string | null };

// Negrito **texto** inline.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// Renderiza a mensagem da Orbi com negrito + cards de produto + card de endereço.
function renderMsg(text: string, products: Product[], address: string | null) {
  const ids: string[] = [];
  let showAddress = false;
  const cleaned = text
    .replace(/\[\[produto:([^\]]+)\]\]/g, (_, id) => { ids.push(String(id).trim()); return ""; })
    .replace(/\[\[endereco\]\]/gi, () => { showAddress = true; return ""; });

  const cards = ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
  const paras = cleaned.split(/\n{2,}/).filter((b) => b.trim());

  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className="whitespace-pre-line">{inline(p)}</p>
      ))}
      {showAddress && address && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-3 rounded-2xl bg-surface-white p-3 shadow-[0_2px_12px_rgba(17,19,24,0.08)] ring-1 ring-black/5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-[20px]">📍</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">Como chegar</span>
            <span className="block truncate text-[12px] text-text-secondary">{address}</span>
          </span>
          <span className="shrink-0 text-text-tertiary">→</span>
        </a>
      )}
      {cards.map((p) => (
        <div key={p.id} className="mt-1 flex items-center gap-3.5 rounded-2xl bg-surface-white p-2.5 shadow-[0_2px_12px_rgba(17,19,24,0.08)] ring-1 ring-black/5">
          {p.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image_url} alt={p.title} className="shrink-0 rounded-xl object-cover" style={{ height: 72, width: 72 }} />
          ) : (
            <span className="flex shrink-0 items-center justify-center rounded-xl bg-surface-soft text-[22px]" style={{ height: 72, width: 72 }}>✦</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{p.title}</span>
            <span className="block text-[13px] text-text-secondary">{formatPrice(p) || "Ver detalhes"}</span>
          </span>
          <span className="shrink-0 pr-1 text-[18px] text-text-tertiary">→</span>
        </div>
      ))}
    </>
  );
}

export function OrbiTrial({ businessId, address, products, agentName, orbiColors, floating = false }: { businessId: string; address: string | null; products: Product[]; agentName: string; orbiColors: string[] | null; floating?: boolean }) {
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
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, sending, blocked]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  async function abrirTeste() {
    setOpen(true);
    const { data: conv } = await supabase.from("conversations").insert({ business_id: businessId, channel: "web" }).select("id").single();
    if (conv) setConversationId(conv.id);
    const res = await fetch("/api/orbi-trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, consume: false }) });
    const data = await res.json();
    setRemaining(data.remaining ?? 0);
    setBlocked(!!data.blocked);
  }

  async function enviar(text: string) {
    const t = text.trim();
    if (!t || sending || blocked || !conversationId) return;
    const trialRes = await fetch("/api/orbi-trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, consume: true }) });
    const trial = await trialRes.json();
    if (trial.blocked) { setBlocked(true); setRemaining(0); return; }
    setRemaining(trial.unlimited ? null : trial.remaining);
    setInput("");
    const history = messages;
    setMessages((m) => [...m, { role: "visitor", content: t }]);
    setSending(true);
    try {
      const res = await fetch("/api/orbi-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, conversationId, message: t, history, trialMode: true }) });
      const data = await res.json();
      setMessages((m) => [...m, { role: "agent", content: data.reply || "Desculpe, não consegui responder agora." }]);
      if (!trial.unlimited && trial.remaining <= 0) setBlocked(true);
    } catch {
      setMessages((m) => [...m, { role: "agent", content: "Erro de conexão. Tente de novo." }]);
    } finally {
      setSending(false);
    }
  }

  const SUGGESTIONS = ["O que vocês fazem?", "Me mostra o que tem", "Onde vocês ficam?"];

  if (!open) {
    if (floating) {
      return (
        <button
          onClick={abrirTeste}
          aria-label={`Experimentar a ${agentName}`}
          className="flex h-14 w-14 items-center justify-center transition-transform active:scale-95"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.22))" }}
        >
          <OrbiParticleSphere size={56} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        </button>
      );
    }
    return (
      <button onClick={abrirTeste} className="orbi-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold text-on-background transition-transform active:scale-[0.98]">
        <OrbiParticleSphere size={24} colors={orbiColors ?? undefined} vivid className="rounded-full" />
        Experimentar a {agentName} grátis
      </button>
    );
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] mx-auto flex max-w-[440px] flex-col bg-background-main">
      <div className="flex items-center justify-between border-b border-divider px-5 pb-3 pt-14">
        <button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[15px]">✕</button>
        <span className="flex items-center gap-2 text-[14px] font-medium">
          <OrbiParticleSphere size={28} colors={orbiColors ?? undefined} vivid className="rounded-full" />
          Testando a {agentName}
        </span>
        {remaining !== null && !blocked ? (
          <span className="rounded-full bg-surface-soft px-2.5 py-1 text-[11px] font-medium text-text-secondary">{remaining} {remaining === 1 ? "restante" : "restantes"}</span>
        ) : (<span className="w-9" />)}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6">
        {messages.length === 0 && !blocked && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <OrbiParticleSphere size={96} colors={orbiColors ?? undefined} vivid className="rounded-full" />
            <h2 className="mt-6 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight tracking-[-0.01em]">Converse como<br />se fosse um cliente</h2>
            <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-text-secondary">
              Pergunte qualquer coisa. A {agentName} responde de verdade, recomenda seus produtos e serviços com cards
              clicáveis, mostra o endereço, e puxa o contato, tudo sozinha.
            </p>
            <div className="mt-6 flex w-full flex-col gap-2.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="flex items-center justify-between gap-3 rounded-[20px] bg-surface-white px-5 py-3.5 text-left text-[16px] shadow-[0_2px_12px_rgba(17,19,24,0.06)]">
                  <span>{s}</span> <span className="shrink-0 text-text-tertiary">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`max-w-[88%] rounded-2xl px-5 py-4 text-[16px] leading-[1.6] ${m.role === "agent" ? "flex flex-col gap-3 bg-gradient-to-br from-orbi-gradient-start/15 via-surface-white to-orbi-gradient-end/10 shadow-[0_2px_12px_rgba(17,19,24,0.06)]" : "ml-auto bg-on-background text-white"}`}>
            {m.role === "agent" ? renderMsg(m.content, products, address) : m.content}
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
              <Link href="/admin/planos" className="mt-4 inline-flex w-full items-center justify-center rounded-full orbi-gradient py-3.5 text-[15px] font-semibold text-on-background">✦ Assinar Nióbio</Link>
              <button onClick={() => setOpen(false)} className="mt-2 w-full rounded-full py-2.5 text-[13px] text-text-secondary">Agora não</button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!blocked && (
        <div className="border-t border-divider bg-background-main px-5 pb-8 pt-3">
          <form onSubmit={(e) => { e.preventDefault(); enviar(input); }} className="flex items-center gap-2 rounded-full bg-surface-white p-2 pl-5 shadow-[0_8px_30px_rgba(17,19,24,0.1)]">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte algo, como um cliente…" className="flex-1 bg-transparent text-[15px] outline-none" />
            <button type="submit" disabled={sending || !input.trim()} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${input.trim() && !sending ? "orbi-gradient" : "bg-surface-soft"}`}>
              <span className="text-[18px] text-on-background">↑</span>
            </button>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
}
