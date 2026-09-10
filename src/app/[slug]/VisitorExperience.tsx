"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { OrbiFloatingButton } from "./OrbiFloatingButton";
import { CuradoriaOrbi } from "./CuradoriaOrbi";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { OrbiContactDisc } from "@/components/orbi/OrbiContactDisc";
import { OrbiMapPin } from "@/components/orbi/OrbiMapPin";
import { OrbiAvatar } from "@/components/orbi/OrbiAvatar";
import { COVER_RATIO_BY_SIZE, colorOf, formatPrice, groupByCategory, sizeOf, titleFontSize, youtubeId, instagramReelId } from "@/lib/showcase";
import { BOX_DEFAULT_DESCRIPTION } from "@/lib/boxDefaults";
import { RATIOS } from "@/components/ui/ImageCropModal";
import { trackClick, whatsappLink } from "@/lib/track";
import { OrbiInsightCard, OrbiInsightHeader, OrbiInsightMessage, OrbiSparkleMini, orbiInsightCtaClass } from "@/components/orbi/OrbiInsightCard";
import { homeCardShellClass, HomeOptionCardContent } from "@/components/orbi/HomeOptionCard";

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
  address: string | null;
  story_photos: string[];
  vitrine_cover_urls: string[];
  hero_question: string | null;
  logo_url: string | null;
  hero_avatar: string | null;
  hero_gradient: unknown;
  catalog_title: string | null;
  catalog_subtitle: string | null;
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
  footer_color: string | null;
  box_style: string;
  title_placement: string;
  target_url: string | null;
  link_kind: string | null;
};

type Intent = "comprar" | "conhecer" | "presentear" | "duvida" | "cupom";
type BoxRow = { id: string; box_type: string; title: string | null; is_active: boolean; position: number; config: unknown };
type CustomConfig = { label?: string; subtitle?: string; icon?: string; color?: string; action?: "vitrine" | "zara" | "whatsapp" | "link" | "avaliar" | "endereco" | "cupom"; url?: string; logo_url?: string; layout?: "auto" | "largo" | "medio" };

// Cada Smart Box vira um caminho na tela inicial.
const BOX_TO_OPTION: Record<string, { k: Intent; icon: string; t: string; d: string; ai?: boolean }> = {
  product: { k: "comprar", icon: "▤", t: "O que fazemos", d: BOX_DEFAULT_DESCRIPTION.product },
  content: { k: "conhecer", icon: "◫", t: "Conhecer", d: BOX_DEFAULT_DESCRIPTION.content },
  campaign: { k: "presentear", icon: "◈", t: "Presentear", d: BOX_DEFAULT_DESCRIPTION.campaign },
  agent: { k: "duvida", icon: "__orb__", t: "Pergunte o que quiser", d: BOX_DEFAULT_DESCRIPTION.agent, ai: true },
};

