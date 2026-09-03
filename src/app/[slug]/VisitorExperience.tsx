"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { SIZE_CLASS, colorOf, groupByCategory, sizeOf } from "@/lib/showcase";
import { trackClick, whatsappLink } from "@/lib/track";

type Business = {
  id: string;
  name: string;
  slug: string;
  brand_voice_summary: string | null;
  brand_colors: { hex: string; role: string }[] | unknown;
  contact_whatsapp: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_site: string | null;
  site_type: string | null;
  about_business: string | null;
};

type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  brand_label: string | null;
  type: string;
  position: number;
  layout_size: string;
  box_color: string;
  box_style: string;
  target_url: string | null;
  link_kind: string | null;
};

type Intent = "comprar" | "conhecer" | "presentear" | "duvida";
type BoxRow = { box_type: string; is_active: boolean; position: number };

// Cada Smart Box vira um caminho na tela inicial.
const BOX_TO_OPTION: Record<string, { k: Intent; icon: string; t: string; d: string; ai?: boolean }> = {
  product: { k: "comprar", icon: "▤", t: "Comprar", d: "Explore nosso catálogo completo." },
  content: { k: "conhecer", icon: "◫", t: "Conhecer", d: "Descubra nosso espaço e história." },
  campaign: { k: "presentear", icon: "◈", t: "Presentear", d: "Opções especiais e curadoria." },
  agent: { k: "duvida", icon: "◉", t: "Tirar uma dúvida", d: "", ai: true },
};

