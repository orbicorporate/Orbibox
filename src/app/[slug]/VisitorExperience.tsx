"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Business = {
  id: string;
  name: string;
  slug: string;
  brand_voice_summary: string | null;
  brand_colors: { hex: string; role: string }[] | unknown;
};

type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  type: string;
};

type Intent = "comprar" | "conhecer" | "duvida";

export function VisitorExperience({
  business,
  content,
  agentName,
}: {
  business: Business;
  content: ContentItem[];
  agentName: string;
}) {
  const supabase = createClient();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("visitor_sessions")
      .insert({ business_id: business.id, source: "direct", device: "web" })
      .select("id")
      .single()
      .then(({ data }) => data && setSessionId(data.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chooseIntent(value: Intent) {
    setIntent(value);
    if (sessionId) {
      await supabase.from("visitor_sessions").update({ intent: value }).eq("id", sessionId);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background-main">
      {/* Halo suave — atmosfera "líquida" */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full orbi-gradient opacity-20 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-16">
        {intent === null && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-8 h-16 w-16 animate-pulse rounded-full orbi-gradient" />
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">
              {business.name}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[36px] font-medium leading-tight tracking-[-0.01em]">
              O que trouxe você
              <br />
              aqui hoje?
            </h1>
            <div className="mt-10 flex w-full flex-col gap-3">
              <Button className="w-full" onClick={() => chooseIntent("comprar")}>
                Comprar
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => chooseIntent("conhecer")}>
                Conhecer
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => chooseIntent("duvida")}>
                Tirar dúvida
              </Button>
            </div>
          </div>
        )}

        {intent === "comprar" && (
          <div className="w-full">
            <button
              onClick={() => setIntent(null)}
              className="mb-6 text-[13px] text-text-tertiary hover:underline"
            >
              ← voltar
            </button>
            <h2 className="font-[family-name:var(--font-manrope)] text-[26px] font-medium">
              Curadoria para você
            </h2>
            <div className="mt-6 flex flex-col gap-4">
              {content.length === 0 && (
                <Card className="text-[15px] text-text-secondary">
                  Ainda não há produtos publicados por aqui.
                </Card>
              )}
              {content.map((item) => (
                <Card key={item.id}>
                  <p className="text-[15px] font-medium">{item.title}</p>
                  {item.description && (
                    <p className="mt-1 text-[14px] text-text-secondary">{item.description}</p>
                  )}
                  {item.price != null && (
                    <p className="mt-2 text-[15px] font-medium">
                      R$ {Number(item.price).toFixed(2)}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {intent === "conhecer" && (
          <div className="w-full text-center">
            <button
              onClick={() => setIntent(null)}
              className="mb-6 text-[13px] text-text-tertiary hover:underline"
            >
              ← voltar
            </button>
            <h2 className="font-[family-name:var(--font-manrope)] text-[26px] font-medium">
              {business.name}
            </h2>
            <p className="mt-4 text-[15px] text-text-secondary">
              {business.brand_voice_summary ??
                "Uma marca com identidade própria, construída para conversar de perto com quem chega."}
            </p>
          </div>
        )}

        {intent === "duvida" && sessionId && (
          <ZaraChat businessId={business.id} sessionId={sessionId} agentName={agentName} onBack={() => setIntent(null)} />
        )}
      </div>
    </main>
  );
}

function ZaraChat({
  businessId,
  sessionId,
  agentName,
  onBack,
}: {
  businessId: string;
  sessionId: string;
  agentName: string;
  onBack: () => void;
}) {
  const supabase = createClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    supabase
      .from("conversations")
      .insert({ business_id: businessId, visitor_session_id: sessionId, channel: "web" })
      .select("id")
      .single()
      .then(({ data }) => {
        if (data) {
          setConversationId(data.id);
          setMessages([
            {
              role: "agent",
              content: `Oi! Eu sou a ${agentName} ✦ Como posso te ajudar hoje?`,
            },
          ]);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;
    const text = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "visitor", content: text }]);
    await supabase.from("messages").insert({ conversation_id: conversationId, role: "visitor", content: text });

    // Resposta simples de placeholder — plugar modelo real depois.
    const reply = `Entendi! Vou anotar isso e te responder com mais detalhes sobre "${text}" em instantes. ✦`;
    setTimeout(async () => {
      setMessages((prev) => [...prev, { role: "agent", content: reply }]);
      await supabase.from("messages").insert({ conversation_id: conversationId, role: "agent", content: reply });
    }, 700);
  }

  return (
    <div className="flex w-full flex-col">
      <button onClick={onBack} className="mb-4 self-start text-[13px] text-text-tertiary hover:underline">
        ← voltar
      </button>
      <Card className="flex h-[420px] flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-[14px] ${
                m.role === "agent"
                  ? "bg-surface-soft text-on-background"
                  : "ml-auto bg-button-primary text-white"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
        <form onSubmit={send} className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva sua dúvida…"
            className="flex-1 rounded-2xl border border-divider px-4 py-2 text-[14px] outline-none focus:border-on-background"
          />
          <Button type="submit">Enviar</Button>
        </form>
      </Card>
    </div>
  );
}