export function VisitorExperience({
  business,
  content,
  boxes,
  agentName,
  orbiColors,
  isOwner,
  hasAiChat,
  hasVouchers,
  suggestedQuestions = [],
}: {
  business: Business;
  content: ContentItem[];
  boxes: BoxRow[];
  agentName: string;
  orbiColors: string[] | null;
  isOwner: boolean;
  hasAiChat: boolean;
  hasVouchers: boolean;
  suggestedQuestions?: string[];
}) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Cópia local editável dos boxes — o dono pode reordenar e renomear direto
  // na Home (sem precisar ir pro painel), e isso atualiza tanto a tela na
  // hora quanto o banco.
  const [boxList, setBoxList] = useState<BoxRow[]>(boxes);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  // Pergunta digitada na tela cheia da CuradoriaOrbi — passa pro campo do
  // chat real já preenchida, pronta pra mandar, em vez de perder o que a
  // pessoa escreveu.
  const [orbiPrefill, setOrbiPrefill] = useState<string | undefined>(undefined);
  // Box de endereço expande direto na Home (sem navegar pra outra tela) —
  // guarda qual box está expandido agora (ou null se nenhum).
  const [expandedBox, setExpandedBox] = useState<string | null>(null);

  useEffect(() => {
    // Detecta origem e dispositivo do visitante — antes era fixo "direct/web",
    // o que não dizia nada. Origem vem do referrer (de onde a pessoa clicou)
    // ou de um ?utm_source= no link; dispositivo, do user agent.
    const detectarOrigem = (): string => {
      const utm = new URLSearchParams(window.location.search).get("utm_source");
      if (utm) return utm.toLowerCase();
      const ref = document.referrer;
      if (!ref) return "direto";
      try {
        const host = new URL(ref).hostname.replace(/^www\./, "");
        if (host.includes("instagram")) return "instagram";
        if (host.includes("google")) return "google";
        if (host.includes("facebook") || host.includes("fb.")) return "facebook";
        if (host.includes("tiktok")) return "tiktok";
        if (host.includes("youtube")) return "youtube";
        if (host.includes("wa.me") || host.includes("whatsapp")) return "whatsapp";
        if (host.includes("t.co") || host.includes("twitter") || host === "x.com") return "twitter/x";
        if (host.includes("linkedin")) return "linkedin";
        // Mesmo domínio = navegação interna, não conta como origem externa.
        if (host === window.location.hostname.replace(/^www\./, "")) return "direto";
        return host;
      } catch {
        return "direto";
      }
    };

    const detectarDispositivo = (): string => {
      const ua = navigator.userAgent;
      if (/iPad|Tablet/i.test(ua)) return "tablet";
      if (/Mobi|Android|iPhone/i.test(ua)) return "celular";
      return "computador";
    };

    supabase
      .from("visitor_sessions")
      .insert({ business_id: business.id, source: detectarOrigem(), device: detectarDispositivo(), referrer: document.referrer || null })
      .select("id")
      .single()
      .then(({ data }) => data && setSessionId(data.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vem de um link "Falar com a Orbi" de outra página (ex: página de produto)
  // com ?chat=1 — abre o chat direto, sem passar pela tela de escolha.
  // ?tab=conhecer faz o mesmo pra página "Sobre" (ex: link do painel, depois
  // de montar a página Sobre completa com a Orbi).
  useEffect(() => {
    const chat = searchParams.get("chat");
    const tab = searchParams.get("tab");
    if (chat === "1" && hasAiChat) chooseIntent("duvida");
    else if (tab === "conhecer") chooseIntent("conhecer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Só aparecem os caminhos que o dono deixou ativos em Smart Boxes —
  // mistura os fixos com os personalizados, na ordem que o dono escolheu.
  type Option = { key: string; icon: string; boxLogo?: string | null; t: string; d: string; color?: string; ai?: boolean; stars?: boolean; address?: string; layoutOverride?: "largo" | "medio"; onClick: () => void };
  const options: Option[] = boxList
    .filter((b) => b.is_active && (BOX_TO_OPTION[b.box_type] || b.box_type === "custom"))
    .filter((b) => {
      if (hasAiChat) return true;
      if (b.box_type === "agent") return false;
      const cfg = (b.config ?? {}) as CustomConfig;
      if (b.box_type === "custom" && cfg.action === "zara") return false;
      if (b.box_type === "custom" && cfg.action === "cupom" && !hasVouchers) return false;
      return true;
    })
    .sort((a, b) => a.position - b.position)
    .map((b): Option | null => {
      const cfg = (b.config ?? {}) as CustomConfig;
      if (b.box_type === "custom") {
        const label = cfg.label || b.title || "Link";
        const onClick = () => {
          if (cfg.action === "vitrine") chooseIntent("comprar");
          else if (cfg.action === "zara") chooseIntent("duvida");
          else if (cfg.action === "whatsapp") {
            // O campo pode vir como número cru ("15997587720") ou já como
            // link (wa.me/... ). Se não for um link http, monta via whatsappLink.
            const raw = cfg.url?.trim() || business.contact_whatsapp || "";
            const link = raw
              ? (/^https?:\/\//i.test(raw) ? raw : whatsappLink(raw, `Olá! Vim pelo ${business.name}.`))
              : null;
            if (link) { trackClick({ businessId: business.id, kind: "whatsapp", sessionId }); window.open(link, "_blank"); }
          } else if (cfg.action === "avaliar") {
            if (cfg.url) {
              trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: cfg.url });
              window.open(/^https?:\/\//i.test(cfg.url) ? cfg.url : `https://${cfg.url}`, "_blank");
            }
          } else if (cfg.action === "endereco") {
            const addr = cfg.url?.trim() || business.address;
            if (addr) {
              trackClick({ businessId: business.id, kind: "link", sessionId });
              setExpandedBox((prev) => (prev === b.id ? null : b.id));
            }
          } else if (cfg.action === "cupom") {
            chooseIntent("cupom");
          } else if (cfg.url) {
            trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: cfg.url });
            window.open(/^https?:\/\//i.test(cfg.url) ? cfg.url : `https://${cfg.url}`, "_blank");
          }
        };
        return { key: b.id, icon: cfg.icon || "◆", boxLogo: cfg.logo_url ?? null, t: label, d: cfg.subtitle || "", color: cfg.color, stars: cfg.action === "avaliar", address: cfg.action === "endereco" ? (cfg.url?.trim() || business.address || undefined) : undefined, layoutOverride: cfg.layout === "auto" ? undefined : cfg.layout, onClick };
      }
      const base = BOX_TO_OPTION[b.box_type];
      // "Sobre" sugere o nome da marca quando o dono não personalizou — igual ao editor.
      const fallbackLabel = b.box_type === "content" ? `Sobre a ${business.name}` : base.t;
      return { key: b.id, icon: cfg.icon || base.icon, boxLogo: cfg.logo_url ?? null, t: cfg.label || fallbackLabel, d: cfg.subtitle?.trim() || base.d, color: cfg.color, ai: base.ai, layoutOverride: cfg.layout === "auto" ? undefined : cfg.layout, onClick: () => chooseIntent(base.k) };
    })
    .filter((o): o is Option => o !== null);

  async function chooseIntent(value: Intent, prefill?: string) {
    if (value === "duvida" && !hasAiChat) return;
    setOrbiPrefill(prefill);
    setIntent(value);
    if (sessionId) {
      await supabase.from("visitor_sessions").update({ intent: value }).eq("id", sessionId);
    }
  }

  // Reordenar direto na Home — troca a posição desse box com o vizinho na
  // direção pedida (dentre os que aparecem na tela agora).
  async function moveOption(key: string, dir: -1 | 1) {
    const idx = options.findIndex((o) => o.key === key);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= options.length) return;
    const boxA = boxList.find((b) => b.id === options[idx].key);
    const boxB = boxList.find((b) => b.id === options[swapIdx].key);
    if (!boxA || !boxB) return;
    setBoxList((prev) => prev.map((b) => (b.id === boxA.id ? { ...b, position: boxB.position } : b.id === boxB.id ? { ...b, position: boxA.position } : b)));
    await Promise.all([
      supabase.from("smart_boxes").update({ position: boxB.position }).eq("id", boxA.id),
      supabase.from("smart_boxes").update({ position: boxA.position }).eq("id", boxB.id),
    ]);
  }

  function startEditTitle(key: string, current: string) {
    setEditingBoxId(key);
    setTitleDraft(current);
  }

  async function saveTitle(key: string) {
    setEditingBoxId(null);
    const trimmed = titleDraft.trim();
    const box = boxList.find((b) => b.id === key);
    if (!box || !trimmed) return;
    const cfg = (box.config ?? {}) as CustomConfig;
    if (cfg.label === trimmed) return;
    const nextCfg: CustomConfig = { ...cfg, label: trimmed };
    setBoxList((prev) => prev.map((b) => (b.id === key ? { ...b, title: trimmed, config: nextCfg } : b)));
    await supabase.from("smart_boxes").update({ title: trimmed, config: nextCfg }).eq("id", key);
  }

  const heroGradient = Array.isArray(business.hero_gradient) && business.hero_gradient.length >= 2
    ? (business.hero_gradient as string[])
    : ["#B7F34A", "#6EE7D8"];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background-main">
      {/* Nada de cor no topo — qualquer toque, mesmo bem sutil, cria uma forma
          redonda que destoa do fundo plano atrás da esfera. Fica só o cinza
          claro puro aqui em cima, sempre, independente da paleta escolhida. */}

      {/* Halo suave — atmosfera "líquida". Fica na parte de baixo da tela,
          longe do avatar, pra não brigar de contraste com ele. */}
      <div
        className="pointer-events-none absolute -bottom-56 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full opacity-25 blur-[80px]"
        style={{ backgroundImage: `linear-gradient(135deg, ${heroGradient[0]}, ${heroGradient[1]})` }}
      />

      {/* O dono, navegando o próprio link, ganha um atalho de volta pro painel —
          só na tela inicial. Escondido nos overlays (chat, catálogo, sobre)
          porque senão fica borrado atrás do fundo semitransparente deles. */}
      {isOwner && intent === null && (
        <Link
          href="/admin"
          className="fixed right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-on-background/90 px-3.5 py-2 text-[13px] font-medium text-white shadow-lg backdrop-blur"
        >
          ← Meu painel
        </Link>
      )}

      <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col items-center justify-center px-6 py-16">
        {intent === null && (
          <div className="flex flex-col items-center text-center">
            {business.hero_avatar === "particle" ? (
              <OrbiParticleSphere size={96} colors={orbiColors ?? undefined} className="mb-8 rounded-full" />
            ) : business.hero_avatar === "logo" && business.logo_url ? (
              <OrbiAvatar logoUrl={business.logo_url} size={96} className="mb-8" />
            ) : business.hero_avatar === "sphere" ? (
              <OrbiOrb size={96} className="mb-8" />
            ) : business.logo_url ? (
              // "auto" (padrão): mantém o comportamento de sempre — logo se tiver, senão a esfera.
              <OrbiAvatar logoUrl={business.logo_url} size={96} className="mb-8" />
            ) : (
              <OrbiOrb size={96} className="mb-8" />
            )}
            <p className="text-[14px] uppercase tracking-wide text-text-tertiary">
              {business.name}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[32px] font-medium leading-[1.1] tracking-[-0.02em]">
              {business.hero_question?.trim() ? (
                business.hero_question
              ) : (
                <>
                  O que trouxe você
                  <br />
                  aqui hoje?
                </>
              )}
            </h1>
            <div className="mt-10 grid w-full grid-cols-2 gap-3">
              {(() => {
                // Distribuição mista: cada opção recebe "largo" (linha toda,
                // card horizontal e compacto) ou "medio" (metade, card
                // vertical). Só forma par de médios quando o próximo item
                // também pode ser médio — nunca deixa um médio sozinho na
                // linha (isso é que deixava espaço vazio do lado). Endereço,
                // itens com estrela, e boxes com formato "Largo" escolhido
                // manualmente no admin são sempre largos.
                const withLayout: { o: (typeof options)[number]; largo: boolean }[] = [];
                for (let i = 0; i < options.length; i++) {
                  const o = options[i];
                  const forcaLargo = !!o.address || !!o.stars || o.layoutOverride === "largo";
                  if (forcaLargo) {
                    withLayout.push({ o, largo: true });
                    continue;
                  }
                  const proximo = options[i + 1];
                  const proximoForcaLargo = proximo ? (!!proximo.address || !!proximo.stars || proximo.layoutOverride === "largo") : true;
                  if (proximo && !proximoForcaLargo) {
                    withLayout.push({ o, largo: false }, { o: proximo, largo: false });
                    i++;
                  } else {
                    // Sozinho (sem par pra formar médio+médio) — vira largo
                    // em vez de ficar isolado ocupando só metade da linha.
                    withLayout.push({ o, largo: true });
                  }
                }
                return withLayout.map(({ o, largo }) => {
                  const isEditingThis = editingBoxId === o.key;
                  const titleNode = isEditingThis ? (
                    <input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => saveTitle(o.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditingBoxId(null);
                      }}
                      autoFocus
                      className="w-full rounded-lg border border-on-background/20 bg-white px-2 py-1 text-[15px] font-semibold outline-none"
                    />
                  ) : (
                    <>
                      {o.t}{o.ai ? <span className="orbi-gradient-text"> ✦</span> : null}
                      {isOwner && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); startEditTitle(o.key, o.t); }}
                          className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-soft text-[10px] align-middle text-text-tertiary"
                          aria-label="Editar título"
                        >
                          ✎
                        </span>
                      )}
                    </>
                  );
                  return (
                  <div key={o.key} className={`relative ${largo ? "col-span-2" : "col-span-1"}`}>
                    {isOwner && (
                      <div className="absolute right-2.5 top-2.5 z-10 flex gap-1">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); moveOption(o.key, -1); }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-text-secondary shadow-[0_1px_6px_rgba(17,19,24,0.15)]"
                          aria-label="Mover pra cima"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); moveOption(o.key, 1); }}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-text-secondary shadow-[0_1px_6px_rgba(17,19,24,0.15)]"
                          aria-label="Mover pra baixo"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                        </span>
                      </div>
                    )}
                    {largo ? (
                      // Card LARGO — horizontal (ícone + texto na linha)
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !isEditingThis && o.onClick()}
                        onKeyDown={(e) => { if (!isEditingThis && (e.key === "Enter" || e.key === " ")) o.onClick(); }}
                        className={homeCardShellClass("largo", o.ai)}
                      >
                        <HomeOptionCardContent
                          layout="largo"
                          icon={o.icon}
                          boxLogo={o.boxLogo}
                          color={o.color}
                          orbiColors={orbiColors}
                          businessLogo={business.logo_url}
                          titleNode={titleNode}
                          ai={o.ai}
                          stars={o.stars}
                          description={o.ai ? `Fale com a ${agentName}, nossa IA.` : o.d}
                          addressIndicator={o.address ? (expandedBox === o.key ? "▾" : "▸") : undefined}
                        />
                      </div>
                    ) : (
                      // Card MÉDIO — vertical (ícone em cima, texto embaixo).
                      // O título tem altura mínima de 2 linhas sempre — assim
                      // a descrição começa na mesma altura nos dois cards da
                      // dupla, mesmo quando um título quebra em 2 linhas e o
                      // outro cabe numa só.
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !isEditingThis && o.onClick()}
                        onKeyDown={(e) => { if (!isEditingThis && (e.key === "Enter" || e.key === " ")) o.onClick(); }}
                        className={homeCardShellClass("medio", o.ai)}
                      >
                        <HomeOptionCardContent
                          layout="medio"
                          icon={o.icon}
                          boxLogo={o.boxLogo}
                          color={o.color}
                          orbiColors={orbiColors}
                          businessLogo={business.logo_url}
                          titleNode={titleNode}
                          ai={o.ai}
                          stars={o.stars}
                          description={o.ai ? `Fale com a ${agentName}.` : o.d}
                        />
                      </div>
                    )}
                    {/* Endereço expande embaixo */}
                    {o.address && expandedBox === o.key && (
                      <div className="-mt-1 rounded-b-[24px] bg-surface-white px-5 pb-5 pt-1 shadow-[0_2px_12px_rgba(17,19,24,0.05)]">
                        <div className="border-t border-divider pt-3">
                          <p className="text-[14px] leading-relaxed text-text-secondary">{o.address}</p>
                          <div className="mt-3 flex gap-2">
                            <a href={`https://waze.com/ul?q=${encodeURIComponent(o.address)}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Abrir no Waze</a>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Abrir no Google</a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                });
              })()}
              {options.length === 0 && (
                <div className="col-span-2 rounded-[24px] bg-surface-white p-5 text-center shadow-[0_2px_12px_rgba(17,19,24,0.05)]">
                  <p className="text-[14px] font-medium">Ainda não tem nada por aqui</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-text-tertiary">
                    Essa página está sendo montada. Volta mais tarde pra conferir.
                  </p>
                </div>
              )}
            </div>

            {hasAiChat && content.length >= 3 && (
              <div className="mt-6 w-full">
                <CuradoriaOrbi businessId={business.id} slug={business.slug} orbiColors={orbiColors} products={content} agentName={agentName} onAskOrbi={hasAiChat ? (q) => chooseIntent("duvida", q) : undefined} />
              </div>
            )}
          </div>
        )}

        {(intent === "comprar" || intent === "presentear") && (
          <div className="w-full">
            <VitrineCoverBleed business={business} />
            <button onClick={() => setIntent(null)} className="mb-5 mt-5 text-[14px] text-text-tertiary hover:underline">← voltar</button>
            <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-medium tracking-[-0.01em]">
              {intent === "presentear" ? "Para presentear" : (business.catalog_title || `${business.name} — Catálogo`)}
            </h2>
            <p className="mt-1 text-[15px] text-text-secondary">
              {intent === "presentear" ? "Seleções que fazem sentido para dar de presente" : (business.catalog_subtitle || "Explore nossas soluções.")}
            </p>

            {hasAiChat && content.length >= 3 && (
              <div className="mt-5">
                <CuradoriaOrbi businessId={business.id} slug={business.slug} orbiColors={orbiColors} products={content} agentName={agentName} onAskOrbi={hasAiChat ? (q) => chooseIntent("duvida", q) : undefined} compact />
              </div>
            )}

            {content.length === 0 ? (
              <Card className="mt-6 text-[15px] text-text-secondary">Ainda não há produtos publicados por aqui.</Card>
            ) : (
              <Showcase content={content} business={business} sessionId={sessionId} onOrbi={hasAiChat ? () => chooseIntent("duvida") : undefined} />
            )}
          </div>
        )}

        {intent === "conhecer" && (
          <StoryView
            business={business}
            onBack={() => setIntent(null)}
            onCatalog={() => chooseIntent("comprar")}
            onOrbi={hasAiChat ? () => chooseIntent("duvida") : undefined}
            sessionId={sessionId}
          />
        )}

        {intent === "duvida" && sessionId && (
          <OrbiChat businessId={business.id} slug={business.slug} sessionId={sessionId} agentName={agentName} orbiColors={orbiColors} heroGradient={heroGradient} content={content} whatsapp={business.contact_whatsapp} address={business.address ?? null} suggestedQuestions={suggestedQuestions} initialInput={orbiPrefill} onBack={() => setIntent(null)} />
        )}

        {intent === "cupom" && (
          <CupomFlow business={business} sessionId={sessionId} onBack={() => setIntent(null)} />
        )}
      </div>

      {/* Orbi flutuante — sempre à mão, exceto quando o chat já está aberto ou
          o dono está visualizando a própria página. Só pra quem tem chat. */}
      {hasAiChat && intent !== null && intent !== "duvida" && sessionId && (
        <OrbiFloatingButton onOpen={() => chooseIntent("duvida")} orbiColors={orbiColors} agentName={agentName} />
      )}
    </main>
  );
}

type VoucherPublic = { id: string; title: string; description: string | null; discount_type: string; discount_value: number; quantity_total: number; quantity_claimed: number };

function voucherDiscountLabel(v: Pick<VoucherPublic, "discount_type" | "discount_value">) {
  return v.discount_type === "percent" ? `${v.discount_value}% de desconto` : `R$ ${v.discount_value} de desconto`;
}

/** Tela de cupons — lista os ativos, deixa a pessoa resgatar (nome +
 * WhatsApp) e mostra o código único que ela leva até o negócio. */
function CupomFlow({ business, sessionId, onBack }: { business: Business; sessionId: string | null; onBack: () => void }) {
  const supabase = createClient();
  const [vouchers, setVouchers] = useState<VoucherPublic[] | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [result, setResult] = useState<{ code: string; title: string; expiresAt: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("vouchers")
      .select("id, title, description, discount_type, discount_value, quantity_total, quantity_claimed")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .then(({ data }) => setVouchers((data as VoucherPublic[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  async function resgatar(voucherId: string) {
    setError(null);
    try {
      const res = await fetch("/api/vouchers/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId, name: name.trim() || null, whatsapp: whatsapp.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível resgatar esse cupom.");
        return;
      }
      trackClick({ businessId: business.id, kind: "cupom", sessionId });
      setResult({ code: data.code, title: data.title, expiresAt: data.expires_at });
      setClaiming(null);
    } catch {
      setError("Erro de conexão ao resgatar o cupom.");
    }
  }

  return (
    <div className="w-full">
      <button onClick={onBack} className="mb-5 mt-5 text-[14px] text-text-tertiary hover:underline">← voltar</button>
      <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-medium tracking-[-0.01em]">Cupons</h2>

      {result ? (
        <div className="mt-5 rounded-[24px] bg-surface-white p-6 text-center shadow-[0_2px_14px_rgba(17,19,24,0.06)]">
          <p className="text-[14px] text-text-secondary">{result.title}</p>
          <p className="mt-2 font-[family-name:var(--font-manrope)] text-[36px] font-bold tracking-[0.05em]">{result.code}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-tertiary">
            Mostre esse código pro {business.name} — no balcão ou pelo WhatsApp — pra usar o desconto.
            {result.expiresAt && ` Vale até ${new Date(result.expiresAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.`}
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {vouchers === null && <p className="text-[14px] text-text-tertiary">Carregando…</p>}
          {vouchers?.length === 0 && <p className="text-[14px] text-text-tertiary">Nenhum cupom disponível no momento.</p>}
          {vouchers?.map((v) => {
            const restam = v.quantity_total - v.quantity_claimed;
            return (
              <div key={v.id} className="rounded-[22px] bg-surface-white p-4 shadow-[0_2px_14px_rgba(17,19,24,0.06)]">
                <p className="text-[15px] font-medium">{v.title}</p>
                <p className="mt-0.5 text-[14px] text-text-secondary">{voucherDiscountLabel(v)}</p>
                {v.description?.trim() && <p className="mt-1 text-[13px] text-text-tertiary">{v.description}</p>}
                <p className="mt-1 text-[12px] text-text-tertiary">{restam > 0 ? `${restam} restantes` : "Esgotado"}</p>

                {claiming === v.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="rounded-xl border border-divider px-3 py-2 text-[14px] outline-none focus:border-on-background" />
                    <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Seu WhatsApp (opcional)" className="rounded-xl border border-divider px-3 py-2 text-[14px] outline-none focus:border-on-background" />
                    {error && <p className="text-[13px] text-red-600">{error}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => { setClaiming(null); setError(null); }} className="flex-1 rounded-full bg-surface-soft py-2 text-[13px] font-medium">Cancelar</button>
                      <button onClick={() => resgatar(v.id)} className="flex-1 rounded-full bg-button-primary py-2 text-[13px] font-medium text-white">Confirmar</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setClaiming(v.id); setError(null); }}
                    disabled={restam <= 0}
                    className="mt-3 w-full rounded-full bg-button-primary py-2.5 text-[14px] font-medium text-white disabled:opacity-40"
                  >
                    {restam > 0 ? "Resgatar" : "Esgotado"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Card de endereço — pin animado, texto, e botões pra abrir no Waze ou
 * Google Maps. Usado na página "Sobre" e no box de endereço avulso. */
function AddressCard({ address }: { address: string }) {
  return (
    <div className="mt-6">
      <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Endereço</p>
      <div className="mt-2 rounded-[18px] bg-surface-white p-4 shadow-[0_2px_14px_rgba(17,19,24,0.06)]">
        <div className="flex items-start gap-3">
          <OrbiMapPin size={26} className="shrink-0" />
          <span className="text-[14px] leading-relaxed text-text-secondary">{address}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <a
            href={`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium"
          >
            Abrir no Waze
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium"
          >
            Abrir no Google
          </a>
        </div>
      </div>
    </div>
  );
}

function StoryView({
  business,
  onBack,
  onCatalog,
  onOrbi,
  sessionId,
}: {
  business: Business;
  onBack: () => void;
  onCatalog: () => void;
  onOrbi?: () => void;
  sessionId: string | null;
}) {
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
      <button onClick={onBack} className="mb-4 text-[14px] text-text-tertiary hover:underline">
        ← voltar
      </button>

      {photos.length > 0 && (
        <>
          {(() => {
            const slideAspects = photos.map((src) => (instagramReelId(src) ? 9 / 16 : 16 / 9));
            return (
          <div
            className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto no-scrollbar transition-[aspect-ratio] duration-300 ease-out"
            style={{ aspectRatio: slideAspects[active] ?? 16 / 9 }}
            onScroll={(e) => {
              const w = e.currentTarget.clientWidth || 1;
              setActive(Math.round(e.currentTarget.scrollLeft / w));
            }}
          >
            {photos.map((src, i) => {
              const ytId = youtubeId(src);
              const igId = instagramReelId(src);
              return (
                <div key={i} className="relative h-full w-full shrink-0 snap-center overflow-hidden rounded-[22px] bg-surface-soft">
                  {ytId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                      title={`${business.name} — vídeo ${i + 1}`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : igId ? (
                    <iframe
                      src={`https://www.instagram.com/reel/${igId}/embed`}
                      title={`${business.name} — reels ${i + 1}`}
                      className="h-full w-full"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={business.name} className="h-full w-full object-cover" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
            );
          })()}
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
          <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Sobre nós</p>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{business.about_business}</p>
        </div>
      )}

      {cards.length > 0 && (
        <div className="mt-6">
          <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Diferenciais</p>
          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar pb-1">
            {cards.map((c, i) => (
              <div key={i} className="w-[220px] shrink-0 snap-start rounded-[22px] bg-surface-white p-4 shadow-[0_2px_14px_rgba(17,19,24,0.06)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-soft text-[18px]">{c.icon || "◎"}</span>
                <p className="mt-3 font-[family-name:var(--font-manrope)] text-[16px] font-semibold leading-snug">{c.title}</p>
                {c.description && <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">{c.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {business.address && <AddressCard address={business.address} />}

      {/* Três caminhos a partir daqui: ver o catálogo, WhatsApp, ou conversar com a IA. */}
      <div className="mt-8 flex flex-col gap-2.5">
        <button
          onClick={onCatalog}
          className="flex items-center justify-center gap-2 rounded-full bg-button-primary py-3.5 text-[14px] font-medium text-white"
        >
          Ir para o catálogo →
        </button>
        {business.contact_whatsapp && (
          <a
            href={whatsappLink(business.contact_whatsapp, `Olá! Vim pelo ${business.name}.`)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick({ businessId: business.id, kind: "whatsapp", sessionId })}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-[#25D366] bg-surface-white py-3.5 text-[14px] font-medium text-on-background"
          >
            <OrbiContactDisc size={22} /> WhatsApp
          </a>
        )}
        {onOrbi && (
          <button
            onClick={onOrbi}
            className="flex items-center justify-center gap-2 rounded-full border border-divider bg-surface-white py-3.5 text-[14px] font-medium"
          >
            ✦ Conversar com a Orbi
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Transforma o texto puro da IA em parágrafos, listas com marcador e
 * **negrito** de verdade — em vez de um bloco só, apertado e sem cor.
 */
// Ícone das opções da tela inicial — cobre os tipos especiais (esfera, google,
// pin, logo) e os emojis/letras comuns.
function formatMessage(text: string, products?: ContentItem[], slug?: string, businessId?: string, sessionId?: string | null, address?: string | null) {
  // Extrai marcações [[produto:ID]] e [[endereco]] e as troca por cards.
  const productIds: string[] = [];
  let showAddress = false;
  const cleaned = text
    .replace(/\[\[produto:([^\]]+)\]\]/g, (_, id) => {
      productIds.push(String(id).trim());
      return "";
    })
    .replace(/\[\[endereco\]\]/gi, () => {
      showAddress = true;
      return "";
    });

  const cards = productIds
    .map((id) => products?.find((p) => p.id === id))
    .filter((p): p is ContentItem => !!p);

  const blocks = cleaned.split(/\n{2,}/).filter((b) => b.trim() !== "");
  const textNodes = blocks.map((block, bi) => {
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

  return (
    <>
      {textNodes}
      {showAddress && address && <AddressCard address={address} />}
      {cards.map((p) => {
        const destino = (p.link_kind ?? "produto") === "produto" ? `/${slug}/p/${p.id}` : (p.target_url || `/${slug}`);
        return (
          <a
            key={p.id}
            href={destino}
            onClick={() => businessId && trackClick({ businessId, kind: "produto", contentItemId: p.id, sessionId })}
            className="mt-1.5 flex items-center gap-3.5 overflow-hidden rounded-2xl bg-surface-white p-2.5 shadow-[0_2px_12px_rgba(17,19,24,0.08)] ring-1 ring-black/5"
          >
            {p.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt={p.title} className="h-18 w-18 shrink-0 rounded-xl object-cover" style={{ height: 72, width: 72 }} />
            ) : (
              <span className="flex shrink-0 items-center justify-center rounded-xl bg-surface-soft text-[22px]" style={{ height: 72, width: 72 }}>✦</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-on-background">{p.title}</span>
              <span className="block text-[14px] text-text-secondary">{formatPrice(p) || "Ver detalhes"}</span>
            </span>
            <span className="shrink-0 pr-1 text-[18px] text-text-tertiary">→</span>
          </a>
        );
      })}
    </>
  );
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
  slug,
  sessionId,
  agentName,
  orbiColors,
  heroGradient,
  content,
  whatsapp,
  address,
  suggestedQuestions,
  initialInput,
  onBack,
}: {
  businessId: string;
  slug: string;
  sessionId: string;
  agentName: string;
  orbiColors: string[] | null;
  heroGradient: string[];
  content: ContentItem[];
  whatsapp: string | null;
  address: string | null;
  suggestedQuestions: string[];
  initialInput?: string;
  onBack: () => void;
}) {
  const supabase = createClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState(initialInput ?? "");
  const [sending, setSending] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");

  // Trava o scroll da página por trás enquanto o chat (overlay fixed) está
  // aberto — sem isso, no iOS o dedo "vaza" pro fundo e a página de trás
  // rola junto, mesmo com o chat cobrindo a tela inteira. Restaura a posição
  // exata de onde a pessoa estava ao fechar.
  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Sugestões puxadas do que existe de verdade no negócio — nunca genéricas.
  // Prioriza itens variados (categorias diferentes) pra cobrir mais opções.
  // Só 5 — o suficiente pra caber na tela sem precisar rolar, com a barra de
  // digitar sempre visível.
  const QUICK = (() => {
    // Se o dono configurou perguntas no painel, usa elas (até 4).
    if (suggestedQuestions && suggestedQuestions.length > 0) {
      return suggestedQuestions.slice(0, 4);
    }
    // Senão, a Orbi gera automaticamente a partir do catálogo — itens de
    // categorias variadas pra cobrir mais opções. Só 4.
    const published = [...content].sort((a, b) => a.position - b.position);
    const seen = new Set<string>();
    const picks: string[] = [];
    for (const item of published) {
      const cat = item.brand_label?.trim() || "";
      if (seen.has(cat) && cat) continue;
      if (cat) seen.add(cat);
      picks.push(item.title);
      if (picks.length === 4) break;
    }
    if (picks.length < 4) {
      for (const item of published) {
        if (picks.length === 4) break;
        if (!picks.includes(item.title)) picks.push(item.title);
      }
    }
    if (picks.length === 0) {
      return ["Quero saber mais sobre vocês", "Como funciona", "Quais os valores", "Quero falar com alguém"];
    }
    return picks;
  })();

  useEffect(() => {
    // Retoma a conversa anterior desse visitante (guardada no localStorage),
    // carregando o histórico — assim, ao reabrir o chat em qualquer página, a
    // pessoa continua de onde parou em vez de começar do zero.
    let cancelled = false;
    async function initConversa() {
      let savedId: string | null = null;
      try { savedId = localStorage.getItem(`orbi_conv_${businessId}`); } catch { /* ignora */ }

      if (savedId) {
        // Confere se a conversa ainda existe e carrega as mensagens dela.
        const { data: conv } = await supabase.from("conversations").select("id").eq("id", savedId).maybeSingle();
        if (conv && !cancelled) {
          const { data: msgs } = await supabase
            .from("messages")
            .select("role, content")
            .eq("conversation_id", savedId)
            .order("created_at", { ascending: true });
          if (!cancelled) {
            setConversationId(savedId);
            if (msgs && msgs.length > 0) setMessages(msgs.map((m) => ({ role: m.role, content: m.content })));
          }
          return;
        }
      }

      // Sem conversa salva (ou expirada): cria uma nova e guarda o id.
      const { data } = await supabase
        .from("conversations")
        .insert({ business_id: businessId, visitor_session_id: sessionId, channel: "web" })
        .select("id")
        .single();
      if (data && !cancelled) {
        setConversationId(data.id);
        try { localStorage.setItem(`orbi_conv_${businessId}`, data.id); } catch { /* ignora */ }
      }
    }
    initConversa();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efeito de "alguém digitando" no placeholder do campo — só decorativo,
  // some assim que a pessoa toca pra escrever de verdade.
  useEffect(() => {
    const FULL_TEXT = "Comece a digitar aqui, vamos conversar.";
    let i = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;
    function tick() {
      if (!deleting) {
        i++;
        setTypedPlaceholder(FULL_TEXT.slice(0, i));
        if (i === FULL_TEXT.length) {
          timeout = setTimeout(() => { deleting = true; tick(); }, 1800);
          return;
        }
        timeout = setTimeout(tick, 45);
      } else {
        i--;
        setTypedPlaceholder(FULL_TEXT.slice(0, i));
        if (i === 0) {
          deleting = false;
          timeout = setTimeout(tick, 600);
          return;
        }
        timeout = setTimeout(tick, 25);
      }
    }
    timeout = setTimeout(tick, 400);
    return () => clearTimeout(timeout);
  }, []);

  async function sendText(text: string) {
    if (!text.trim() || !conversationId || sending) return;
    const historyForApi = messages;
    setInput("");
    setMessages((prev) => [...prev, { role: "visitor", content: text }]);
    setSending(true);
    setJustDone(false);
    await supabase.from("messages").insert({ conversation_id: conversationId, role: "visitor", content: text });
    try {
      const res = await fetch("/api/orbi-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, conversationId, message: text, history: historyForApi }),
      });
      const data = await res.json();
      const reply = res.ok && data.reply ? data.reply : "Desculpa, tive um problema aqui — pode tentar de novo?";
      // Ao terminar: mostra o check por um instante ("pronto") antes de exibir a resposta.
      setJustDone(true);
      setMessages((prev) => [...prev, { role: "agent", content: reply }]);
      window.setTimeout(() => setJustDone(false), 1400);
    } finally {
      setSending(false);
    }
  }

  const started = messages.length > 0;

  // Auto-scroll só DEPOIS que a conversa começou — enquanto está nas sugestões,
  // o visitante rola livremente. Rolar pro fim só quando chega mensagem/pensa.
  useEffect(() => {
    if (!started && !sending) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending, justDone, started]);

  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-[440px] flex-col overflow-hidden bg-background-main">
      {/* Nada de cor no topo aqui também — mesmo motivo da tela inicial. */}

      {/* Mesmo halo da tela inicial, pra não ficar um fundo parado/liso aqui —
          a marca continua presente mesmo depois de abrir o chat. */}
      <div
        className="pointer-events-none absolute -bottom-56 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full opacity-25 blur-[80px]"
        style={{ backgroundImage: `linear-gradient(135deg, ${heroGradient[0]}, ${heroGradient[1]})` }}
      />

      {/* Fechar — z-index acima do conteúdo pra o toque nunca ser bloqueado */}
      <button
        onClick={onBack}
        className="absolute left-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-surface-white text-[16px] shadow"
        aria-label="Fechar"
      >
        ×
      </button>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pb-40 pt-20" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Avatar — a esfera configurada da Orbi, não mais a esfera de vidro genérica. */}
        <div className="mx-auto relative">
          <OrbiParticleSphere size={112} colors={orbiColors ?? undefined} className="rounded-full" />
          <span className="absolute bottom-3 right-3 h-4 w-4 rounded-full border-2 border-surface-white bg-orbi-gradient-start" />
        </div>
        <p className="mt-2 text-center text-[14px] text-text-tertiary">{agentName} · online</p>

        {!started ? (
          <>
            <h2 className="mt-5 text-center font-[family-name:var(--font-manrope)] text-[30px] font-medium leading-tight tracking-[-0.02em]">
              Como posso<br />te ajudar?
            </h2>
            <p className="mt-6 text-center text-[12px] font-medium uppercase tracking-wide text-text-tertiary">
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
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-[16px] leading-[1.6] ${
                  m.role === "agent"
                    ? "bg-gradient-to-br from-orbi-gradient-start/15 via-surface-white to-orbi-gradient-end/10 shadow-[0_2px_12px_rgba(17,19,24,0.06)]"
                    : "ml-auto bg-on-background text-white"
                }`}
              >
                <div className="flex flex-col gap-3">{formatMessage(m.content, content, slug, businessId, sessionId, address)}</div>
              </div>
            ))}
            {(sending || justDone) && (
              <div className="flex items-center gap-2.5 self-start rounded-2xl bg-surface-white px-3 py-2 shadow-[0_2px_12px_rgba(17,19,24,0.06)]">
                <OrbiParticleSphere size={36} variant={justDone ? "check" : "sphere"} holdCheck={justDone} colors={orbiColors ?? undefined} className="rounded-full" />
                <span className="text-[14px] text-text-tertiary">{justDone ? "Pronto" : `${agentName} está pensando…`}</span>
              </div>
            )}
            {whatsapp && !sending && (
              <a
                href={whatsappLink(whatsapp, `Olá! Vim conversando com a ${agentName} no site.`)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick({ businessId, kind: "whatsapp", sessionId })}
                className="flex items-center justify-center gap-2 self-start rounded-full border-2 border-[#25D366] bg-surface-white px-5 py-3 text-[14px] font-medium text-on-background"
              >
                <OrbiContactDisc size={22} />
                Prefiro falar direto por WhatsApp
              </a>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Campo fixo */}
      {/* Faixa de fundo sólida da base até acima do campo — impede que as
          mensagens que rolam por trás apareçam no vão abaixo do campo. */}
      {/* Degradê que esmaece de baixo (fundo sólido) pra transparente em cima,
          escondendo o conteúdo que rola atrás do campo sem criar um retângulo
          visível de cor diferente. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background-main via-background-main to-transparent" />

      <form
        onSubmit={(e) => { e.preventDefault(); sendText(input); }}
        className="absolute inset-x-6 bottom-8 z-10 flex items-center gap-2 rounded-full bg-surface-white p-2 pl-4 shadow-[0_8px_30px_rgba(17,19,24,0.12)]"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orbi-gradient-start opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orbi-gradient-start" />
        </span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={typedPlaceholder}
          className="flex-1 bg-transparent text-[14px] outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Enviar mensagem"
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${input.trim() && !sending ? "orbi-gradient" : "bg-surface-soft"}`}
        >
          {sending ? (
            <OrbiParticleSphere size={36} colors={orbiColors ?? undefined} className="rounded-full" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={input.trim() ? "text-on-background" : "text-text-tertiary"} aria-hidden>
              <path d="M7 11l5-5 5 5" />
              <path d="M12 6v13" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

function OrbiRecommendation({ businessId, sessionId, onOrbi }: { businessId: string; sessionId: string | null; onOrbi?: () => void }) {
  const [rec, setRec] = useState<{ message: string; cta: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Manda o sessionId pra API poder olhar o que essa pessoa clicou
      // de verdade (categoria/produto) e basear a recomendação nisso,
      // em vez de sugerir algo genérico do catálogo.
      body: JSON.stringify({ businessId, sessionId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.message) setRec({ message: d.message, cta: d.cta ?? "Explorar" }); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading || !rec) return null;

  return (
    <OrbiInsightCard>
      <OrbiInsightHeader />
      <OrbiInsightMessage>{rec.message}</OrbiInsightMessage>
      {onOrbi && (
        <button onClick={onOrbi} className={orbiInsightCtaClass}>
          {rec.cta} <OrbiSparkleMini />
        </button>
      )}
    </OrbiInsightCard>
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

function VitrineCoverBleed({ business }: { business: Business }) {
  const covers = business.vitrine_cover_urls ?? [];
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Passa sozinha a cada 2s — a pessoa também pode arrastar quando quiser.
  useEffect(() => {
    if (covers.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % covers.length), 2000);
    return () => clearInterval(t);
  }, [covers.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }, [idx]);

  if (covers.length === 0) return null;

  return (
    <div className="-mx-6 -mt-16">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-0 overflow-x-auto no-scrollbar rounded-b-[28px]"
        onScroll={(e) => {
          // Só recalcula o índice depois que o scroll assenta — senão o
          // próprio scroll automático (suave, leva ~300ms) dispara vários
          // eventos no meio do caminho e a leitura prematura "cancela" o
          // avanço, fazendo o carrossel parecer travado.
          const el = e.currentTarget;
          if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
          scrollTimeout.current = setTimeout(() => {
            const w = el.clientWidth || 1;
            setIdx(Math.round(el.scrollLeft / w));
          }, 120);
        }}
      >
        {covers.map((src, i) => (
          <div key={i} className="relative w-full shrink-0 snap-center overflow-hidden rounded-b-[28px]" style={{ aspectRatio: 1920 / 830 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={business.name} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
      {covers.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {covers.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? "bg-on-background" : "bg-on-background/25"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Showcase({ content, business, sessionId, onOrbi }: { content: ContentItem[]; business: Business; sessionId: string | null; onOrbi?: () => void }) {
  const sections = groupByCategory(content);
  const [active, setActive] = useState<string | null>(null);

  const visible = active ? sections.filter((s) => s.name === active) : sections;

  return (
    <>
      {sections.length > 1 && (
        <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActive(null)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] ${active === null ? "bg-button-primary text-white" : "border border-divider bg-surface-white text-text-secondary"}`}
          >
            Tudo
          </button>
          {sections.map((s) => (
            <button
              key={s.name}
              onClick={() => setActive(s.name)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] ${active === s.name ? "bg-button-primary text-white" : "border border-divider bg-surface-white text-text-secondary"}`}
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
            <div className="flex flex-wrap gap-5">
              {sec.items.map((item) => {
                const c = colorOf(item.box_color);
                const fc = item.footer_color ? colorOf(item.footer_color) : null;
                const size = sizeOf(item.layout_size);
                const ratio = COVER_RATIO_BY_SIZE[size];
                // Mesma correção de sempre: "tem foto" é só ter uma URL.
                const photo = !!item.image_url;
                // Categoria de loja vai direto pro site do dono (decisão já tomada).
                // Produto e serviço abrem a página interna — com carrossel, descrição e CTAs.
                // "nenhum" = card só de vitrine, não clicável.
                const destino = item.link_kind === "nenhum"
                  ? null
                  : item.link_kind === "categoria"
                    ? item.target_url
                    : item.target_url && item.link_kind === "externo"
                      ? item.target_url
                      : `/${business.slug}/p/${item.id}`;
                const isExterno = item.link_kind === "categoria" || item.link_kind === "externo";
                const kindClique: "categoria" | "produto" | "link" =
                  item.link_kind === "categoria" ? "categoria" : item.link_kind === "produto" ? "produto" : "link";
                const priceLabel = formatPrice(item);

                const miolo = (
                  <>
                    <div className="relative" style={{ aspectRatio: RATIOS[ratio].value }}>
                      {photo ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image_url!}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.style.display = "none";
                              if (img.parentElement) img.parentElement.style.backgroundColor = c.bg;
                            }}
                            onLoad={(e) => {
                              // Mesmo problema do editor: link que "carrega" mas devolve arquivo vazio.
                              const img = e.currentTarget;
                              if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                                img.style.display = "none";
                                if (img.parentElement) img.parentElement.style.backgroundColor = c.bg;
                              }
                            }}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                          {item.title_placement === "sobre" && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-5 pt-12">
                              <p className="font-[family-name:var(--font-manrope)] font-semibold leading-[1.05] text-white" style={{ fontSize: titleFontSize(item.title, size) }}>
                                {item.title}
                              </p>
                              {item.description?.trim() && (
                                <p className="mt-1 line-clamp-1 text-[14px] leading-snug text-white/80">{item.description}</p>
                              )}
                              {priceLabel && <p className="mt-1.5 text-[14px] font-medium text-white/90">{priceLabel}</p>}
                            </div>
                          )}
                        </>
                      ) : (
                        // Sem foto: o nome vira o conteúdo do box, centralizado — sem
                        // rodapé branco repetindo a mesma informação embaixo. A fonte
                        // se ajusta ao formato do card e ao tamanho do título, pra
                        // título longo em card pequeno não estourar nem ficar apertado.
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center" style={{ backgroundColor: c.bg }}>
                          <span
                            className="font-[family-name:var(--font-open-sans)] font-bold leading-snug"
                            style={{ color: c.fg, fontSize: titleFontSize(item.title, size) }}
                          >
                            {item.title}
                          </span>
                          {priceLabel && (
                            <span className="font-[family-name:var(--font-open-sans)] text-[14px]" style={{ color: c.fg }}>
                              {priceLabel}
                            </span>
                          )}
                          {isExterno ? (
                            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium" style={{ backgroundColor: `${c.fg}22`, color: c.fg }}>
                              {item.link_kind === "categoria" ? "Ver categoria" : "Entrar no site"} <span aria-hidden>↗</span>
                            </span>
                          ) : (
                            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium" style={{ backgroundColor: `${c.fg}22`, color: c.fg }}>
                              Entrar <span aria-hidden>→</span>
                            </span>
                          )}
                        </div>
                      )}
                      {/* Sem foto já mostra a tag/o destino dentro do próprio box — a setinha
                          no canto só faz sentido quando tem foto por cima e nada mais avisa. */}
                      {destino && photo && (
                        <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/25 text-[13px] text-white backdrop-blur-sm">
                          {isExterno ? "↗" : "›"}
                        </span>
                      )}
                    </div>
                    {photo && item.title_placement !== "sobre" && (
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-[family-name:var(--font-manrope)] text-[17px] font-medium leading-tight" style={fc ? { color: fc.fg } : undefined}>{item.title}</p>
                          {item.description?.trim() && (
                            <p className={`mt-0.5 line-clamp-1 text-[13px] leading-snug ${fc ? "" : "text-text-tertiary"}`} style={fc ? { color: fc.fg, opacity: 0.7 } : undefined}>{item.description}</p>
                          )}
                          {priceLabel && (
                            <p className={`mt-0.5 font-[family-name:var(--font-manrope)] text-[15px] font-medium ${fc ? "" : "text-text-secondary"}`} style={fc ? { color: fc.fg, opacity: 0.85 } : undefined}>{priceLabel}</p>
                          )}
                        </div>
                        {destino && (
                          size === "medio" ? (
                            // Card pequeno: só a bolinha com a seta, pro título respirar.
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-button-primary text-[13px] text-white">
                              {isExterno ? "↗" : "→"}
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-button-primary px-3 py-1.5 text-[12px] font-medium text-white">
                              {isExterno
                                ? (item.link_kind === "categoria" ? "Ver" : "Entrar")
                                : "Entrar"}
                              <span aria-hidden>{isExterno ? "↗" : "→"}</span>
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </>
                );

                const classe = `block overflow-hidden rounded-[24px] bg-surface-white shadow-[0_2px_14px_rgba(17,19,24,0.06)] ${size === "medio" ? "w-[calc(50%-10px)]" : "w-full"}`;
                const cardStyle = photo && fc ? { backgroundColor: fc.bg } : undefined;

                if (!destino) {
                  return (
                    <div key={item.id} className={classe} style={cardStyle}>
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
                    style={cardStyle}
                  >
                    {miolo}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    href={destino}
                    onClick={() => trackClick({ businessId: business.id, kind: "produto", contentItemId: item.id, sessionId, targetUrl: destino })}
                    className={classe}
                    style={cardStyle}
                  >
                    {miolo}
                  </Link>
                );
              })}
            </div>
            {si === 0 && <div className="mt-6"><OrbiRecommendation businessId={business.id} sessionId={sessionId} onOrbi={onOrbi} /></div>}
          </div>
        ))}
      </div>
      <BarraContato business={business} sessionId={sessionId} onOrbi={onOrbi} />
    </>
  );
}
