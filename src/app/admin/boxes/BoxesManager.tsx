"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GalleryUpload } from "@/components/ui/GalleryUpload";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { OrbiOrb } from "@/components/orbi/OrbiOrb";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { OrbiContactDisc } from "@/components/orbi/OrbiContactDisc";
import { OrbiGoogleIcon } from "@/components/orbi/OrbiGoogleIcon";
import { OrbiLogoBadge } from "@/components/orbi/OrbiLogoBadge";
import { OrbiMapPin } from "@/components/orbi/OrbiMapPin";
import { PALETTE_GROUPS, ICON_LIBRARY, ICON_LIBRARY_PREVIEW_COUNT, isAnimatedIcon, isVideoUrl } from "@/lib/showcase";
import { YoutubeAdder } from "@/components/ui/YoutubeAdder";
import { addToLogoGallery } from "@/lib/logoGallery";
import { isoToDatetimeLocal, datetimeLocalToIso } from "@/lib/utils";

type BrandColor = { hex: string; role?: string };
type BoxConfig = { label?: string; subtitle?: string; icon?: string; color?: string; action?: "vitrine" | "zara" | "whatsapp" | "link" | "avaliar" | "endereco" | "cupom"; url?: string; logo_url?: string };
type Box = { id: string; box_type: string; title: string | null; position: number; is_active: boolean; auto_arranged: boolean; config: unknown; starts_at: string | null; ends_at: string | null };
type DifferentialCard = { icon?: string; title: string; description?: string };

const META: Record<string, { name: string; explica: string; icon: string; fixo?: boolean; assinatura?: boolean }> = {
  hero: {
    name: "Tela inicial",
    explica: "A pergunta “O que trouxe você aqui hoje?”. É a tela em si, não um botão — por isso não tem nome nem cor pra editar.",
    icon: "◈",
    fixo: true,
  },
  product: { name: "O que fazemos", explica: "Mostra seus produtos e serviços na vitrine que você montou.", icon: "▤" },
  content: { name: "Conhecer", explica: "Conta sobre a marca — texto e fotos, usando o tom de voz do seu DNA.", icon: "◫" },
  campaign: { name: "Presentear", explica: "Uma seleção pensada para quem vai comprar para outra pessoa.", icon: "◇" },
  // O box da IA usa as partículas como assinatura fixa — é o "wow" do produto.
  // Sempre existe (não dá pra excluir), mas o dono pode ativar/desativar.
  agent: { name: "Pergunte o que quiser", explica: "Abre a conversa com a Orbi, sua IA. As partículas mostram que ali é inteligência artificial de verdade.", icon: "__orb__", assinatura: true },
};

const ACTION_LABEL: Record<NonNullable<BoxConfig["action"]>, string> = {
  vitrine: "Abre a Vitrine",
  zara: "Abre a Orbi",
  whatsapp: "Abre o WhatsApp",
  avaliar: "Avaliar no Google",
  endereco: "Mostra o endereço",
  link: "Abre um link",
  cupom: "Abre os cupons",
};

const ICON_CHOICES = ICON_LIBRARY;
const DIFF_ICONS = ICON_LIBRARY;

/** Preto ou branco, o que der mais contraste — pra ícone ficar legível em
 * qualquer cor da paleta, mesmo as claras. */
function contrastFg(hex: string): string {
  if (!hex || hex === "transparent" || hex[0] !== "#") return "#111318";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111318" : "#FFFFFF";
}