export function VisitorExperience({
  business,
  content,
  boxes,
  agentName,
}: {
  business: Business;
  content: ContentItem[];
  boxes: BoxRow[];
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

  // Só aparecem os caminhos que o dono deixou ativos em Smart Boxes.
  const options = boxes
    .filter((b) => b.is_active && BOX_TO_OPTION[b.box_type])
    .sort((a, b) => a.position - b.position)
    .map((b) => BOX_TO_OPTION[b.box_type]);

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

      <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col items-center justify-center px-6 py-16">
        {intent === null && (
          <div className="flex flex-col items-center text-center">
            <OrbiOrb size={132} className="mb-8" />
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">
              {business.name}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[36px] font-medium leading-tight tracking-[-0.01em]">
              O que trouxe você
              <br />
              aqui hoje?
            </h1>
            <p className="mt-3 max-w-[280px] text-[14px] text-text-secondary">
              Selecione uma opção para personalizar sua experiência.
            </p>
            <div className="mt-10 flex w-full flex-col gap-3">
              {options.map((o) => (
                <button
                  key={o.k}
                  onClick={() => chooseIntent(o.k)}
                  className={`flex items-center gap-4 rounded-[24px] bg-surface-white p-4 text-left shadow-[0_2px_12px_rgba(17,19,24,0.05)] ${o.ai ? "ring-1 ring-orbi-gradient-start/60" : ""}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[15px]">{o.icon}</span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium">
                      {o.t}
                      {o.ai ? <span className="orbi-gradient-text"> ✦</span> : null}
                    </span>
                    <span className="block text-[12px] text-text-tertiary">
                      {o.ai ? `Fale com a ${agentName}, nossa IA.` : o.d}
                    </span>
                  </span>
                  <span className="text-text-tertiary">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(intent === "comprar" || intent === "presentear") && (
          <div className="w-full">
            <button onClick={() => setIntent(null)} className="mb-5 text-[13px] text-text-tertiary hover:underline">← voltar</button>
            <h2 className="font-[family-name:var(--font-manrope)] text-[30px] font-medium tracking-[-0.01em]">
              {intent === "presentear" ? "Para presentear" : "Feito para você"}
            </h2>
            <p className="mt-1 text-[15px] text-text-secondary">
              {intent === "presentear" ? "Seleções que fazem sentido para dar de presente" : "Curadoria baseada no seu interesse"}
            </p>

            {content.length === 0 ? (
              <Card className="mt-6 text-[15px] text-text-secondary">Ainda não há produtos publicados por aqui.</Card>
            ) : (
              <Showcase content={content} business={business} sessionId={sessionId} />
            )}
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
  const [sending, setSending] = useState(false);

  const QUICK = ["Algo refrescante", "Quero me mimar", "Mais saudável"];

  useEffect(() => {
    supabase
      .from("conversations")
      .insert({ business_id: businessId, visitor_session_id: sessionId, channel: "web" })
      .select("id")
      .single()
      .then(({ data }) => data && setConversationId(data.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendText(text: string) {
    if (!text.trim() || !conversationId || sending) return;
    const historyForApi = messages;
    setInput("");
    setMessages((prev) => [...prev, { role: "visitor", content: text }]);
    setSending(true);
    await supabase.from("messages").insert({ conversation_id: conversationId, role: "visitor", content: text });
    try {
      const res = await fetch("/api/zara-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, conversationId, message: text, history: historyForApi }),
      });
      const data = await res.json();
      const reply = res.ok && data.reply ? data.reply : "Desculpa, tive um problema aqui — pode tentar de novo?";
      setMessages((prev) => [...prev, { role: "agent", content: reply }]);
    } finally {
      setSending(false);
    }
  }

  const started = messages.length > 0;

  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-[440px] flex-col bg-background-main/95 backdrop-blur">
      {/* Fechar */}
      <button
        onClick={onBack}
        className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface-white text-[16px] shadow"
        aria-label="Fechar"
      >
        ×
      </button>

      <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-32 pt-24">
        {/* Avatar */}
        <div className="mx-auto relative">
          <OrbiOrb size={112} />
          <span className="absolute bottom-3 right-3 h-4 w-4 rounded-full border-2 border-surface-white bg-orbi-gradient-start" />
        </div>
        <p className="mt-2 text-center text-[13px] text-text-tertiary">{agentName} · online</p>

        {!started ? (
          <>
            <h2 className="mt-6 text-center font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-tight tracking-[-0.02em]">
              O que bateu<br />vontade hoje?
            </h2>
            <div className="mt-8 flex flex-col gap-3">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => sendText(q)}
                  disabled={!conversationId}
                  className="flex items-center justify-between rounded-[22px] bg-surface-white px-5 py-4 text-left text-[16px] shadow-[0_2px_12px_rgba(17,19,24,0.06)] disabled:opacity-50"
                >
                  {q} <span className="text-text-tertiary">→</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                  m.role === "agent" ? "bg-surface-white shadow-[0_2px_12px_rgba(17,19,24,0.06)]" : "ml-auto bg-on-background text-white"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && <div className="max-w-[40%] rounded-2xl bg-surface-white px-4 py-3 text-[14px] text-text-tertiary">…</div>}
          </div>
        )}
      </div>

      {/* Campo fixo */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendText(input); }}
        className="absolute inset-x-6 bottom-8 flex items-center gap-2 rounded-full bg-surface-white p-2 pl-4 shadow-[0_8px_30px_rgba(17,19,24,0.12)]"
      >
        <span className="text-text-tertiary">🎤</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Digite ou fale com a ${agentName}…`}
          className="flex-1 bg-transparent text-[14px] outline-none"
        />
        <button type="submit" disabled={sending} className="flex h-10 w-10 items-center justify-center rounded-full bg-on-background text-white disabled:opacity-40">✦</button>
      </form>
    </div>
  );
}

function OrbiRecommendation({ businessId }: { businessId: string }) {
  const [rec, setRec] = useState<{ message: string; cta: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.message) setRec({ message: d.message, cta: d.cta ?? "Explorar" }); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !rec) return null;

  return (
    <div className="rounded-[28px] orbi-gradient p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-on-background/10 text-[12px]">✦</span>
        <span className="text-[12px] font-semibold uppercase tracking-wide text-on-background/70">
          Orbi Intelligence
        </span>
      </div>
      <p className="mt-3 text-[16px] leading-relaxed text-on-background">{rec.message}</p>
      <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-button-primary px-5 py-3 text-[14px] font-medium text-white">
        ✦ {rec.cta}
      </button>
    </div>
  );
}

/** Botões de contato do negócio. Cada clique é contado por tipo no Pulse. */
function BarraContato({ business, sessionId, onZara }: { business: Business; sessionId: string | null; onZara?: () => void }) {
  const tem = business.contact_whatsapp || business.contact_phone || business.contact_email;
  if (!tem && !onZara) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {onZara && (
        <button
          onClick={() => { trackClick({ businessId: business.id, kind: "zara", sessionId }); onZara(); }}
          className="inline-flex items-center gap-2 rounded-full orbi-gradient px-5 py-3 text-[14px] font-medium text-on-background"
        >
          ✦ Falar com a Orbi
        </button>
      )}
      {business.contact_whatsapp && (
        <a
          href={whatsappLink(business.contact_whatsapp, `Olá! Vim pelo ${business.name}.`)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick({ businessId: business.id, kind: "whatsapp", sessionId })}
          className="inline-flex items-center gap-2 rounded-full bg-button-primary px-5 py-3 text-[14px] font-medium text-white"
        >
          WhatsApp
        </a>
      )}
      {business.contact_phone && (
        <a
          href={`tel:${business.contact_phone.replace(/\D/g, "")}`}
          onClick={() => trackClick({ businessId: business.id, kind: "ligar", sessionId })}
          className="inline-flex items-center gap-2 rounded-full border border-divider bg-surface-white px-5 py-3 text-[14px] font-medium"
        >
          Ligar
        </a>
      )}
      {business.contact_email && (
        <a
          href={`mailto:${business.contact_email}`}
          onClick={() => trackClick({ businessId: business.id, kind: "email", sessionId })}
          className="inline-flex items-center gap-2 rounded-full border border-divider bg-surface-white px-5 py-3 text-[14px] text-text-secondary"
        >
          E-mail
        </a>
      )}
    </div>
  );
}

function Showcase({ content, business, sessionId }: { content: ContentItem[]; business: Business; sessionId: string | null }) {
  const sections = groupByCategory(content);
  const [active, setActive] = useState<string | null>(null);

  const visible = active ? sections.filter((s) => s.name === active) : sections;

  return (
    <>
      {sections.length > 1 && (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActive(null)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] ${active === null ? "bg-button-primary text-white" : "border border-divider bg-surface-white text-text-secondary"}`}
          >
            Tudo
          </button>
          {sections.map((s) => (
            <button
              key={s.name}
              onClick={() => setActive(s.name)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] ${active === s.name ? "bg-button-primary text-white" : "border border-divider bg-surface-white text-text-secondary"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-8">
        {visible.map((sec, si) => (
          <div key={sec.name}>
            {sections.length > 1 && (
              <h3 className="mb-3 font-[family-name:var(--font-manrope)] text-[20px] font-medium">{sec.name}</h3>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {sec.items.map((item) => {
                const c = colorOf(item.box_color);
                const photo = item.box_style === "foto" && !!item.image_url;
                // Com destino, o box vira link para o site do dono e o clique é contado.
                const destino = item.target_url;
                const kindClique: "categoria" | "produto" | "link" =
                  item.link_kind === "categoria" ? "categoria" : item.link_kind === "produto" ? "produto" : "link";
                const classe = `relative flex flex-col justify-end overflow-hidden rounded-[20px] border border-divider p-3 ${SIZE_CLASS[sizeOf(item.layout_size)]}`;
                const estilo = photo ? undefined : { backgroundColor: c.bg };
                const miolo = (
                  <>
                    {photo && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image_url!} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      </>
                    )}
                    <div className="relative">
                      <p className={`font-medium leading-tight ${sizeOf(item.layout_size) === "destaque" ? "text-[17px]" : "text-[14px]"}`} style={{ color: photo ? "#fff" : c.fg }}>
                        {item.title}
                      </p>
                      {item.price != null && (
                        <p className="mt-0.5 text-[12px] opacity-80" style={{ color: photo ? "#fff" : c.fg }}>
                          R$ {Number(item.price).toFixed(2)}
                        </p>
                      )}
                      {destino && (
                        <p className="mt-1 text-[11px] opacity-70" style={{ color: photo ? "#fff" : c.fg }}>
                          {item.link_kind === "categoria" ? "ver categoria \u2197" : "ver no site \u2197"}
                        </p>
                      )}
                    </div>
                  </>
                );
                return destino ? (
                  <a
                    key={item.id}
                    href={destino}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick({ businessId: business.id, kind: kindClique, contentItemId: item.id, sessionId, targetUrl: destino })}
                    className={classe}
                    style={estilo}
                  >
                    {miolo}
                  </a>
                ) : (
                  <div key={item.id} className={classe} style={estilo}>
                    {miolo}
                  </div>
                );
              })}
            </div>
            {si === 0 && <div className="mt-6"><OrbiRecommendation businessId={business.id} /></div>}
          </div>
        ))}
      </div>
      <BarraContato business={business} sessionId={sessionId} />
    </>
  );
}
