"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { COVER_RATIO_BY_SIZE, colorOf, formatPrice, groupByCategory, sizeOf } from "@/lib/showcase";
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
  differentials: string | null;
  differentials_cards: unknown;
  story_photos: string[];
};

type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  price_max: number | null;
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
type BoxRow = { id: string; box_type: string; title: string | null; is_active: boolean; position: number; config: unknown };
type CustomConfig = { label?: string; subtitle?: string; icon?: string; color?: string; action?: "vitrine" | "zara" | "whatsapp" | "link"; url?: string };

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
  isOwner,
}: {
  business: Business;
  content: ContentItem[];
  boxes: BoxRow[];
  agentName: string;
  isOwner: boolean;
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

  // Só aparecem os caminhos que o dono deixou ativos em Smart Boxes —
  // mistura os fixos com os personalizados, na ordem que o dono escolheu.
  type Option = { key: string; icon: string; t: string; d: string; color?: string; ai?: boolean; onClick: () => void };
  const options: Option[] = boxes
    .filter((b) => b.is_active && (BOX_TO_OPTION[b.box_type] || b.box_type === "custom"))
    .sort((a, b) => a.position - b.position)
    .map((b): Option | null => {
      const cfg = (b.config ?? {}) as CustomConfig;
      if (b.box_type === "custom") {
        const label = cfg.label || b.title || "Link";
        const onClick = () => {
          if (cfg.action === "vitrine") chooseIntent("comprar");
          else if (cfg.action === "zara") chooseIntent("duvida");
          else if (cfg.action === "whatsapp") {
            const link = cfg.url || (business.contact_whatsapp ? whatsappLink(business.contact_whatsapp) : null);
            if (link) { trackClick({ businessId: business.id, kind: "whatsapp", sessionId }); window.open(link, "_blank"); }
          } else if (cfg.url) {
            trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: cfg.url });
            window.open(cfg.url, "_blank");
          }
        };
        return { key: b.id, icon: cfg.icon || "◆", t: label, d: cfg.subtitle || "", color: cfg.color, onClick };
      }
      const base = BOX_TO_OPTION[b.box_type];
      // "Sobre" sugere o nome da marca quando o dono não personalizou — igual ao editor.
      const fallbackLabel = b.box_type === "content" ? `Sobre a ${business.name}` : base.t;
      return { key: b.id, icon: cfg.icon || base.icon, t: cfg.label || fallbackLabel, d: base.d, color: cfg.color, ai: base.ai, onClick: () => chooseIntent(base.k) };
    })
    .filter((o): o is Option => o !== null);

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

      {/* O dono, navegando o próprio link, ganha um atalho de volta pro painel. */}
      {isOwner && (
        <Link
          href="/admin"
          className="fixed right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-on-background/90 px-3.5 py-2 text-[12px] font-medium text-white shadow-lg backdrop-blur"
        >
          ← Meu painel
        </Link>
      )}

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
                  key={o.key}
                  onClick={o.onClick}
                  className={`flex items-center gap-4 rounded-[24px] bg-surface-white p-4 text-left shadow-[0_2px_12px_rgba(17,19,24,0.05)] ${o.ai ? "ring-1 ring-orbi-gradient-start/60" : ""}`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] ${o.color ? "text-white" : "bg-surface-soft"}`}
                    style={o.color ? { backgroundColor: o.color } : undefined}
                  >
                    {o.icon}
                  </span>
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
              <Showcase content={content} business={business} sessionId={sessionId} onOrbi={() => chooseIntent("duvida")} />
            )}
          </div>
        )}

        {intent === "conhecer" && (
          <StoryView business={business} onBack={() => setIntent(null)} />
        )}

        {intent === "duvida" && sessionId && (
          <OrbiChat businessId={business.id} sessionId={sessionId} agentName={agentName} content={content} whatsapp={business.contact_whatsapp} onBack={() => setIntent(null)} />
        )}
      </div>
    </main>
  );
}

function StoryView({ business, onBack }: { business: Business; onBack: () => void }) {
  const [active, setActive] = useState(0);
  const photos = business.story_photos ?? [];
  const rawCards = business.differentials_cards;
  type DiffCard = { icon?: string; title: string; description?: string };
  let cards: DiffCard[] = Array.isArray(rawCards)
    ? rawCards.filter((c): c is DiffCard => !!c && typeof c === "object" && typeof (c as DiffCard).title === "string" && (c as DiffCard).title.trim() !== "")
    : [];
  // Compatibilidade com quem só tinha o texto simples de antes (sem cards).
  if (cards.length === 0 && business.differentials) {
    cards = business.differentials.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((title) => ({ title }));
  }

  return (
    <div className="w-full text-left">
      <button onClick={onBack} className="mb-4 text-[13px] text-text-tertiary hover:underline">
        ← voltar
      </button>

      {photos.length > 0 && (
        <>
          <div
            className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto"
            onScroll={(e) => {
              const w = e.currentTarget.clientWidth || 1;
              setActive(Math.round(e.currentTarget.scrollLeft / w));
            }}
          >
            {photos.map((src, i) => (
              <div key={i} className="w-full shrink-0 snap-center overflow-hidden rounded-[22px] bg-surface-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={business.name} className="max-h-[460px] w-full object-cover" />
              </div>
            ))}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === active ? "bg-on-background" : "bg-on-background/25"}`} />
              ))}
            </div>
          )}
        </>
      )}

      <h2 className="mt-6 font-[family-name:var(--font-manrope)] text-[26px] font-medium leading-tight">{business.name}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
        {business.brand_voice_summary ?? "Uma marca com identidade própria, construída para conversar de perto com quem chega."}
      </p>

      {business.about_business && (
        <div className="mt-6">
          <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Sobre nós</p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{business.about_business}</p>
        </div>
      )}

      {cards.length > 0 && (
        <div className="mt-6">
          <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Diferenciais</p>
          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
            {cards.map((c, i) => (
              <div key={i} className="w-[220px] shrink-0 snap-start rounded-[22px] bg-surface-white p-4 shadow-[0_2px_14px_rgba(17,19,24,0.06)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-[18px]">{c.icon || "◎"}</span>
                <p className="mt-3 font-[family-name:var(--font-manrope)] text-[16px] font-semibold leading-snug">{c.title}</p>
                {c.description && <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{c.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Transforma o texto puro da IA em parágrafos, listas com marcador e
 * **negrito** de verdade — em vez de um bloco só, apertado e sem cor.
 */
function formatMessage(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const isBulletBlock = lines.length > 0 && lines.every((l) => /^[-*•]\s+/.test(l.trim()));
    if (isBulletBlock) {
      return (
        <ul key={bi} className="flex flex-col gap-2">
          {lines.map((l, li) => (
            <li key={li} className="flex items-start gap-2.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full orbi-gradient" />
              <span>{formatInline(l.replace(/^[-*•]\s+/, ""))}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={bi}>
        {lines.map((l, li) => (
          <span key={li}>
            {formatInline(l)}
            {li < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

function formatInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function OrbiChat({
  businessId,
  sessionId,
  agentName,
  content,
  whatsapp,
  onBack,
}: {
  businessId: string;
  sessionId: string;
  agentName: string;
  content: ContentItem[];
  whatsapp: string | null;
  onBack: () => void;
}) {
  const supabase = createClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Sugestões puxadas do que existe de verdade no negócio — nunca genéricas.
  // Prioriza itens variados (categorias diferentes) pra cobrir mais opções.
  const QUICK = (() => {
    const published = [...content].sort((a, b) => a.position - b.position);
    const seen = new Set<string>();
    const picks: string[] = [];
    for (const item of published) {
      const cat = item.brand_label?.trim() || "";
      if (seen.has(cat) && cat) continue;
      if (cat) seen.add(cat);
      picks.push(item.title);
      if (picks.length === 7) break;
    }
    // Se sobrar espaço e ainda tiver itens (mesmo repetindo categoria), completa até 7.
    if (picks.length < 7) {
      for (const item of published) {
        if (picks.length === 7) break;
        if (!picks.includes(item.title)) picks.push(item.title);
      }
    }
    if (picks.length === 0) {
      return ["Quero saber mais sobre vocês", "Como funciona", "Quais os valores", "Formas de pagamento", "Prazo de entrega", "Onde vocês atendem", "Quero falar com alguém"];
    }
    return picks;
  })();

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
      const res = await fetch("/api/orbi-chat", {
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
              Como posso<br />te ajudar?
            </h2>
            <p className="mt-8 text-center text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              Sugestões de tema
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => sendText(`Me conta mais sobre "${q}"`)}
                  disabled={!conversationId}
                  className="flex items-center justify-between gap-3 rounded-[22px] bg-surface-white px-5 py-4 text-left text-[16px] shadow-[0_2px_12px_rgba(17,19,24,0.06)] disabled:opacity-50"
                >
                  <span>{q}</span> <span className="shrink-0 text-text-tertiary">→</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-7 ${
                  m.role === "agent"
                    ? "bg-gradient-to-br from-orbi-gradient-start/15 via-surface-white to-orbi-gradient-end/10 shadow-[0_2px_12px_rgba(17,19,24,0.06)]"
                    : "ml-auto bg-on-background text-white"
                }`}
              >
                <div className="flex flex-col gap-3">{formatMessage(m.content)}</div>
              </div>
            ))}
            {sending && <div className="max-w-[40%] rounded-2xl bg-surface-white px-4 py-3 text-[14px] text-text-tertiary">…</div>}
            {whatsapp && !sending && (
              <a
                href={whatsappLink(whatsapp, `Olá! Vim conversando com a ${agentName} no site.`)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick({ businessId, kind: "whatsapp", sessionId })}
                className="flex items-center gap-3 self-start rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[13px] text-on-background shadow-[0_2px_12px_rgba(17,19,24,0.06)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[15px]">☎</span>
                <span>
                  Prefere mais rápido? <span className="font-medium">Fala com a gente agora no WhatsApp</span> — sem fila de espera.
                </span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Campo fixo */}
      <form
        onSubmit={(e) => { e.preventDefault(); sendText(input); }}
        className="absolute inset-x-6 bottom-8 flex items-center gap-2 rounded-full bg-surface-white p-2 pl-4 shadow-[0_8px_30px_rgba(17,19,24,0.12)]"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orbi-gradient-start opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orbi-gradient-start" />
        </span>
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

function OrbiRecommendation({ businessId, onOrbi }: { businessId: string; onOrbi: () => void }) {
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
    <div className="orbi-card-light rounded-[28px] p-5">
      <div className="relative flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-on-background/10 text-[12px]">✦</span>
        <span className="text-[12px] font-semibold uppercase tracking-wide text-on-background/70">
          Orbi Intelligence
        </span>
      </div>
      <p className="relative mt-3 text-[16px] leading-relaxed text-on-background">{rec.message}</p>
      {/* Chama pra falar com a marca — abre o chat da Orbi, que já sabe desse interesse. */}
      <button
        onClick={onOrbi}
        className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-button-primary px-5 py-3 text-[14px] font-medium text-white"
      >
        ✦ Falar com a Orbi
      </button>
    </div>
  );
}

/** Botões de contato do negócio. Cada clique é contado por tipo no Pulse. */
function BarraContato({ business, sessionId, onOrbi }: { business: Business; sessionId: string | null; onOrbi?: () => void }) {
  const tem = business.contact_whatsapp || business.contact_phone || business.contact_email;
  if (!tem && !onOrbi) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {onOrbi && (
        <button
          onClick={() => { trackClick({ businessId: business.id, kind: "zara", sessionId }); onOrbi(); }}
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

function Showcase({ content, business, sessionId, onOrbi }: { content: ContentItem[]; business: Business; sessionId: string | null; onOrbi: () => void }) {
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
            {/* Mesmo cartão grande da edição — o que você vê ao editar é o que o
                visitante vê aqui, sem surpresa. */}
            <div className="flex flex-col gap-5">
              {sec.items.map((item) => {
                const c = colorOf(item.box_color);
                const size = sizeOf(item.layout_size);
                const ratio = COVER_RATIO_BY_SIZE[size];
                // Mesma correção de sempre: "tem foto" é só ter uma URL.
                const photo = !!item.image_url;
                // Categoria de loja vai direto pro site do dono (decisão já tomada).
                // Produto e serviço abrem a página interna — com carrossel, descrição e CTAs.
                const destino = item.link_kind === "categoria" ? item.target_url : item.target_url && item.link_kind === "externo" ? item.target_url : `/${business.slug}/p/${item.id}`;
                const isExterno = item.link_kind === "categoria" || item.link_kind === "externo";
                const kindClique: "categoria" | "produto" | "link" =
                  item.link_kind === "categoria" ? "categoria" : item.link_kind === "produto" ? "produto" : "link";
                const priceLabel = formatPrice(item);

                const miolo = (
                  <>
                    <div className="relative" style={{ aspectRatio: ratio === "paisagem" ? 16 / 9 : ratio === "retrato" ? 4 / 5 : 1 }}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url!}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const img = e.currentTarget;
                            img.style.display = "none";
                            if (img.parentElement) img.parentElement.style.backgroundColor = c.bg;
                          }}
                        />
                      ) : (
                        // Sem foto: o nome vira o conteúdo do box, centralizado — sem
                        // rodapé branco repetindo a mesma informação embaixo.
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-8 text-center" style={{ backgroundColor: c.bg }}>
                          <span className="font-[family-name:var(--font-open-sans)] text-[21px] font-bold leading-snug" style={{ color: c.fg }}>
                            {item.title}
                          </span>
                          {priceLabel && (
                            <span className="font-[family-name:var(--font-open-sans)] text-[14px]" style={{ color: c.fg }}>
                              {priceLabel}
                            </span>
                          )}
                          {isExterno ? (
                            <span className="mt-1 text-[12px] opacity-70" style={{ color: c.fg }}>
                              {item.link_kind === "categoria" ? "ver categoria ↗" : "ver no site ↗"}
                            </span>
                          ) : (
                            <span className="mt-1 rounded-full px-3 py-1.5 text-[11px] font-medium" style={{ backgroundColor: `${c.fg}1A`, color: c.fg }}>
                              Quero saber mais
                            </span>
                          )}
                        </div>
                      )}
                      {destino && (
                        <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-[12px] text-white backdrop-blur-sm">
                          {isExterno ? "↗" : "›"}
                        </span>
                      )}
                    </div>
                    {photo && (
                      <div className="p-5">
                        <p className="font-[family-name:var(--font-manrope)] text-[18px] font-medium leading-tight">{item.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {item.brand_label && <p className="text-[13px] text-text-tertiary">{item.brand_label}</p>}
                          {isExterno && (
                            <p className="text-[12px] text-text-tertiary">{item.link_kind === "categoria" ? "· ver categoria" : "· ver no site"}</p>
                          )}
                        </div>
                        {priceLabel && (
                          <p className="mt-2 font-[family-name:var(--font-manrope)] text-[17px] font-medium">{priceLabel}</p>
                        )}
                      </div>
                    )}
                  </>
                );

                const classe = "block overflow-hidden rounded-[24px] bg-surface-white shadow-[0_2px_14px_rgba(17,19,24,0.06)]";

                if (!destino) {
                  return (
                    <div key={item.id} className={classe}>
                      {miolo}
                    </div>
                  );
                }
                return isExterno ? (
                  <a
                    key={item.id}
                    href={destino}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick({ businessId: business.id, kind: kindClique, contentItemId: item.id, sessionId, targetUrl: destino })}
                    className={classe}
                  >
                    {miolo}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    href={destino}
                    onClick={() => trackClick({ businessId: business.id, kind: "produto", contentItemId: item.id, sessionId, targetUrl: destino })}
                    className={classe}
                  >
                    {miolo}
                  </Link>
                );
              })}
            </div>
            {si === 0 && <div className="mt-6"><OrbiRecommendation businessId={business.id} onOrbi={onOrbi} /></div>}
          </div>
        ))}
      </div>
      <BarraContato business={business} sessionId={sessionId} onOrbi={onOrbi} />
    </>
  );
}