export function BoxesManager({
  businessId,
  businessName,
  initialBoxes,
  slug,
  initialStoryPhotos,
  initialAboutBusiness,
  initialDifferentialsCards,
  initialHeroQuestion,
  initialLogoUrl,
  initialLogoGallery,
  initialHeroAvatar,
  initialAddress,
  brandColors,
  orbiColors,
  hasVouchers,
}: {
  businessId: string;
  businessName: string;
  initialBoxes: Box[];
  slug: string;
  initialStoryPhotos: string[];
  initialAboutBusiness: string;
  initialDifferentialsCards: DifferentialCard[];
  initialHeroQuestion: string | null;
  initialLogoUrl: string | null;
  initialLogoGallery: string[];
  initialHeroAvatar: string | null;
  initialAddress: string | null;
  brandColors: BrandColor[];
  orbiColors: string[] | null;
  hasVouchers: boolean;
}) {
  const supabase = createClient();
  const [boxes, setBoxes] = useState<Box[]>(initialBoxes);
  const [storyPhotos, setStoryPhotos] = useState<string[]>(initialStoryPhotos);
  const [aboutBusiness, setAboutBusiness] = useState(initialAboutBusiness);
  const [cards, setCards] = useState<DifferentialCard[]>(initialDifferentialsCards);
  const [heroQuestion, setHeroQuestion] = useState(initialHeroQuestion ?? "");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoGallery, setLogoGallery] = useState<string[]>(initialLogoGallery);
  const [heroAvatar, setHeroAvatar] = useState(initialHeroAvatar ?? "auto");

  async function saveHeroAvatar(value: string) {
    setHeroAvatar(value);
    await supabase.from("businesses").update({ hero_avatar: value }).eq("id", businessId);
  }
  const [aboutImportUrl, setAboutImportUrl] = useState("");
  const [importingAbout, setImportingAbout] = useState(false);
  const [aboutImportMsg, setAboutImportMsg] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);
  const [arranging, setArranging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<BoxConfig>({ label: "", subtitle: "", icon: "◆", action: "link", url: "" });
  const [draftLabel, setDraftLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  async function toggleActive(box: Box) {
    if (META[box.box_type]?.fixo) return;
    const { error } = await supabase.from("smart_boxes").update({ is_active: !box.is_active }).eq("id", box.id);
    if (!error) setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, is_active: !b.is_active } : b)));
  }

  async function autoArrange() {
    setArranging(true);
    const priority: Record<string, number> = { hero: 0, product: 1, content: 2, campaign: 3, agent: 4, custom: 5 };
    const sorted = [...boxes].sort((a, b) => (priority[a.box_type] ?? 9) - (priority[b.box_type] ?? 9));
    await Promise.all(sorted.map((b, i) => supabase.from("smart_boxes").update({ position: i, auto_arranged: true }).eq("id", b.id)));
    setBoxes(sorted.map((b, i) => ({ ...b, position: i, auto_arranged: true })));
    setArranging(false);
  }

  async function move(box: Box, dir: -1 | 1) {
    const ordered = [...boxes].sort((a, b) => a.position - b.position);
    const idx = ordered.findIndex((b) => b.id === box.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("smart_boxes").update({ position: swap.position }).eq("id", box.id),
      supabase.from("smart_boxes").update({ position: box.position }).eq("id", swap.id),
    ]);
    setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, position: swap.position } : b.id === swap.id ? { ...b, position: box.position } : b)));
  }

  async function saveConfig(box: Box, cfg: BoxConfig) {
    setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, title: cfg.label ?? b.title, config: cfg } : b)));
    await supabase.from("smart_boxes").update({ title: cfg.label || box.title, config: cfg }).eq("id", box.id);
  }

  async function saveSchedule(box: Box, startsAt: string | null, endsAt: string | null) {
    setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, starts_at: startsAt, ends_at: endsAt } : b)));
    await supabase.from("smart_boxes").update({ starts_at: startsAt, ends_at: endsAt }).eq("id", box.id);
  }

  async function removeCustom(box: Box) {
    setEditingId(null);
    setBoxes((p) => p.filter((b) => b.id !== box.id));
    await supabase.from("smart_boxes").delete().eq("id", box.id);
  }

  async function saveStoryPhotos(urls: string[]) {
    setStoryPhotos(urls);
    await supabase.from("businesses").update({ story_photos: urls }).eq("id", businessId);
  }

  async function saveAboutBusiness(value: string) {
    await supabase.from("businesses").update({ about_business: value || null }).eq("id", businessId);
  }

  async function saveHeroQuestion(value: string) {
    await supabase.from("businesses").update({ hero_question: value || null }).eq("id", businessId);
  }

  async function importAbout(url: string) {
    setImportingAbout(true);
    setAboutImportMsg(null);
    try {
      const res = await fetch("/api/import-about", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAboutImportMsg({ kind: "erro", text: data.error || "Não consegui ler esse site." });
        return;
      }
      if (data.about) {
        setAboutBusiness(data.about);
        await saveAboutBusiness(data.about);
      }
      if (Array.isArray(data.differentials) && data.differentials.length > 0) {
        await saveDifferentialsCards(data.differentials);
      }
      setAboutImportMsg({ kind: "ok", text: "Pronto — texto e diferenciais atualizados. Dá uma conferida abaixo e ajusta se quiser." });
    } catch {
      setAboutImportMsg({ kind: "erro", text: "Não consegui ler esse site agora." });
    } finally {
      setImportingAbout(false);
    }
  }

  async function saveDifferentialsCards(next: DifferentialCard[]) {
    setCards(next);
    // Mantém o texto simples que alimenta a Orbi sincronizado, sem trabalho extra pro dono.
    const plainText = next.map((c) => (c.description ? `${c.title}: ${c.description}` : c.title)).join("\n");
    await supabase.from("businesses").update({ differentials_cards: next, differentials: plainText || null }).eq("id", businessId);
  }

  async function createCustom() {
    const nome = draftLabel.trim();
    if (!nome) {
      setCreateError("Dê um nome pro botão antes de criar.");
      return;
    }
    setCreateError(null);
    const config = { ...draft, label: nome };
    const { data, error } = await supabase
      .from("smart_boxes")
      .insert({ business_id: businessId, box_type: "custom", title: nome, position: boxes.length, is_active: true, config })
      .select()
      .single();
    if (!error && data) {
      setBoxes((p) => [...p, data as Box]);
      setCreating(false);
      setDraft({ label: "", subtitle: "", icon: "◆", action: "link", url: "" });
      setDraftLabel("");
    } else {
      setCreateError("Não foi possível criar. Tente de novo.");
    }
  }

  // Atalho: já abre o criador com um box de avaliação do Google pré-montado
  // (nome, ícone de estrela e ação "avaliar") — é só a pessoa colar o link.
  function novoBoxAvaliacao() {
    setDraftLabel("Avalie no Google"); setDraft({ label: "Avalie no Google", subtitle: "Deixe sua nota, leva 10 segundos", icon: "__google__", action: "avaliar", url: "", color: "transparent" });
    setCreating(true);
  }

  // Atalho: box de endereço pré-montado — a pessoa só cola o endereço e o
  // box já sai pronto com os botões de Waze e Google Maps.
  function novoBoxEndereco() {
    setDraftLabel("Como chegar"); setDraft({ label: "Como chegar", subtitle: "Veja no mapa", icon: "__pin__", action: "endereco", url: initialAddress ?? "", color: "transparent" });
    setCreating(true);
  }

  // Atalho: box de cupom — abre o gerenciador de vouchers (criação e resgate
  // ficam numa página própria, não dá pra configurar direto por aqui).
  function novoBoxCupom() {
    setDraftLabel("Cupons"); setDraft({ label: "Cupons", subtitle: "Descontos por tempo limitado", icon: "🎟️", action: "cupom", url: "", color: "transparent" });
    setCreating(true);
  }

  const ordered = [...boxes].sort((a, b) => a.position - b.position);
  const visibleBoxes = ordered.filter((b) => b.box_type !== "hero");
  const ativos = ordered.filter((b) => b.is_active && !META[b.box_type]?.fixo).length;

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={autoArrange}
          disabled={arranging}
          className="rounded-full orbi-gradient px-4 py-2 text-[13px] font-medium text-on-background disabled:opacity-60"
        >
          {arranging ? "Organizando…" : "✦ Sugerir ordem"}
        </button>
        <Link href={`/${slug}`} target="_blank" className="rounded-full border border-divider bg-surface-white px-4 py-2 text-[13px] text-text-secondary">
          Ver resultado ↗
        </Link>
      </div>

      <p className="text-[12px] text-text-secondary">
        A tela inicial (“O que trouxe você aqui hoje?”) sempre aparece primeiro — os caminhos abaixo são as opções que ela oferece.
        <br />
        {ativos === 0
          ? "Nenhum caminho ativo — o visitante só verá a tela inicial."
          : `${ativos} ${ativos === 1 ? "caminho ativo" : "caminhos ativos"} na sua tela inicial.`}
      </p>

      <div className="rounded-[20px] bg-surface-soft p-4">
        <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Frase de saudação (tela inicial)</p>
        <p className="mt-1 text-[12px] text-text-secondary">A pergunta que aparece antes do nome do seu negócio, quando o visitante chega.</p>
        <input
          value={heroQuestion}
          onChange={(e) => setHeroQuestion(e.target.value)}
          onBlur={(e) => saveHeroQuestion(e.target.value)}
          placeholder="O que trouxe você aqui hoje?"
          className="mt-2 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
        />
      </div>

      <div className="rounded-[20px] bg-surface-soft p-4">
        <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Avatar da tela inicial</p>
        <p className="mt-1 text-[12px] text-text-secondary">
          Escolha o que aparece no topo da tela inicial: a esfera clássica da Orbi, seu logotipo, ou a esfera já com as cores que você configurou em Personalidade da Marca.
        </p>
        {(() => {
          // Qualquer logo já enviado — em Configurações ou em qualquer box —
          // conta aqui. Se o logo "oficial" (logo_url) ainda não foi definido,
          // usa o mais recente da galeria como avatar.
          const availableLogo = logoUrl ?? logoGallery[logoGallery.length - 1] ?? null;
          async function pickLogoAvatar() {
            if (!availableLogo) return;
            if (!logoUrl) {
              setLogoUrl(availableLogo);
              await supabase.from("businesses").update({ logo_url: availableLogo }).eq("id", businessId);
            }
            saveHeroAvatar("logo");
          }
          return (
            <>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => saveHeroAvatar("particle")}
                  className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 bg-surface-white py-3 ${heroAvatar === "particle" ? "border-on-background" : "border-transparent"}`}
                >
                  <OrbiParticleSphere size={40} colors={orbiColors ?? undefined} className="rounded-full" />
                  <span className="text-[11px] font-medium">Orbi configurada</span>
                </button>
                <button
                  onClick={() => saveHeroAvatar("sphere")}
                  className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 bg-surface-white py-3 ${(heroAvatar === "sphere" || (heroAvatar === "auto" && !availableLogo)) ? "border-on-background" : "border-transparent"}`}
                >
                  <OrbiOrb size={40} />
                  <span className="text-[11px] font-medium">Esfera clássica</span>
                </button>
                <button
                  onClick={pickLogoAvatar}
                  disabled={!availableLogo}
                  className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 bg-surface-white py-3 disabled:opacity-40 ${(heroAvatar === "logo" || (heroAvatar === "auto" && !!availableLogo)) ? "border-on-background" : "border-transparent"}`}
                >
                  {availableLogo ? <OrbiLogoBadge logoUrl={availableLogo} size={40} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-[16px]">◎</span>}
                  <span className="text-[11px] font-medium">Logotipo</span>
                </button>
              </div>
              <Link href="/admin/config#cores-orbi" className="mt-2 inline-block text-[11px] font-medium text-text-secondary underline">
                ✦ Configurar cor
              </Link>
              {!availableLogo && (
                <p className="mt-2 text-[11px] text-text-tertiary">Envie um logotipo abaixo pra poder usar essa opção.</p>
              )}
            </>
          );
        })()}
        <div className="mt-3">
          <ImageUpload
            value={logoUrl}
            businessId={businessId}
            lockedRatio="quadrado"
            promptKind="avatar"
            promptSubject={businessName}
            emptyPreview={<OrbiOrb size={72} />}
            onChange={async (url) => {
              setLogoUrl(url);
              await supabase.from("businesses").update({ logo_url: url }).eq("id", businessId);
              if (url) setLogoGallery(await addToLogoGallery(supabase, businessId, logoGallery, url));
              else if (heroAvatar === "logo") saveHeroAvatar("sphere");
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {visibleBoxes.map((box, idx) => {
          const isHero = false;
          const isCustom = box.box_type === "custom";
          const cfg = box.config as BoxConfig | null;
          const m = META[box.box_type] ?? { name: cfg?.label || box.title || "Box livre", explica: "Um caminho extra que você define — WhatsApp, portfólio, qualquer link.", icon: cfg?.icon || "◆" };
          // O box "Sobre" já sugere o nome da marca — o dono usa, ajusta ou desativa.
          const suggestedName = box.box_type === "content" ? `Sobre a ${businessName}` : m.name;
          const label = cfg?.label ?? (isCustom ? box.title ?? "" : suggestedName);
          const color = cfg?.color || "#111318";
          const icon = cfg?.icon || m.icon;
          const fg = contrastFg(color);
          const off = !box.is_active && !m.fixo;
          const editing = editingId === box.id;
          return (
            <div key={box.id} className={`rounded-[22px] border border-divider bg-surface-white p-4 ${off ? "opacity-55" : ""}`}>
              <div className="flex items-start gap-3">
                {!isHero && (
                  <div className="flex flex-col pt-1 text-[11px] text-text-tertiary">
                    <button onClick={() => move(box, -1)} disabled={idx === 0} className="disabled:opacity-30" aria-label="Subir">▲</button>
                    <button onClick={() => move(box, 1)} disabled={idx === visibleBoxes.length - 1} className="disabled:opacity-30" aria-label="Descer">▼</button>
                  </div>
                )}
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[16px] ${icon === "__logo__" ? "" : "overflow-hidden"}`} style={{ backgroundColor: isHero ? "#111318" : (color === "transparent" || isAnimatedIcon(icon)) ? "transparent" : color, color: isHero ? "#fff" : fg }}>
                  {icon === "__orb__" ? (
                    <OrbiParticleSphere size={44} colors={orbiColors ?? undefined} />
                  ) : icon === "__orbcheck__" ? (
                    <OrbiParticleSphere size={44} variant="check" colors={orbiColors ?? undefined} />
                  ) : icon === "__orbwa__" || icon === "__wadisc__" ? (
                    <OrbiContactDisc size={44} />
                  ) : icon === "__google__" ? (
                    <OrbiGoogleIcon size={44} />
                  ) : icon === "__pin__" ? (
                    <OrbiMapPin size={30} />
                  ) : icon === "__logo__" && (cfg?.logo_url || logoUrl) ? (
                    <OrbiLogoBadge logoUrl={cfg?.logo_url || logoUrl!} size={40} />
                  ) : (
                    icon
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {isHero ? (
                    <p className="text-[15px] font-medium">{m.name}</p>
                  ) : (
                    <input
                      defaultValue={label}
                      onBlur={(e) => saveConfig(box, { ...(cfg ?? {}), label: e.target.value.trim() || suggestedName })}
                      placeholder={suggestedName}
                      className="w-full border-b border-transparent bg-transparent pb-0.5 text-[15px] font-medium outline-none focus:border-divider"
                    />
                  )}
                  {m.fixo && <span className="mt-1 inline-block rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-text-tertiary">sempre ativo</span>}
                  {m.assinatura && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-text-tertiary"><span className="orbi-gradient-text">✦</span> assinatura da IA</span>}
                  {(cfg?.action === "avaliar" || icon === "__google__") && <span className="mt-0.5 block text-[13px] tracking-[2px] text-[#FBBC05]">★★★★★</span>}
                  {box.ends_at && new Date(box.ends_at) < new Date() ? (
                    <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-600">expirado</span>
                  ) : box.starts_at && new Date(box.starts_at) > new Date() ? (
                    <span className="mt-1 inline-block rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-text-tertiary">agendado</span>
                  ) : null}
                </div>
                {!m.fixo && (
                  <button
                    onClick={() => toggleActive(box)}
                    className={`mt-1 h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${box.is_active ? "orbi-gradient" : "bg-surface-soft"}`}
                    aria-label={box.is_active ? "Desativar" : "Ativar"}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-surface-white shadow transition-transform ${box.is_active ? "translate-x-5" : ""}`} />
                  </button>
                )}
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">{m.explica}</p>

              {!isHero && (
                <>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-soft p-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] ${icon === "__logo__" ? "" : "overflow-hidden"}`} style={{ backgroundColor: (color === "transparent" || isAnimatedIcon(icon)) ? "transparent" : color, color: fg }}>
                      {icon === "__orb__" ? (
                        <OrbiParticleSphere size={36} colors={orbiColors ?? undefined} />
                      ) : icon === "__orbcheck__" ? (
                        <OrbiParticleSphere size={36} variant="check" colors={orbiColors ?? undefined} />
                      ) : icon === "__orbwa__" || icon === "__wadisc__" ? (
                        <OrbiContactDisc size={36} />
                      ) : icon === "__google__" ? (
                        <OrbiGoogleIcon size={36} />
                      ) : icon === "__pin__" ? (
                        <OrbiMapPin size={26} />
                      ) : icon === "__logo__" && (cfg?.logo_url || logoUrl) ? (
                        <OrbiLogoBadge logoUrl={cfg?.logo_url || logoUrl!} size={33} />
                      ) : (
                        icon
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{label || suggestedName}</p>
                      <p className="text-[11px] text-text-tertiary">assim aparece pro visitante</p>
                    </div>
                  </div>

                  {!m.assinatura && (
                    <button onClick={() => setEditingId(editing ? null : box.id)} className="mt-3 text-[12px] text-text-tertiary underline">
                      {editing ? "Fechar" : "Cor, ícone e mais"}
                    </button>
                  )}
                </>
              )}

              {editing && !isHero && !m.assinatura && (
                <BoxEditor
                  initial={cfg ?? { subtitle: "", icon: m.icon, color: "#111318", action: "link", url: "" }}
                  isCustom={isCustom}
                  brandColors={brandColors}
                  onSave={(next) => saveConfig(box, { ...next, label })}
                  onDelete={isCustom ? () => removeCustom(box) : undefined}
                  logoUrl={logoUrl}
                  logoGallery={logoGallery}
                  onNewLogo={async (url) => setLogoGallery(await addToLogoGallery(supabase, businessId, logoGallery, url))}
                  businessId={businessId}
                />
              )}

              {editing && !isHero && !m.fixo && (
                <div className="mt-4 border-t border-divider pt-4">
                  <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Agendar (opcional)</p>
                  <p className="mt-1 text-[12px] text-text-secondary">
                    Ativa e desativa sozinho nas datas escolhidas — bom pra promoção por tempo limitado, sem precisar
                    lembrar de desligar.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <div className="flex-1">
                      <p className="text-[11px] text-text-tertiary">Começa em</p>
                      <input
                        type="datetime-local"
                        defaultValue={isoToDatetimeLocal(box.starts_at)}
                        onBlur={(e) => saveSchedule(box, datetimeLocalToIso(e.target.value), box.ends_at)}
                        className="mt-1 w-full rounded-xl border border-divider px-2.5 py-2 text-[13px] outline-none focus:border-on-background"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-text-tertiary">Termina em</p>
                      <input
                        type="datetime-local"
                        defaultValue={isoToDatetimeLocal(box.ends_at)}
                        onBlur={(e) => saveSchedule(box, box.starts_at, datetimeLocalToIso(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-divider px-2.5 py-2 text-[13px] outline-none focus:border-on-background"
                      />
                    </div>
                  </div>
                  {(box.starts_at || box.ends_at) && (
                    <button onClick={() => saveSchedule(box, null, null)} className="mt-2 text-[11px] text-red-600">
                      Remover agendamento
                    </button>
                  )}
                </div>
              )}

              {box.box_type === "content" && editing && (
                <div className="mt-4 flex flex-col gap-4 border-t border-divider pt-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Importar do site</p>
                    <p className="mt-1 text-[12px] text-text-secondary">
                      Cola o link do seu site e a Orbi lê e monta sozinha o texto &quot;Sobre nós&quot; e os diferenciais abaixo.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={aboutImportUrl}
                        onChange={(e) => setAboutImportUrl(e.target.value)}
                        placeholder="https://seusite.com.br"
                        className="min-w-0 flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
                      />
                      <button
                        onClick={() => importAbout(aboutImportUrl)}
                        disabled={importingAbout || !aboutImportUrl.trim()}
                        className="shrink-0 rounded-full orbi-gradient px-4 py-2.5 text-[13px] font-medium text-on-background disabled:opacity-50"
                      >
                        {importingAbout ? "Lendo…" : "✦ Importar"}
                      </button>
                    </div>
                    {aboutImportMsg && (
                      <p className={`mt-2 text-[12px] ${aboutImportMsg.kind === "ok" ? "text-text-secondary" : "text-red-600"}`}>{aboutImportMsg.text}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Sobre nós</p>
                    <p className="mt-1 text-[12px] text-text-secondary">O texto que aparece na tela “Conhecer”, abaixo das fotos.</p>
                    <textarea
                      value={aboutBusiness}
                      onChange={(e) => setAboutBusiness(e.target.value)}
                      onBlur={(e) => saveAboutBusiness(e.target.value)}
                      rows={3}
                      placeholder="Quem vocês são, o que fazem, há quanto tempo..."
                      className="mt-2 w-full resize-none rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                    />
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Diferenciais</p>
                    <p className="mt-1 text-[12px] text-text-secondary">Viram um carrossel de cards na tela “Sobre” — ícone, título e uma frase curta.</p>
                    <div className="mt-2 flex flex-col gap-2.5">
                      {cards.map((c, i) => (
                        <div key={i} className="rounded-2xl border border-divider p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-wrap gap-1">
                              {DIFF_ICONS.map((ic) => (
                                <button
                                  key={ic}
                                  onClick={() => saveDifferentialsCards(cards.map((x, xi) => (xi === i ? { ...x, icon: ic } : x)))}
                                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[12px] ${(c.icon || DIFF_ICONS[0]) === ic ? "border-on-background bg-surface-soft" : "border-divider"}`}
                                >
                                  {ic}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => saveDifferentialsCards(cards.filter((_, xi) => xi !== i))} className="ml-auto text-[12px] text-red-600">Excluir</button>
                          </div>
                          <input
                            defaultValue={c.title}
                            onBlur={(e) => saveDifferentialsCards(cards.map((x, xi) => (xi === i ? { ...x, title: e.target.value } : x)))}
                            placeholder="Título (ex: Experiência sênior)"
                            className="mt-2 w-full rounded-xl border border-divider px-3 py-2 text-[13px] font-medium outline-none focus:border-on-background"
                          />
                          <textarea
                            defaultValue={c.description ?? ""}
                            onBlur={(e) => saveDifferentialsCards(cards.map((x, xi) => (xi === i ? { ...x, description: e.target.value } : x)))}
                            rows={2}
                            placeholder="Uma frase explicando esse diferencial"
                            className="mt-1.5 w-full resize-none rounded-xl border border-divider px-3 py-2 text-[13px] outline-none focus:border-on-background"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => saveDifferentialsCards([...cards, { icon: DIFF_ICONS[0], title: "", description: "" }])}
                        className="rounded-2xl border border-dashed border-divider py-2.5 text-[13px] text-text-tertiary"
                      >
                        + Adicionar diferencial
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] uppercase tracking-wide text-text-tertiary">Fotos e vídeos da história (carrossel)</p>
                    <p className="mt-1 text-[12px] text-text-secondary">
                      Aparecem em carrossel, acima do texto — nessa mesma ordem. Vídeo entra direto na grade abaixo, junto das fotos; use as setinhas ‹ › pra escolher a posição dele.
                    </p>
                    <div className="mt-2">
                      <GalleryUpload
                        value={storyPhotos}
                        businessId={businessId}
                        lockedRatio="paisagem"
                        lockedReason="As fotos são sempre no formato paisagem, pra combinar com fotos de espaço/equipe e manter o carrossel uniforme."
                        onChange={saveStoryPhotos}
                      />
                    </div>
                    <YoutubeAdder
                      videos={storyPhotos.filter((u) => isVideoUrl(u))}
                      label="Adicionar vídeo (YouTube ou Reels)"
                      hint="Cole o link — ele entra na grade acima, no fim da fila. Depois é só usar as setinhas pra mover pra posição que quiser."
                      showList={false}
                      onAdd={(url) => {
                        if (storyPhotos.includes(url)) return;
                        saveStoryPhotos([...storyPhotos, url]);
                      }}
                      onRemove={(url) => saveStoryPhotos(storyPhotos.filter((u) => u !== url))}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {creating ? (
        <div className="rounded-[22px] border border-dashed border-divider bg-surface-white p-4">
          <p className="text-[13px] font-medium">Nova Box personalizada</p>
          <p className="mt-0.5 text-[12px] text-text-tertiary">Ou use uma pronta:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={novoBoxAvaliacao} className="rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-medium">⭐ Avaliação Google</button>
            <button onClick={novoBoxEndereco} className="rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-medium">📍 Endereço</button>
            {hasVouchers && <button onClick={novoBoxCupom} className="rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-medium">🎟️ Cupons</button>}
          </div>
          <input
            value={draftLabel}
            onChange={(e) => { setDraftLabel(e.target.value); setCreateError(null); }}
            placeholder="Nome do botão (ex: Fale no WhatsApp)"
            className="mt-3 w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
          />
          <BoxEditor initial={draft} isCustom brandColors={brandColors} onSave={(cfg) => setDraft((d) => ({ ...d, ...cfg }))} liveOnly logoUrl={logoUrl} logoGallery={logoGallery} onNewLogo={async (url) => setLogoGallery(await addToLogoGallery(supabase, businessId, logoGallery, url))} businessId={businessId} />
          {createError && <p className="mt-2 text-[12px] text-red-600">{createError}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={createCustom} className="rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white">Criar</button>
            <button onClick={() => { setCreating(false); setCreateError(null); }} className="rounded-full bg-surface-soft px-4 py-2 text-[13px]">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={novoBoxAvaliacao}
            className="flex items-center gap-3 rounded-[22px] border border-dashed border-divider bg-surface-white p-4 text-left"
          >
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full"><OrbiGoogleIcon size={40} /></span>
            <span>
              <span className="block text-[13px] font-medium">＋ Box de avaliação no Google</span>
              <span className="block text-[12px] text-text-tertiary">O cliente toca e já dá as estrelas. Ótimo pra reputação.</span>
            </span>
          </button>
          <button
            onClick={novoBoxEndereco}
            className="flex items-center gap-3 rounded-[22px] border border-dashed border-divider bg-surface-white p-4 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"><OrbiMapPin size={28} /></span>
            <span>
              <span className="block text-[13px] font-medium">＋ Box de endereço</span>
              <span className="block text-[12px] text-text-tertiary">Cole o endereço e o box já sai pronto com Waze e Google Maps.</span>
            </span>
          </button>
          {hasVouchers ? (
            <button
              onClick={novoBoxCupom}
              className="flex items-center gap-3 rounded-[22px] border border-dashed border-divider bg-surface-white p-4 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[18px]">🎟️</span>
              <span>
                <span className="block text-[13px] font-medium">＋ Box de cupons</span>
                <span className="block text-[12px] text-text-tertiary">Desconto com estoque limitado e código único por resgate.</span>
              </span>
            </button>
          ) : (
            <Link
              href="/admin/planos"
              className="flex items-center gap-3 rounded-[22px] border border-dashed border-divider bg-surface-white p-4 text-left opacity-70"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[18px]">🎟️</span>
              <span>
                <span className="block text-[13px] font-medium">＋ Box de cupons 💎 Nióbio</span>
                <span className="block text-[12px] text-text-tertiary">Exclusivo do plano Nióbio — toque pra ver os planos.</span>
              </span>
            </Link>
          )}
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-3 rounded-[22px] border border-dashed border-divider bg-surface-white p-4 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[18px]">＋</span>
            <span>
              <span className="block text-[13px] font-medium">＋ Box personalizada</span>
              <span className="block text-[12px] text-text-tertiary">WhatsApp, portfólio, ou qualquer outro link — você escolhe o nome, o ícone e a cor.</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Cor, ícone e (só pra blocos personalizados) subtítulo + destino. */
function BoxEditor({
  initial,
  isCustom,
  brandColors,
  onSave,
  onDelete,
  liveOnly,
  logoUrl,
  logoGallery,
  onNewLogo,
  businessId,
}: {
  initial: BoxConfig;
  isCustom: boolean;
  brandColors: BrandColor[];
  onSave: (cfg: BoxConfig) => void;
  onDelete?: () => void;
  liveOnly?: boolean;
  logoUrl?: string | null;
  logoGallery?: string[];
  onNewLogo?: (url: string) => void;
  businessId: string;
}) {
  const [cfg, setCfg] = useState<BoxConfig>(initial);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [showAllIcons, setShowAllIcons] = useState(false);
  const color = cfg.color || "#111318";
  const animated = isAnimatedIcon(cfg.icon);

  function update(next: Partial<BoxConfig>) {
    const merged = { ...cfg, ...next };
    setCfg(merged);
    if (liveOnly) onSave(merged);
  }

  function pickColor(hex: string) {
    update({ color: hex });
    if (!liveOnly) onSave({ ...cfg, color: hex });
  }

  // Regra do app: escolher um ícone animado força fundo transparente (o
  // ícone herda o fundo do box, sem quadradinho de cor por trás). Ícone
  // normal volta a poder ter cor de fundo.
  function pickIcon(icon: string) {
    const next: BoxConfig = { ...cfg, icon };
    if (isAnimatedIcon(icon)) next.color = "transparent";
    else if (cfg.color === "transparent") next.color = "#111318";
    setCfg(next);
    onSave(next);
  }

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {isCustom && (
        <input
          value={cfg.subtitle ?? ""}
          onChange={(e) => update({ subtitle: e.target.value })}
          onBlur={() => !liveOnly && onSave(cfg)}
          placeholder="Subtítulo curto (opcional)"
          className="rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
        />
      )}

      {isCustom && (
        <>
          <p className="text-[13px] font-medium text-text-secondary">Ao tocar, o botão…</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ACTION_LABEL) as (keyof typeof ACTION_LABEL)[]).map((a) => (
              <button
                key={a}
                onClick={() => { update({ action: a }); if (!liveOnly) onSave({ ...cfg, action: a }); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${cfg.action === a ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
              >
                {ACTION_LABEL[a]}
              </button>
            ))}
          </div>

          {(cfg.action === "link" || cfg.action === "whatsapp") && (
            <input
              value={cfg.url ?? ""}
              onChange={(e) => update({ url: e.target.value })}
              onBlur={() => !liveOnly && onSave(cfg)}
              placeholder={cfg.action === "whatsapp" ? "https://wa.me/55... (vazio usa o WhatsApp de Configurações)" : "https://..."}
              className="rounded-2xl border border-divider px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
            />
          )}

          {cfg.action === "avaliar" && (
            <div className="flex flex-col gap-2">
              <input
                value={cfg.url ?? ""}
                onChange={(e) => update({ url: e.target.value })}
                onBlur={() => !liveOnly && onSave(cfg)}
                placeholder="Cole aqui o link de avaliação ou do perfil no Google"
                className="rounded-2xl border border-divider px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
              />
              <details className="rounded-2xl bg-surface-soft p-3">
                <summary className="cursor-pointer list-none text-[12px] font-medium text-on-background">
                  ✦ Como pegar o link do Google (toque pra ver)
                </summary>
                <div className="mt-2 flex flex-col gap-2 text-[12px] leading-relaxed text-text-secondary">
                  <p className="font-medium text-on-background">Jeito mais rápido (leva direto pra dar a nota):</p>
                  <ol className="ml-1 flex flex-col gap-1.5">
                    <li>1. No computador, faça login no Google com o e-mail do seu perfil do <span className="font-medium">Google Meu Negócio</span> (o que gerencia a empresa).</li>
                    <li>2. Pesquise o nome do seu negócio no Google. No painel da empresa (à direita), clique em <span className="font-medium">“Peça avaliações”</span>.</li>
                    <li>3. O Google gera um link curto (ex: <span className="font-medium">g.page/r/…</span>). Copie e cole aqui.</li>
                  </ol>
                  <p className="mt-1 font-medium text-on-background">Não achou essa opção? Use o link do perfil:</p>
                  <ol className="ml-1 flex flex-col gap-1.5">
                    <li>1. Pesquise o nome do seu negócio no Google.</li>
                    <li>2. No painel da empresa, toque em <span className="font-medium">Compartilhar</span> e copie o link do perfil.</li>
                    <li>3. Cole aqui — o cliente cai no seu perfil do Google e avalia por lá.</li>
                  </ol>
                  <p className="mt-1">Ainda não tem o negócio no Google? Cadastre grátis em <span className="font-medium">google.com/business</span> — leva 5 minutos e é essencial pra aparecer nas buscas.</p>
                </div>
              </details>
            </div>
          )}

          {cfg.action === "endereco" && (
            <div className="flex flex-col gap-2">
              <input
                value={cfg.url ?? ""}
                onChange={(e) => update({ url: e.target.value })}
                onBlur={() => !liveOnly && onSave(cfg)}
                placeholder="Rua, número — bairro, cidade"
                className="rounded-2xl border border-divider px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
              />
              <p className="text-[12px] leading-relaxed text-text-tertiary">
                O visitante vê esse endereço com um botão pra abrir no Waze e outro no Google Maps.
              </p>
            </div>
          )}
        </>
      )}

      {/* Ícone animado roda sempre com fundo transparente (regra do app) —
          então nem mostramos seletor de cor, só avisamos. */}
      {animated ? (
        <div className="flex items-center gap-2 rounded-2xl bg-surface-soft px-4 py-2.5">
          <span className="orbi-checkerboard h-6 w-6 shrink-0 rounded-full border border-divider" />
          <span className="text-[12px] leading-relaxed text-text-secondary">Ícone animado — fundo transparente automático, pra ele aparecer sozinho.</span>
        </div>
      ) : (
        <>
          <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Cor</p>
          <button
            onClick={() => setColorModalOpen(true)}
            className="flex items-center gap-2.5 self-start rounded-full border border-divider py-1.5 pl-1.5 pr-4"
          >
            <span className="h-8 w-8 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[13px] font-medium">Escolher cor</span>
          </button>
        </>
      )}

      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Ícone</p>

      {/* Emblema 3D animado de contato — ótimo pro box de WhatsApp. */}
      <button
        onClick={() => pickIcon("__wadisc__")}
        className={`flex items-center gap-2.5 self-start rounded-full border py-1.5 pl-1.5 pr-4 ${cfg.icon === "__wadisc__" || cfg.icon === "__orbwa__" ? "border-on-background" : "border-divider"}`}
      >
        <span className="h-8 w-8 overflow-hidden rounded-full"><OrbiContactDisc size={32} /></span>
        <span className="text-[13px] font-medium">Emblema de contato animado</span>
      </button>

      <button
        onClick={() => pickIcon("__google__")}
        className={`flex items-center gap-2.5 self-start rounded-full border py-1.5 pl-1.5 pr-4 ${cfg.icon === "__google__" ? "border-on-background" : "border-divider"}`}
      >
        <span className="h-8 w-8 overflow-hidden rounded-full"><OrbiGoogleIcon size={32} /></span>
        <span className="text-[13px] font-medium">Google animado</span>
      </button>
      <button
        onClick={() => pickIcon("__pin__")}
        className={`flex items-center gap-2.5 self-start rounded-full border py-1.5 pl-1.5 pr-4 ${cfg.icon === "__pin__" ? "border-on-background" : "border-divider"}`}
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full"><OrbiMapPin size={22} /></span>
        <span className="text-[13px] font-medium">Pin animado</span>
      </button>

      {/* Logotipo: mostra todos os que já foram enviados (em Configurações ou
          em qualquer outro box) como sugestão pronta — sempre a biblioteca
          inteira, em todo box, novo ou existente. */}
      {(() => {
        const gallery = Array.from(new Set([...(logoUrl ? [logoUrl] : []), ...(logoGallery ?? [])]));
        return gallery.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Logotipos já enviados</p>
            <div className="flex flex-wrap gap-2">
              {gallery.map((url) => (
                <button
                  key={url}
                  onClick={() => { update({ icon: "__logo__", logo_url: url }); if (!liveOnly) onSave({ ...cfg, icon: "__logo__", logo_url: url }); }}
                  className={`h-11 w-11 overflow-hidden rounded-full border-2 ${cfg.icon === "__logo__" && (cfg.logo_url ?? logoUrl) === url ? "border-on-background" : "border-transparent"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      <details className="self-start">
        <summary className="cursor-pointer list-none text-[12px] font-medium text-text-secondary underline">
          ＋ Enviar um novo logotipo
        </summary>
        <div className="mt-2">
          <ImageUpload
            value={null}
            businessId={businessId}
            lockedRatio="quadrado"
            promptKind="avatar"
            onChange={(url) => {
              if (!url) return;
              const next = { ...cfg, logo_url: url, icon: "__logo__" };
              setCfg(next);
              onSave(next);
              onNewLogo?.(url);
            }}
          />
        </div>
      </details>
      <div className="flex flex-wrap gap-1.5">
        {(showAllIcons ? ICON_CHOICES : ICON_CHOICES.slice(0, ICON_LIBRARY_PREVIEW_COUNT)).map((ic) => (
          <button
            key={ic}
            onClick={() => pickIcon(ic)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-[14px] ${cfg.icon === ic ? "border-on-background bg-surface-soft" : "border-divider"}`}
          >
            {ic}
          </button>
        ))}
        {!showAllIcons && ICON_CHOICES.length > ICON_LIBRARY_PREVIEW_COUNT && (
          <button
            onClick={() => setShowAllIcons(true)}
            className="flex h-9 items-center justify-center rounded-full border border-dashed border-divider px-3 text-[12px] font-medium text-text-secondary"
          >
            Ver mais
          </button>
        )}
      </div>


      {onDelete && (
        <button onClick={onDelete} className="mt-1 self-start text-[12px] text-red-600">
          Excluir esta Box
        </button>
      )}

      {colorModalOpen && (
        <ColorPickerModal current={color} brandColors={brandColors} onSelect={pickColor} onClose={() => setColorModalOpen(false)} />
      )}
    </div>
  );
}

/** Paleta completa — as mesmas 5 da Vitrine, mais a Marca quando existe.
 * Abre de baixo pra cima, com abas, igual o seletor de cor de box na Vitrine. */
function ColorPickerModal({
  current,
  brandColors,
  onSelect,
  onClose,
}: {
  current: string;
  brandColors: BrandColor[];
  onSelect: (hex: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(brandColors.length > 0 ? "Marca" : PALETTE_GROUPS[0].name);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[75vh] overflow-y-auto rounded-t-[28px] bg-surface-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-divider" aria-label="Fechar" />
        <p className="text-center text-[14px] font-medium">Escolher cor</p>

        <div className="mt-4 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {brandColors.length > 0 && (
            <button
              onClick={() => setTab("Marca")}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${tab === "Marca" ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
            >
              ✦ Marca
            </button>
          )}
          {PALETTE_GROUPS.map((g) => (
            <button
              key={g.name}
              onClick={() => setTab(g.name)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium ${tab === g.name ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
            >
              {g.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-6 gap-3 pb-2">
          {tab === "Marca"
            ? brandColors.map((bc, i) => (
                <button
                  key={`${bc.hex}-${i}`}
                  onClick={() => { onSelect(bc.hex); onClose(); }}
                  aria-label={bc.role ?? bc.hex}
                  title={bc.role ?? bc.hex}
                  className={`aspect-square rounded-full border-2 ${current.toLowerCase() === bc.hex.toLowerCase() ? "border-on-background" : "border-transparent"}`}
                  style={{ backgroundColor: bc.hex }}
                />
              ))
            : Object.entries(PALETTE_GROUPS.find((g) => g.name === tab)?.colors ?? {}).map(([key, c]) => (
                <button
                  key={key}
                  onClick={() => { onSelect(c.bg); onClose(); }}
                  aria-label={c.label}
                  title={c.label}
                  className={`aspect-square rounded-full border-2 ${current.toLowerCase() === c.bg.toLowerCase() ? "border-on-background" : "border-transparent"}`}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
        </div>
      </div>
    </div>
  );
}
