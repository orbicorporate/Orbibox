"use client";

import { LogoBolinha, LOGO_DESLOC_MAX, LOGO_ZOOM_MAX, LOGO_ZOOM_MIN, limitarLogo, type LogoAjuste } from "@/components/ui/LogoBolinha";
import { LIMITES_GRATIS, caixaBloqueadaNoGratis } from "@/lib/planoGratis";
import { avisarErroSalvar, conferirSalvo, excluirComDesfazer } from "@/components/ui/AvisoSalvar";
import { IconeRede, nomeDaRede, redeDoLink } from "@/lib/redesSociais";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { GalleryUpload } from "@/components/ui/GalleryUpload";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { OrbiContactDisc } from "@/components/orbi/OrbiContactDisc";
import { OrbiGoogleIcon } from "@/components/orbi/OrbiGoogleIcon";
import { OrbiLogoBadge } from "@/components/orbi/OrbiLogoBadge";
import { OrbiMapPin } from "@/components/orbi/OrbiMapPin";
import { OrbiMoneyIcon, OrbiPercentIcon, OrbiArrowIcon, OrbiHeartIcon, OrbiGiftIcon, OrbiHappyIcon, OrbiDogIcon, OrbiLeafIcon } from "@/components/orbi/OrbiEmojiStickers";
import { PALETTE_GROUPS, ICON_LIBRARY, ICON_LIBRARY_PREVIEW_COUNT, isAnimatedIcon, isVideoUrl } from "@/lib/showcase";
import { HomeOptionCardPreview } from "@/components/orbi/HomeOptionCard";
import { BOX_DEFAULT_DESCRIPTION } from "@/lib/boxDefaults";
import { SecaoRecolhivel } from "@/components/ui/SecaoRecolhivel";
import { YoutubeAdder } from "@/components/ui/YoutubeAdder";
import { addToLogoGallery, salvarLogoGallery } from "@/lib/logoGallery";
import { DateTimeField } from "./DateTimeField";
import { IconeBotao } from "@/app/[slug]/IconeBotao";
import { IconeLinha, ICONES_LINHA, ehIconeLinha } from "@/components/ui/IconesLinha";

type BrandColor = { hex: string; role?: string };
type BoxConfig = { label?: string; subtitle?: string; icon?: string; color?: string; action?: "vitrine" | "zara" | "whatsapp" | "link" | "avaliar" | "endereco" | "cupom" | "gift" | "delivery" | "cardapio" | "materiais"; url?: string; logo_url?: string; logo_ajuste?: LogoAjuste; layout?: "auto" | "largo" | "medio" };
type Box = { id: string; box_type: string; title: string | null; position: number; is_active: boolean; auto_arranged: boolean; config: unknown; starts_at: string | null; ends_at: string | null };
type DifferentialCard = { icon?: string; title: string; description?: string };

const META: Record<string, { name: string; explica: string; icon: string; fixo?: boolean; assinatura?: boolean }> = {
  hero: {
    name: "Tela inicial",
    explica: "A pergunta “O que trouxe você aqui hoje?”. É a tela em si, não um botão, por isso não tem nome nem cor pra editar.",
    icon: "◈",
    fixo: true,
  },
  product: { name: "Catálogo", explica: "Mostra seus produtos e serviços no catálogo que você montou.", icon: "▤" },
  content: { name: "Conhecer", explica: "Conta sobre a marca, texto e fotos, usando o tom de voz do seu DNA.", icon: "◫" },
  campaign: { name: "Presentear", explica: "Uma seleção pensada para quem vai comprar para outra pessoa.", icon: "◇" },
  // O box da IA usa as partículas como assinatura fixa, é o "wow" do produto.
  // Sempre existe (não dá pra excluir), mas o dono pode ativar/desativar.
  agent: { name: "Pergunte o que quiser", explica: "Abre a conversa com a Orbi, sua IA. As partículas mostram que ali é inteligência artificial de verdade.", icon: "__orb__", assinatura: true },
};

const ACTION_LABEL: Record<NonNullable<BoxConfig["action"]>, string> = {
  vitrine: "Abre o Catálogo",
  zara: "Abre a Orbi",
  whatsapp: "Abre o WhatsApp",
  avaliar: "Avaliar no Google",
  endereco: "Mostra o endereço",
  link: "Abre um link",
  cupom: "Abre os vouchers",
  gift: "Abre o gift card",
  delivery: "Abre os apps de delivery",
  cardapio: "Abre o cardápio",
  materiais: "Abre os materiais",
};

/** Explicação curta de onde o cliente vai parar e de onde aquilo vem, pros
 * boxes de ação fixa. Sem isso, "Abre o gift card" soa como se já
 * existisse um gift pronto. */
const ACAO_EXPLICA: Partial<Record<NonNullable<BoxConfig["action"]>, { titulo: string; texto: string; href?: string; link?: string }>> = {
  gift: {
    titulo: "Abre a tela de presentear",
    texto: "Seu cliente escolhe um valor, escreve uma mensagem pra quem vai ganhar e combina o pagamento com você no WhatsApp. Você confirma e o gift card é liberado.",
    href: "/admin/gift",
    link: "Ver valores e pedidos de gift card →",
  },
  cardapio: {
    titulo: "Abre o cardápio",
    texto: "Os pratos do seu cardápio, por categoria, com nome, preço e, se quiser, foto e descrição. É separado do Catálogo.",
    href: "/admin/cardapio",
    link: "Configurar o cardápio →",
  },
  materiais: {
    titulo: "Abre a página de materiais",
    texto: "Guias, cursos e documentos para o cliente baixar. Cada material pode ser livre ou pedir nome e WhatsApp antes.",
    href: "/admin/materiais",
    link: "Gerenciar materiais →",
  },
  delivery: {
    titulo: "Abre seus apps de delivery",
    texto: "O cliente escolhe o app (iFood, Rappi, 99Food e outros) e vai direto para o seu perfil nele. Cada toque é contado no Pulse.",
    href: "/admin/delivery",
    link: "Escolher apps e links →",
  },
  cupom: {
    titulo: "Abre seus vouchers",
    texto: "O cliente vê as ofertas ativas e pega um código só dele, que você valida na hora de atender.",
    href: "/admin/vouchers",
    link: "Gerenciar vouchers →",
  },
  endereco: {
    titulo: "Mostra o endereço",
    texto: "Com atalho pro Waze e Google Maps.",
    href: "/admin/config/marca#endereco",
    link: "Alterar endereço →",
  },
  avaliar: {
    titulo: "Leva pra avaliação no Google",
    texto: "Abre direto a tela de deixar estrelas no seu perfil do Google.",
  },
};

/** Descrição do box personalizado, específica pra cada atalho pronto
 * (WhatsApp, avaliação, endereço, gift), já que eles nascem de um botão
 * dedicado e não são um "caminho livre" como um box de link qualquer.
 * Sem action reconhecida (ou action "link"), cai na frase genérica. */
const CUSTOM_EXPLICA: Partial<Record<NonNullable<BoxConfig["action"]>, string>> = {
  whatsapp: "Abre a conversa no WhatsApp, com sua mensagem já pronta.",
  avaliar: "Leva direto pra avaliação no Google, sem precisar procurar.",
  endereco: "Mostra o endereço com atalho pro Waze e Google Maps.",
  gift: "Abre o fluxo de vale-presente: o cliente monta e você libera.",
};
const CUSTOM_EXPLICA_GENERICA = "Um caminho extra que você define, WhatsApp, portfólio, qualquer link.";

const ICON_CHOICES = ICON_LIBRARY;
const DIFF_ICONS = ICON_LIBRARY;

/** Mapa dos 8 selos de emoji animados, pra não repetir o switch em cada
 * lugar que precisa renderizar um ícone animado pelo valor salvo. */
const EMOJI_STICKERS: Record<string, (size: number) => ReactNode> = {
  __money__: (s) => <OrbiMoneyIcon size={s} />,
  __percent__: (s) => <OrbiPercentIcon size={s} />,
  __arrow__: (s) => <OrbiArrowIcon size={s} />,
  __heart__: (s) => <OrbiHeartIcon size={s} />,
  __gift__: (s) => <OrbiGiftIcon size={s} />,
  __happy__: (s) => <OrbiHappyIcon size={s} />,
  __dog__: (s) => <OrbiDogIcon size={s} />,
  __leaf__: (s) => <OrbiLeafIcon size={s} />,
};

/** Preto ou branco, o que der mais contraste, pra ícone ficar legível em
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
  abrirNovo = false,
  businessId,
  businessName,
  initialBoxes,
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
  giftEnabled,
  hasAiChat,
  gratis = false,
}: {
  abrirNovo?: boolean;
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
  giftEnabled: boolean;
  hasAiChat: boolean;
  /** Plano grátis: até 7 botões ligados (3 bolinhas e 4 boxes), sem vouchers, gift, IA e PDF. */
  gratis?: boolean;
}) {
  const supabase = createClient();
  // "Presentear" é um só. Boxes de gift criados pelo atalho antigo repetem
  // o box fixo de campanha; quando os dois existem, o antigo é removido
  // (some da lista na hora e é apagado no banco).
  const temCampanha = initialBoxes.some((b) => b.box_type === "campaign");
  const giftsRepetidos = temCampanha
    ? initialBoxes.filter((b) => b.box_type === "custom" && (b.config as { action?: string } | null)?.action === "gift")
    : [];
  const [boxes, setBoxes] = useState<Box[]>(() => initialBoxes.filter((b) => !giftsRepetidos.includes(b)));
  useEffect(() => {
    if (giftsRepetidos.length === 0) return;
    supabase.from("smart_boxes").delete().in("id", giftsRepetidos.map((b) => b.id)).then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [storyPhotos, setStoryPhotos] = useState<string[]>(initialStoryPhotos);
  const [aboutBusiness, setAboutBusiness] = useState(initialAboutBusiness);
  const [cards, setCards] = useState<DifferentialCard[]>(initialDifferentialsCards);
  const [heroQuestion, setHeroQuestion] = useState(initialHeroQuestion ?? "");
  const perguntaRemovida = heroQuestion.length > 0 && heroQuestion.trim() === "";
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoGallery, setLogoGallery] = useState<string[]>(initialLogoGallery);
  const [heroAvatar, setHeroAvatar] = useState(initialHeroAvatar ?? "auto");

  async function saveHeroAvatar(value: string) {
    setHeroAvatar(value);
    conferirSalvo(await supabase.from("businesses").update({ hero_avatar: value }).eq("id", businessId));
  }
  const [aboutImportUrl, setAboutImportUrl] = useState("");
  const [importingAbout, setImportingAbout] = useState(false);
  const [aboutImportMsg, setAboutImportMsg] = useState<{ kind: "ok" | "erro"; text: string } | null>(null);
  const [arranging, setArranging] = useState(false);
  // ?box=<id> (vindo de outra tela, ex: painel de vouchers) já abre esse box
  // em modo de edição e rola até ele.
  const [reordenando, setReordenando] = useState(false);
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("box") : null),
  );

  useEffect(() => {
    if (!editingId) return;
    // ?ir=fotos|diferenciais (vindo das pendências da página inicial): rola até a parte
    // que falta e dá uma piscada suave nela, pra pessoa ver onde mexer.
    const ir = new URLSearchParams(window.location.search).get("ir");
    const parte = ir ? document.getElementById(`sobre-${ir}`) : null;
    const el = parte ?? document.getElementById(`box-${editingId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: parte ? "start" : "center" });
      if (parte && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        parte.animate(
          [{ boxShadow: "0 0 0 0 rgba(17,19,24,0)" }, { boxShadow: "0 0 0 6px rgba(17,19,24,.18)" }, { boxShadow: "0 0 0 0 rgba(17,19,24,0)" }],
          { duration: 1800, delay: 500, easing: "ease-in-out" },
        );
      }
    }
    // só na montagem: depois disso quem abre é o toque da pessoa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [creating, setCreating] = useState(abrirNovo);
  const [draft, setDraft] = useState<BoxConfig>({ label: "", subtitle: "", icon: "◆", action: "link", url: "" });
  const [draftLabel, setDraftLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Plano grátis: no máximo 3 bolinhas + 4 boxes ligados, e nada de recurso pago.
  const ligadosGratis = boxes.filter((b) => b.is_active && b.box_type !== "hero").length;
  const maxLigadosGratis = LIMITES_GRATIS.bolinhas + LIMITES_GRATIS.boxes;

  async function toggleActive(box: Box) {
    if (META[box.box_type]?.fixo) return;
    if (gratis && !box.is_active) {
      if (caixaBloqueadaNoGratis(box)) { avisarErroSalvar("Esse botão não está no plano grátis. Assine para ligar."); return; }
      if (ligadosGratis >= maxLigadosGratis) { avisarErroSalvar(`No grátis são até ${maxLigadosGratis} botões ligados. Desligue um ou assine.`); return; }
    }
    const c = (box.config ?? {}) as BoxConfig;
    if (!box.is_active && box.box_type === "custom" && (c.action === "link" || c.action === "avaliar") && !c.url?.trim()) {
      avisarErroSalvar("Esse botão ainda não tem link. Abra, cole o link e depois ligue.");
      setEditingId(box.id);
      return;
    }
    const res = await supabase.from("smart_boxes").update({ is_active: !box.is_active }).eq("id", box.id);
    if (conferirSalvo(res)) setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, is_active: !b.is_active } : b)));
  }

  async function autoArrange() {
    setArranging(true);
    const priority: Record<string, number> = { hero: 0, product: 1, content: 2, campaign: 3, agent: 4, custom: 5 };
    const sorted = [...boxes].sort((a, b) => (priority[a.box_type] ?? 9) - (priority[b.box_type] ?? 9));
    const rs = await Promise.all(sorted.map((b, i) => supabase.from("smart_boxes").update({ position: i, auto_arranged: true }).eq("id", b.id)));
    setArranging(false);
    if (!conferirSalvo(rs.find((r) => r.error) ?? { error: null })) return;
    setBoxes(sorted.map((b, i) => ({ ...b, position: i, auto_arranged: true })));
  }

  async function move(box: Box, dir: -1 | 1) {
    const ordered = [...boxes].sort((a, b) => a.position - b.position);
    const idx = ordered.findIndex((b) => b.id === box.id);
    const swap = ordered[idx + dir];
    if (!swap) return;
    const rs = await Promise.all([
      supabase.from("smart_boxes").update({ position: swap.position }).eq("id", box.id),
      supabase.from("smart_boxes").update({ position: box.position }).eq("id", swap.id),
    ]);
    if (!conferirSalvo(rs.find((r) => r.error) ?? { error: null }, "Não conseguimos mudar a ordem. Tente de novo.")) return;
    setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, position: swap.position } : b.id === swap.id ? { ...b, position: box.position } : b)));
  }

  async function saveConfig(box: Box, cfg: BoxConfig) {
    setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, title: cfg.label ?? b.title, config: cfg } : b)));
    conferirSalvo(await supabase.from("smart_boxes").update({ title: cfg.label || box.title, config: cfg }).eq("id", box.id));
    // A página inicial guarda a tela em cache ao navegar: sem isso, ao voltar pra ela o ícone/nome antigo aparecia por um tempo.
    router.refresh();
  }

  async function saveSchedule(box: Box, startsAt: string | null, endsAt: string | null) {
    setBoxes((p) => p.map((b) => (b.id === box.id ? { ...b, starts_at: startsAt, ends_at: endsAt } : b)));
    conferirSalvo(await supabase.from("smart_boxes").update({ starts_at: startsAt, ends_at: endsAt }).eq("id", box.id));
    router.refresh();
  }

  async function removeCustom(box: Box) {
    setEditingId(null);
    setBoxes((p) => p.filter((b) => b.id !== box.id));
    excluirComDesfazer({
      texto: `Botão "${box.title ?? "sem nome"}" excluído`,
      restaurar: () => setBoxes((p) => [...p, box]),
      executar: () => Promise.resolve(supabase.from("smart_boxes").delete().eq("id", box.id)),
    });
  }

  async function saveStoryPhotos(urls: string[]) {
    setStoryPhotos(urls);
    conferirSalvo(await supabase.from("businesses").update({ story_photos: urls }).eq("id", businessId));
  }

  async function saveAboutBusiness(value: string) {
    conferirSalvo(await supabase.from("businesses").update({ about_business: value || null }).eq("id", businessId));
  }

  async function saveHeroQuestion(value: string) {
    // Um espaço = removida de propósito; vazio por nunca ter escrito (null) usa a frase padrão.
    conferirSalvo(await supabase.from("businesses").update({ hero_question: value.trim() ? value : value.length > 0 ? " " : null }).eq("id", businessId));
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
      setAboutImportMsg({ kind: "ok", text: "Pronto, texto e diferenciais atualizados. Dá uma conferida abaixo e ajusta se quiser." });
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
    conferirSalvo(await supabase.from("businesses").update({ differentials_cards: next, differentials: plainText || null }).eq("id", businessId));
  }

  async function createCustom() {
    const nome = draftLabel.trim();
    if (!nome) {
      setCreateError("Dê um nome pro botão antes de criar.");
      return;
    }
    if ((draft.action === "link" || draft.action === "avaliar") && !draft.url?.trim()) {
      setCreateError(draft.action === "avaliar" ? "Cole o link da sua avaliação no Google antes de criar." : "Cole o link pra onde o botão leva antes de criar.");
      return;
    }
    if (gratis && ligadosGratis >= maxLigadosGratis) {
      setCreateError(`No grátis são até ${maxLigadosGratis} botões ligados. Desligue um ou assine.`);
      return;
    }
    if (gratis && caixaBloqueadaNoGratis({ box_type: "custom", config: draft })) {
      setCreateError("Esse tipo de botão não está no plano grátis.");
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
      // Abre o box recém-criado já em edição: é onde vive o Agendar
      // (opcional), que só existe pra um box que já tem id salvo. Sem
      // isso, a pessoa criava o box e caía numa lista fechada, sem ver
      // onde configurar a agenda.
      setEditingId((data as Box).id);
    } else {
      setCreateError("Não foi possível criar. Tente de novo.");
    }
  }

  // Atalho: já abre o criador com um box de avaliação do Google pré-montado
  // (nome, ícone de estrela e ação "avaliar"), é só a pessoa colar o link.
  function novoBoxAvaliacao() {
    setDraftLabel("Avalie no Google"); setDraft({ label: "Avalie no Google", subtitle: "Deixe sua nota, leva 10 segundos", icon: "__google__", action: "avaliar", url: "", color: "transparent" });
    setCreating(true);
  }

  // Atalho: box de endereço pré-montado, a pessoa só cola o endereço e o
  // box já sai pronto com os botões de Waze e Google Maps.
  function novoBoxEndereco() {
    setDraftLabel("Como chegar"); setDraft({ label: "Como chegar", subtitle: "Veja no mapa", icon: "__pin__", action: "endereco", url: initialAddress ?? "", color: "transparent" });
    setCreating(true);
  }

  // Atalho: box de cupom, abre o gerenciador de vouchers (criação e resgate
  // ficam numa página própria, não dá pra configurar direto por aqui).
  function novoBoxVoucher() {
    setDraftLabel("Vouchers"); setDraft({ label: "Vouchers", subtitle: "Resgate agora e aproveite", icon: "__ticket__", action: "cupom", url: "", color: "transparent" });
    setCreating(true);
  }

  function novoBoxWhatsapp() {
    setDraftLabel("Fale no WhatsApp"); setDraft({ label: "Fale no WhatsApp", subtitle: "Atendimento rápido", icon: "__wadisc__", action: "whatsapp", url: "", color: "transparent" });
    setCreating(true);
  }

  const ordered = [...boxes].sort((a, b) => a.position - b.position);
  const visibleBoxes = ordered.filter((b) => b.box_type !== "hero");
  const ativos = ordered.filter((b) => b.is_active && !META[b.box_type]?.fixo).length;

  // Box da Orbi (IA): existe pra o negócio mas está desativado? Nesse caso
  // mostramos um atalho pra reativar na área de sugestões.
  const orbiBox = ordered.find((b) => b.box_type === "agent");
  const orbiDesativada = !!orbiBox && !orbiBox.is_active;

  async function reativarOrbi() {
    if (!orbiBox) return;
    setBoxes((p) => p.map((b) => (b.id === orbiBox.id ? { ...b, is_active: true } : b)));
    await supabase.from("smart_boxes").update({ is_active: true }).eq("id", orbiBox.id);
  }

  return (
    <div className="mt-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={autoArrange}
          disabled={arranging}
          className="rounded-full bg-surface-white px-3.5 py-1.5 text-[12.5px] font-medium text-text-secondary ring-1 ring-black/[0.08] disabled:opacity-60"
        >
          {arranging ? "Organizando…" : "✦ Sugerir ordem"}
        </button>
        <button
          onClick={() => setReordenando((v) => !v)}
          className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ring-1 ring-black/[0.08] ${reordenando ? "bg-on-background text-white" : "bg-surface-white text-text-secondary"}`}
        >
          {reordenando ? "Concluir" : "Reordenar"}
        </button>
        <span className="text-[12.5px] text-text-tertiary">
          {ativos === 0 ? "Nenhum botão ligado" : `${ativos} ${ativos === 1 ? "botão ligado" : "botões ligados"}`}
        </span>
      </div>

      <SecaoRecolhivel
        titulo="Tela inicial"
        descricao="Saudação e avatar do topo"
        preenchido
        compacto
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-[22px] bg-white p-4 shadow-[0_10px_24px_-16px_rgba(17,19,24,0.25)] ring-1 ring-black/[0.06]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-on-background" aria-hidden>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3 21l1.4-5.5A8.5 8.5 0 1 1 21 12Z" /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-tight">Saudação</p>
                <p className="text-[12.5px] text-text-tertiary">Aparece antes do seu nome</p>
              </div>
              {!perguntaRemovida && (
                <button
                  type="button"
                  onClick={() => { setHeroQuestion(" "); saveHeroQuestion(" "); }}
                  className="shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-text-secondary ring-[0.5px] ring-black/25 active:scale-95"
                >
                  Remover
                </button>
              )}
            </div>
            <input
              value={heroQuestion}
              onChange={(e) => setHeroQuestion(e.target.value)}
              onBlur={(e) => saveHeroQuestion(e.target.value)}
              placeholder={perguntaRemovida ? "Removida. Escreva para voltar." : "O que trouxe você aqui hoje?"}
              className="mt-3 w-full rounded-full bg-surface-soft px-4 py-3 text-[14.5px] outline-none ring-1 ring-transparent focus:ring-on-background/30"
            />
          </div>

          <div className="rounded-[22px] bg-white p-4 shadow-[0_10px_24px_-16px_rgba(17,19,24,0.25)] ring-1 ring-black/[0.06]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-on-background" aria-hidden>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-tight">Avatar</p>
                <p className="text-[12.5px] text-text-tertiary">O que aparece no topo</p>
              </div>
            </div>
            {(() => {
              // Qualquer logo já enviado, em Configurações ou em qualquer box , 
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
                      className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 bg-surface-soft py-3.5 ${(heroAvatar === "particle" || heroAvatar === "sphere" || (heroAvatar === "auto" && !availableLogo)) ? "border-on-background" : "border-transparent"}`}
                    >
                      <OrbiParticleSphere size={40} colors={orbiColors ?? undefined} className="rounded-full" />
                      <span className="text-[12.5px] font-medium">Esfera da Orbi</span>
                    </button>
                    <button
                      onClick={pickLogoAvatar}
                      disabled={!availableLogo}
                      className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border-2 bg-surface-soft py-3.5 disabled:opacity-40 ${(heroAvatar.startsWith("logo") || heroAvatar.startsWith("sem-fundo") || heroAvatar.startsWith("esfera") || (heroAvatar === "auto" && !!availableLogo)) ? "border-on-background" : "border-transparent"}`}
                    >
                      {availableLogo ? <OrbiLogoBadge logoUrl={availableLogo} size={40} /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-soft text-[16px]">◎</span>}
                      <span className="text-[12.5px] font-medium">Logotipo</span>
                    </button>
                  </div>
                  {/* Cor e logotipo se trocam em Sua marca, um lugar só. */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/admin/config/marca#cores" className="inline-block rounded-full px-4 py-2 text-[12.5px] font-medium text-text-secondary ring-[0.5px] ring-black/25">
                      Cor da esfera
                    </Link>
                    <Link href="/admin/config/marca#logo" className="inline-block rounded-full px-4 py-2 text-[12.5px] font-medium text-text-secondary ring-[0.5px] ring-black/25">
                      {availableLogo ? "Trocar logotipo" : "Enviar logotipo"}
                    </Link>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </SecaoRecolhivel>

      <div className="grid grid-cols-2 gap-3">
        {visibleBoxes.map((box, idx) => {
          const isHero = false;
          const isCustom = box.box_type === "custom";
          const cfg = box.config as BoxConfig | null;
          // Cardápio e Delivery viram um quadrado só no painel (na página do visitante seguem separados).
          const bCardapio = visibleBoxes.find((b) => (b.config as BoxConfig | null)?.action === "cardapio");
          const bDelivery = visibleBoxes.find((b) => (b.config as BoxConfig | null)?.action === "delivery");
          if (bCardapio && bDelivery) {
            if (box.id === bDelivery.id) return null;
            if (box.id === bCardapio.id) {
              const linhas = [
                { b: bCardapio, nome: "Cardápio", href: "/admin/cardapio", sub: "Pratos por categoria, com foto" },
                { b: bDelivery, nome: "Delivery", href: "/admin/delivery", sub: "iFood, Rappi, 99Food e mais" },
              ];
              return (
                <div key="grupo-cardapio-delivery" className="relative overflow-hidden rounded-[22px] border border-divider bg-surface-white p-3.5">
                  <Link href="/admin/cardapio" className="flex w-full cursor-pointer flex-col gap-2.5 text-left">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface-soft text-on-background">
                      <IconeBotao icone={(bCardapio.config as BoxConfig | null)?.icon || "🍴"} size={22} />
                    </span>
                    <span className="block">
                      <span className="block text-[15px] font-semibold leading-snug">Cardápio e delivery</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">
                        {linhas.map((l) => `${l.nome} ${l.b.is_active ? "ligado" : "desligado"}`).join(" · ")}
                      </span>
                    </span>
                  </Link>
                  {reordenando && (
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => move(box, -1)} disabled={idx === 0} aria-label="Mover pra trás" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-text-secondary disabled:opacity-30">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
                      </button>
                      <button type="button" onClick={() => move(box, 1)} disabled={idx === visibleBoxes.length - 1} aria-label="Mover pra frente" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-text-secondary disabled:opacity-30">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            }
          }
          const mBase = META[box.box_type] ?? { name: cfg?.label || box.title || "Botão livre", explica: (cfg?.action && CUSTOM_EXPLICA[cfg.action]) || CUSTOM_EXPLICA_GENERICA, icon: cfg?.icon || "◆" };
          // "Presentear" é a porta do Gift Card: com ele ativo, abre o
          // vale-presente; sem ele, mostra a vitrine pra quem vai presentear.
          const m = box.box_type === "campaign"
            ? { ...mBase, explica: giftEnabled ? "Abre o Gift Card: o cliente monta um vale-presente e combina o pagamento com você." : "Mostra seu catálogo pra quem vai comprar pra outra pessoa. Ative o Gift Card e ele vira vale-presente." }
            : mBase;
          // O box "Sobre" já sugere o nome da marca, o dono usa, ajusta ou desativa.
          const suggestedName = box.box_type === "content" ? `Sobre a ${businessName}` : m.name;
          const label = cfg?.label ?? (isCustom ? box.title ?? "" : suggestedName);
          const color = cfg?.color || "#111318";
          const icon = cfg?.icon || m.icon;
          const fg = contrastFg(color);
          const off = !box.is_active && !m.fixo;
          const editing = editingId === box.id;
          // Delivery e Cardápio têm tela própria: tocar leva direto pra ela, sem abrir o cartão aqui.
          const telaPropria = cfg?.action === "delivery" ? "/admin/delivery" : cfg?.action === "cardapio" ? "/admin/cardapio" : null;
          const abrirOuFechar = () => (telaPropria ? router.push(telaPropria) : setEditingId(editing ? null : box.id));
          return (
<div key={box.id} id={`box-${box.id}`} className={`relative scroll-mt-24 overflow-hidden rounded-[22px] border border-divider bg-surface-white p-3.5 ${editing ? "col-span-2" : ""} ${off ? "opacity-60" : ""}`}>
              <div className={`flex ${editing ? "items-center gap-3" : "flex-col gap-3"}`}>
                <button
                  type="button"
                  onClick={abrirOuFechar}
                  aria-expanded={editing}
                  className={`flex min-w-0 cursor-pointer text-left ${editing ? "flex-1 items-center gap-3" : "w-full flex-col gap-2.5"}`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[16px] ring-1 ring-black/[0.06] ${icon === "__logo__" ? "" : "overflow-hidden"}`} style={{ backgroundColor: isHero ? "#111318" : (color === "transparent" || isAnimatedIcon(icon) || icon === "__logo__") ? "transparent" : color, color: isHero ? "#fff" : fg }}>
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
                    ) : EMOJI_STICKERS[icon] ? (
                      EMOJI_STICKERS[icon](40)
                    ) : icon === "__logo__" && (cfg?.logo_url || logoUrl) ? (
                      <OrbiLogoBadge logoUrl={cfg?.logo_url || logoUrl!} size={40} ringColor={isHero ? undefined : color} />
                    ) : icon === "__none__" ? (
                      <span className="text-[20px] font-semibold leading-none" style={{ color: fg }} aria-hidden>→</span>
                    ) : (
                      <IconeBotao icone={icon} size={22} />
                    )}
                  </div>
                  <span className="block min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-snug line-clamp-2">{cfg?.action === "cupom" ? "Vouchers" : (label || suggestedName)}</span>
                    {(cfg?.action === "cupom" ? "Resgate agora e aproveite" : cfg?.subtitle) && (
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary line-clamp-1">{cfg?.action === "cupom" ? "Resgate agora e aproveite" : cfg?.subtitle}</span>
                    )}
                    {(m.fixo || m.assinatura || (cfg?.action === "avaliar" || icon === "__google__") || box.ends_at || box.starts_at) && (
                      <span className="mt-1.5 flex flex-wrap items-center gap-1">
                        {m.fixo && <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10.5px] text-text-secondary">sempre ativo</span>}
                        {m.assinatura && <span className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-2 py-0.5 text-[10.5px] text-text-secondary"><span className="orbi-gradient-text">✦</span> assinatura da IA</span>}
                        {(cfg?.action === "avaliar" || icon === "__google__") && <span className="text-[12px] tracking-[1px] text-[#FBBC05]">★★★★★</span>}
                        {box.ends_at && new Date(box.ends_at) < new Date() ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] text-red-600">expirado</span>
                        ) : box.starts_at && new Date(box.starts_at) > new Date() ? (
                          <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10.5px] text-text-secondary">agendado</span>
                        ) : null}
                      </span>
                    )}
                  </span>
                </button>
                <div className={`flex shrink-0 items-center gap-1.5 ${editing ? "" : "absolute right-3.5 top-3.5"}`}>
                  <button
                    type="button"
                    onClick={abrirOuFechar}
                    aria-label={editing ? "Fechar edição" : "Editar botão"}
                    className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${editing ? "bg-on-background text-white" : "bg-surface-soft text-text-secondary"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                  </button>
                  {!m.fixo && (
                    <button
                      type="button"
                      onClick={() => toggleActive(box)}
                      className={`h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors ${box.is_active ? "orbi-gradient" : "bg-divider"}`}
                      aria-label={box.is_active ? "Desativar" : "Ativar"}
                    >
                      <span className={`block h-5 w-5 rounded-full bg-surface-white shadow transition-transform ${box.is_active ? "translate-x-5" : ""}`} />
                    </button>
                  )}
                </div>
              </div>

              {reordenando && (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => move(box, -1)} disabled={idx === 0} aria-label="Mover pra trás" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-text-secondary disabled:opacity-30">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                  <button type="button" onClick={() => move(box, 1)} disabled={idx === visibleBoxes.length - 1} aria-label="Mover pra frente" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-text-secondary disabled:opacity-30">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
              )}

              {editing && (
                <div className="mt-3 flex flex-col gap-2.5">
                  {cfg?.action === "cupom" ? (
                    <p className="text-[12px] text-text-tertiary">Nome e texto fixos do botão de vouchers.</p>
                  ) : (
                    <>
                      <label className="block">
                        <span className="text-[12px] text-text-tertiary">Nome do botão</span>
                        <input
                          defaultValue={label}
                          onBlur={(e) => saveConfig(box, { ...(cfg ?? {}), label: e.target.value.trim() || suggestedName })}
                          placeholder={suggestedName}
                          className="mt-1 w-full rounded-full border border-[#CFCDC5] bg-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[12px] text-text-tertiary">Texto de apoio (opcional)</span>
                        <input
                          defaultValue={cfg?.subtitle ?? ""}
                          onBlur={(e) => saveConfig(box, { ...(cfg ?? {}), subtitle: e.target.value })}
                          placeholder="Uma frase curta embaixo do nome"
                          className="mt-1 w-full rounded-full border border-[#CFCDC5] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                        />
                      </label>
                    </>
                  )}
                </div>
              )}

              {box.box_type === "campaign" && (
                <Link href="/admin/gift" className="mt-1.5 inline-block text-[12.5px] text-text-secondary underline underline-offset-2">
                  {giftEnabled ? "Ver gift cards →" : "Ativar Gift Card →"}
                </Link>
              )}


              {editing && !isHero && (
                <div className="mt-3 rounded-3xl bg-[#ECEAE3] p-4">
              <details className="group mb-3">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-medium text-text-tertiary">
                  O que este botão faz
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-180" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
                </summary>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{m.explica}</p>
              </details>
                  <p className="mb-1.5 text-[11px] uppercase tracking-wide text-text-tertiary">Assim aparece pro visitante</p>
                  <HomeOptionCardPreview
                    layout={cfg?.layout && cfg.layout !== "auto" ? cfg.layout : "medio"}
                    icon={icon}
                    boxLogo={cfg?.logo_url}
                    color={color}
                    orbiColors={orbiColors}
                    businessLogo={logoUrl}
                    title={cfg?.action === "cupom" ? "Vouchers" : (label || suggestedName)}
                    ai={m.assinatura}
                    stars={cfg?.action === "avaliar"}
                    cupom={cfg?.action === "cupom"}
                    description={cfg?.action === "cupom" ? "Resgate agora e aproveite" : (cfg?.subtitle || (isCustom ? "" : (BOX_DEFAULT_DESCRIPTION[box.box_type] || "")))}
                    className={(!cfg?.layout || cfg.layout === "auto") ? "max-w-[190px]" : cfg.layout === "medio" ? "max-w-[190px]" : ""}
                  />
                  {(!cfg?.layout || cfg.layout === "auto") && (
                    <p className="mt-1.5 text-[11px] text-text-tertiary">No automático o formato real pode variar, aqui é uma prévia representativa.</p>
                  )}
                </div>
              )}

              {editing && !isHero && !m.assinatura && (
                <BoxEditor
                  initial={cfg ?? { subtitle: "", icon: m.icon, color: "#111318", action: "link", url: "" }}
                  isCustom={isCustom}
                  boxType={box.box_type}
                  brandColors={brandColors}
                  onSave={(next) => saveConfig(box, { ...next, label })}
                  onDelete={isCustom ? () => removeCustom(box) : undefined}
                  logoUrl={logoUrl}
                  logoGallery={logoGallery}
                  onNewLogo={async (url) => setLogoGallery(await addToLogoGallery(supabase, businessId, logoGallery, url))}
                  onGalleryChange={async (next) => { if (await salvarLogoGallery(supabase, businessId, next)) setLogoGallery(next); }}
                  businessId={businessId}
                  orbiColors={orbiColors}
                />
              )}

              {editing && !isHero && !m.fixo && (
                <div className="mt-5 rounded-[22px] border border-divider bg-surface-white">
                  <div className="flex items-center gap-3 rounded-t-[22px] border-b border-divider bg-surface-soft/70 px-4 py-3.5">
                    <span className="orbi-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px]">🗓️</span>
                    <div>
                      <p className="text-[13px] font-semibold">Agendar (opcional)</p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-text-tertiary">
                        Ativa e desativa sozinho nas datas escolhidas, bom pra promoção por tempo limitado.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 rounded-b-[22px] p-4">
                    <DateTimeField label="Começa em" value={box.starts_at} onChange={(iso) => saveSchedule(box, iso, box.ends_at)} />
                    <DateTimeField label="Termina em" value={box.ends_at} onChange={(iso) => saveSchedule(box, box.starts_at, iso)} />
                    {(box.starts_at || box.ends_at) && (
                      <button
                        onClick={() => saveSchedule(box, null, null)}
                        className="self-start text-[12px] font-medium text-red-600"
                      >
                        Remover agendamento
                      </button>
                    )}
                  </div>
                </div>
              )}

              {box.box_type === "content" && editing && (
                <div className="mt-4 flex flex-col gap-3.5 border-t border-divider pt-4">
                  <div className="rounded-[22px] bg-surface-soft p-4">
                    <p className="text-[15px] font-semibold text-on-background">Importar do site</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-text-secondary">
                      Cola o link do seu site e a Orbi lê e monta sozinha o texto &quot;Sobre nós&quot; e os diferenciais abaixo.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={aboutImportUrl}
                        onChange={(e) => setAboutImportUrl(e.target.value)}
                        placeholder="https://seusite.com.br"
                        className="min-w-0 flex-1 rounded-2xl border border-black/[0.1] bg-surface-white px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
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

                  <div className="rounded-[22px] bg-surface-soft p-4">
                    <p className="text-[15px] font-semibold text-on-background">Sobre nós</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-text-secondary">O texto que aparece na tela “Conhecer”, abaixo das fotos.</p>
                    <textarea
                      value={aboutBusiness}
                      onChange={(e) => setAboutBusiness(e.target.value)}
                      onBlur={(e) => saveAboutBusiness(e.target.value)}
                      rows={3}
                      placeholder="Quem vocês são, o que fazem, há quanto tempo..."
                      className="mt-2 w-full resize-none rounded-2xl border border-black/[0.1] bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
                    />
                  </div>
                  <div id="sobre-diferenciais" className="scroll-mt-24 rounded-[22px] bg-surface-soft p-4">
                    <p className="text-[15px] font-semibold text-on-background">Diferenciais</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-text-secondary">Cartões curtos com o que vocês têm de melhor.</p>
                    <div className="mt-2 flex flex-col gap-2.5">
                      {cards.map((c, i) => (
                        <div key={i} className="rounded-2xl bg-surface-white p-3 shadow-[0_1px_3px_rgba(17,19,24,0.08)] ring-1 ring-black/[0.06]">
                          <details className="group">
                            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-divider bg-surface-soft text-[16px]">{c.icon || DIFF_ICONS[0]}</span>
                              <span className="text-[13px] text-text-secondary group-open:hidden">Trocar ícone</span>
                              <span className="hidden text-[13px] text-text-secondary group-open:inline">Escolha um</span>
                              <button type="button" onClick={(e) => { e.preventDefault(); saveDifferentialsCards(cards.filter((_, xi) => xi !== i)); }} className="ml-auto min-h-[44px] px-2 text-[12.5px] text-red-600">Excluir</button>
                            </summary>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {DIFF_ICONS.map((ic) => (
                                <button
                                  key={ic}
                                  type="button"
                                  onClick={(e) => { saveDifferentialsCards(cards.map((x, xi) => (xi === i ? { ...x, icon: ic } : x))); (e.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open"); }}
                                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-[14px] ${(c.icon || DIFF_ICONS[0]) === ic ? "border-on-background bg-surface-soft" : "border-divider"}`}
                                >
                                  {ic}
                                </button>
                              ))}
                            </div>
                          </details>
                          <input
                            defaultValue={c.title}
                            onBlur={(e) => saveDifferentialsCards(cards.map((x, xi) => (xi === i ? { ...x, title: e.target.value } : x)))}
                            placeholder="Título (ex: Experiência sênior)"
                            className="mt-2 w-full rounded-full border border-black/[0.1] bg-surface-soft/50 px-4 py-2 text-[13px] font-medium outline-none focus:border-on-background"
                          />
                          <textarea
                            defaultValue={c.description ?? ""}
                            onBlur={(e) => saveDifferentialsCards(cards.map((x, xi) => (xi === i ? { ...x, description: e.target.value } : x)))}
                            rows={2}
                            placeholder="Uma frase explicando esse diferencial"
                            className="mt-1.5 w-full resize-none rounded-2xl border border-black/[0.1] bg-surface-soft/50 px-3 py-2 text-[13px] outline-none focus:border-on-background"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => saveDifferentialsCards([...cards, { icon: DIFF_ICONS[0], title: "", description: "" }])}
                        className="rounded-full border border-dashed border-text-tertiary/50 bg-surface-white py-2.5 text-[13px] font-medium text-text-secondary"
                      >
                        + Adicionar diferencial
                      </button>
                    </div>
                  </div>
                  <div id="sobre-fotos" className="scroll-mt-24 rounded-[22px] bg-surface-soft p-4">
                    <p className="text-[15px] font-semibold text-on-background">Fotos</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-text-secondary">Aparecem no topo da página Sobre. Toque no + para adicionar.</p>
                    <div className="mt-2">
                      <GalleryUpload
                        value={storyPhotos}
                        businessId={businessId}
                        lockedRatio="paisagem"
                        lockedReason="As fotos são sempre no formato paisagem, pra combinar com fotos de espaço/equipe e manter o carrossel uniforme."
                        emptySlots={1}
                        emptyLabel="Adicionar foto"
                        onChange={saveStoryPhotos}
                      />
                    </div>
                    <details className="mt-3 rounded-2xl bg-surface-soft">
                      <summary className="flex min-h-[44px] cursor-pointer list-none items-center px-4 text-[13.5px] font-medium">+ Adicionar vídeo (YouTube ou Reels)</summary>
                      <div className="px-4 pb-4">
                        <YoutubeAdder
                          videos={storyPhotos.filter((u) => isVideoUrl(u))}
                          showList={false}
                          semTexto
                          onAdd={(url) => {
                            if (storyPhotos.includes(url)) return;
                            saveStoryPhotos([...storyPhotos, url]);
                          }}
                          onRemove={(url) => saveStoryPhotos(storyPhotos.filter((u) => u !== url))}
                        />
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {creating ? (
        <div id="novo-botao" className="rounded-[22px] border border-dashed border-divider bg-surface-white p-4">
          <p className="text-[14px] font-medium">Novo botão personalizado</p>
          <input
            value={draftLabel}
            onChange={(e) => { setDraftLabel(e.target.value); setCreateError(null); }}
            placeholder="Nome do botão (ex: Fale no WhatsApp)"
            className="mt-3 w-full rounded-2xl border border-divider px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
          />
          <BoxEditor initial={draft} isCustom brandColors={brandColors} onSave={(cfg) => setDraft((d) => ({ ...d, ...cfg }))} liveOnly logoUrl={logoUrl} logoGallery={logoGallery} onNewLogo={async (url) => setLogoGallery(await addToLogoGallery(supabase, businessId, logoGallery, url))}
                  onGalleryChange={async (next) => { if (await salvarLogoGallery(supabase, businessId, next)) setLogoGallery(next); }} businessId={businessId} orbiColors={orbiColors} />
          {createError && <p className="mt-2 text-[12px] text-red-600">{createError}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={createCustom} className="rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white">Criar</button>
            <button onClick={() => { setCreating(false); setCreateError(null); }} className="rounded-full bg-surface-soft px-4 py-2 text-[13px]">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setCreating(true)}
            className="orbi-gradient flex items-center gap-3 rounded-[22px] p-4 text-left text-on-background"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-white/40 text-[20px]">＋</span>
            <span>
              <span className="block text-[14px] font-semibold">Criar botão personalizado</span>
              <span className="block text-[12.5px] opacity-80">Você escolhe o que ela faz, o nome, a cor e o ícone.</span>
            </span>
          </button>

          {/* Recomendado: um destaque só, o resto segue o mesmo formato. */}
          <p className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Recomendado para você</p>
          {hasVouchers ? (
            <LinhaPronta
              destaque
              icone={<span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FF7A5C] to-[#FF3B6E] text-[20px]">🎟️</span>}
              titulo="Botão de vouchers"
              nota="Atrai clientes"
              texto="Ofertas com estoque controlado."
              acao="Criar"
              onClick={novoBoxVoucher}
            />
          ) : (
            <LinhaPronta
              destaque
              icone={<span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FF7A5C] to-[#FF3B6E] text-[20px]">🎟️</span>}
              titulo="Botão de vouchers"
              nota="Novidade"
              texto="Traz gente nova para a sua página e captura o contato de quem resgata."
              acao="Ver como funciona"
              href="/admin/vouchers"
            />
          )}

          {hasAiChat && !orbiDesativada && (
            <>
              <p className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Já ativos</p>
              <LinhaPronta
                icone={<OrbiParticleSphere size={44} colors={orbiColors ?? undefined} vivid className="rounded-full" />}
                titulo="Botão da Orbi"
                texto="Tira dúvidas, recomenda produtos e captura contatos na sua página."
                ativo
              />
            </>
          )}

          <p className="mt-3 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Para adicionar</p>
          <div className="grid grid-cols-2 gap-3">
          {hasAiChat && orbiDesativada && (
            <LinhaPronta
            compacto
              icone={<OrbiParticleSphere size={44} colors={orbiColors ?? undefined} vivid className="rounded-full" />}
              titulo="Botão da Orbi"
              nota="Desativada"
              texto="Toque para reativar a assistente de IA na sua página."
              acao="Reativar"
              onClick={reativarOrbi}
            />
          )}
          {!hasAiChat && (
            <LinhaPronta
            compacto
              icone={<OrbiParticleSphere size={44} colors={orbiColors ?? undefined} vivid className="rounded-full" />}
              titulo="Botão da Orbi"
              nota="Novidade"
              texto="Atende seus clientes 24h, recomenda produtos e capta contatos."
              acao="Experimentar"
              href="/admin/agent"
            />
          )}
          <LinhaPronta
            compacto
            icone={<OrbiContactDisc size={44} />}
            titulo="Botão de WhatsApp"
            texto="Abre a conversa direto, com sua mensagem pronta."
            acao="Adicionar"
            onClick={novoBoxWhatsapp}
          />
          <LinhaPronta
            compacto
            icone={<OrbiGoogleIcon size={44} />}
            titulo="Avaliação no Google"
            texto="O cliente toca e já dá as estrelas."
            acao="Adicionar"
            onClick={novoBoxAvaliacao}
          />
          <LinhaPronta
            compacto
            icone={<span className="text-[20px]" aria-hidden>📚</span>}
            titulo="Botão de materiais"
            texto="Guias, cursos e documentos para baixar, livres ou com contato antes."
            acao={visibleBoxes.some((b) => (b.config as BoxConfig | null)?.action === "materiais") ? "Gerenciar" : "Adicionar"}
            href="/admin/materiais"
          />
          <LinhaPronta
            compacto
            icone={<OrbiMapPin size={30} />}
            titulo="Botão de endereço"
            texto="Sai pronto com Waze e Google Maps."
            acao="Adicionar"
            onClick={novoBoxEndereco}
          />
          </div>
        </div>
      )}
    </div>
  );
}

/** Bloco do editor de box: título e, opcionalmente, uma linha de apoio. */
function Secao({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-[#ECEAE3] p-4 [&_button.border-divider]:border-[#CFCDC5] [&_button.border-divider]:bg-white [&_input]:border-[#CFCDC5] [&_input]:bg-white [&_select]:border-[#CFCDC5] [&_select]:bg-white [&_textarea]:border-[#CFCDC5] [&_textarea]:bg-white">
      <h4 className="text-[15px] font-semibold text-on-background">{titulo}</h4>
      {dica && <p className="mt-0.5 text-[12px] text-text-tertiary">{dica}</p>}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[12.5px] font-medium text-text-secondary">{children}</p>;
}

/** Cor, ícone e (só pra blocos personalizados) subtítulo + destino. */
function BoxEditor({
  initial,
  isCustom,
  brandColors,
  onSave,
  onDelete,
  liveOnly,
  boxType,
  logoUrl,
  logoGallery,
  onNewLogo,
  onGalleryChange,
  businessId,
  orbiColors,
}: {
  initial: BoxConfig;
  isCustom: boolean;
  brandColors: BrandColor[];
  onSave: (cfg: BoxConfig) => void;
  onDelete?: () => void;
  liveOnly?: boolean;
  /** Tipo do box, pra mostrar o destino dos botões nativos (o do catálogo, por exemplo). */
  boxType?: string;
  logoUrl?: string | null;
  logoGallery?: string[];
  onNewLogo?: (url: string) => void;
  onGalleryChange?: (next: string[]) => void;
  businessId: string;
  orbiColors?: string[] | null;
}) {
  const [cfg, setCfg] = useState<BoxConfig>(initial);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [iconesAbertos, setIconesAbertos] = useState(false);
  const [novoIconeAberto, setNovoIconeAberto] = useState(false);
  const [editandoLogos, setEditandoLogos] = useState(false);
  const [trocandoLogo, setTrocandoLogo] = useState<string | null>(null);
  const color = cfg.color || "#111318";
  const animated = isAnimatedIcon(cfg.icon);
  // Ações que vêm prontas do atalho de criação e não se troca por outra:
  // o box existe justamente pra fazer isso.
  const acaoFixa = cfg.action === "cupom" || cfg.action === "endereco" || cfg.action === "avaliar" || cfg.action === "gift" || cfg.action === "cardapio" || cfg.action === "materiais" || cfg.action === "delivery";
  const destinoNativo = !isCustom && boxType === "product" ? { titulo: "Abre o catálogo", texto: "Todos os itens da sua vitrine, por categoria, com busca.", href: "/admin/vitrine", link: "Editar o catálogo →" } : null;

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
    setIconesAbertos(false);
  }

  // Prévia do ícone escolhido, pra linha "Ícone" mostrar o que está valendo.
  const previaIcone = (() => {
    const ic = cfg.icon ?? "";
    if (ic === "__orb__") return <OrbiParticleSphere size={32} colors={orbiColors ?? undefined} />;
    if (ic === "__orbcheck__") return <OrbiParticleSphere size={32} variant="check" colors={orbiColors ?? undefined} />;
    if (ic === "__orbwa__" || ic === "__wadisc__") return <OrbiContactDisc size={32} />;
    if (ic === "__google__") return <OrbiGoogleIcon size={32} />;
    if (ic === "__pin__") return <OrbiMapPin size={22} />;
    if (EMOJI_STICKERS[ic]) return EMOJI_STICKERS[ic](30);
    if (ehIconeLinha(ic)) return <IconeLinha chave={ic} size={22} />;
    if (ic === "__logo__" && (cfg.logo_url ?? logoUrl)) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={(cfg.logo_url ?? logoUrl) as string} alt="" className="h-full w-full object-cover" />;
    }
    return <span className="text-[16px]">{ic && !ic.startsWith("__") ? ic : "＋"}</span>;
  })();

  return (
    <div className="mt-4 flex flex-col gap-5">
      {destinoNativo && (
        <Secao titulo="Ao tocar">
          <div className="rounded-2xl bg-surface-soft px-4 py-3">
            <p className="text-[14px] font-medium">{destinoNativo.titulo}</p>
            <p className="mt-1 text-[12.5px] leading-snug text-text-secondary">{destinoNativo.texto}</p>
            <Link href={destinoNativo.href} className="mt-2 inline-block text-[12.5px] font-medium underline underline-offset-2">{destinoNativo.link}</Link>
          </div>
        </Secao>
      )}
      {isCustom && (
        <Secao titulo="Ao tocar">
          {/* Boxes de cupom, endereço e avaliação já nascem com a ação
              definida, então oferecer as quatro opções só confundia: nenhuma
              ficava marcada e escolher qualquer uma quebrava o box. Nesses
              casos a gente só diz o que ele faz. */}
          {acaoFixa ? (
            <div className="rounded-2xl bg-surface-soft px-4 py-3">
              <p className="text-[14px] font-medium">{ACAO_EXPLICA[cfg.action!]?.titulo ?? ACTION_LABEL[cfg.action!]}</p>
              {ACAO_EXPLICA[cfg.action!] && (
                <p className="mt-1 text-[12.5px] leading-snug text-text-secondary">{ACAO_EXPLICA[cfg.action!]!.texto}</p>
              )}
              {ACAO_EXPLICA[cfg.action!]?.href && (
                <Link href={ACAO_EXPLICA[cfg.action!]!.href!} className="mt-2 inline-block text-[12.5px] font-medium underline underline-offset-2">
                  {ACAO_EXPLICA[cfg.action!]!.link}
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(["vitrine", "zara", "whatsapp", "link"] as (keyof typeof ACTION_LABEL)[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { update({ action: a }); if (!liveOnly) onSave({ ...cfg, action: a }); }}
                    className={`cursor-pointer rounded-full px-3.5 py-2 text-[13px] font-medium ${cfg.action === a ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
                  >
                    {ACTION_LABEL[a]}
                  </button>
                ))}
              </div>
            </>
          )}

          {(cfg.action === "link" || cfg.action === "whatsapp") && (
            <input
              value={cfg.url ?? ""}
              onChange={(e) => update({ url: e.target.value })}
              onBlur={() => !liveOnly && onSave(cfg)}
              placeholder={cfg.action === "whatsapp" ? "https://wa.me/55... (vazio usa o WhatsApp de Configurações)" : "https://..."}
              className="rounded-2xl border border-divider px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
            />
          )}
          {cfg.action === "link" && redeDoLink(cfg.url) && (
            <p className="flex items-center gap-2 text-[12px] text-text-tertiary">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-divider text-on-background">
                <IconeRede rede={redeDoLink(cfg.url)!} size={13} />
              </span>
              Link de {nomeDaRede(redeDoLink(cfg.url)!)}: aparece como bolinha abaixo dos botões, junto com as outras redes.
            </p>
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
                    <li>3. Cole aqui, o cliente cai no seu perfil do Google e avalia por lá.</li>
                  </ol>
                  <p className="mt-1">Ainda não tem o negócio no Google? Cadastre grátis em <span className="font-medium">google.com/business</span>, leva 5 minutos e é essencial pra aparecer nas buscas.</p>
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
                placeholder="Rua, número, bairro, cidade"
                className="rounded-2xl border border-divider px-4 py-2.5 text-[13px] outline-none focus:border-on-background"
              />
              <p className="text-[12px] leading-relaxed text-text-tertiary">
                O visitante vê esse endereço com um botão pra abrir no Waze e outro no Google Maps.
              </p>
            </div>
          )}
        </Secao>
      )}

      <Secao titulo="Visual">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setColorModalOpen(true)}
            className="flex min-h-[52px] w-full items-center justify-between rounded-full border border-divider px-4"
          >
            <span className="text-[14px] font-medium">Cor</span>
            <span className="swatch-metal h-8 w-8 rounded-full" style={{ "--swatch-color": color } as CSSProperties} />
          </button>
          <button
            type="button"
            onClick={() => setIconesAbertos((v) => !v)}
            aria-expanded={iconesAbertos}
            className="flex min-h-[52px] w-full items-center justify-between rounded-full border border-divider px-4"
          >
            <span className="text-[14px] font-medium">Ícone</span>
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-soft">{previaIcone}</span>
              <span className="text-[12px] text-text-tertiary">{iconesAbertos ? "Fechar" : "Trocar"}</span>
            </span>
          </button>
          {animated && <p className="px-2 text-[12px] leading-snug text-text-tertiary">Esse ícone já tem cor e movimento próprios. A cor escolhida acima pinta o botão quando ele vai para o Destaque.</p>}
        </div>

        {iconesAbertos && (
          <div className="acao-entra flex flex-col gap-3 rounded-2xl border border-divider p-3">
      <Sub>Básicos</Sub>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => pickIcon("__wadisc__")}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 ${cfg.icon === "__wadisc__" || cfg.icon === "__orbwa__" ? "border-on-background" : "border-divider"}`}
                >
                  <span className="h-8 w-8 overflow-hidden rounded-full"><OrbiContactDisc size={32} /></span>
                  <span className="text-[13px] font-medium">Contato</span>
                </button>
                <button
                  onClick={() => pickIcon("__google__")}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 ${cfg.icon === "__google__" ? "border-on-background" : "border-divider"}`}
                >
                  <span className="h-8 w-8 overflow-hidden rounded-full"><OrbiGoogleIcon size={32} /></span>
                  <span className="text-[13px] font-medium">Google</span>
                </button>
                <button
                  onClick={() => pickIcon("__pin__")}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 ${cfg.icon === "__pin__" ? "border-on-background" : "border-divider"}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full"><OrbiMapPin size={22} /></span>
                  <span className="text-[13px] font-medium">Localização</span>
                </button>
              </div>
                <Sub>Animados</Sub>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EMOJI_STICKERS).map(([key, render]) => (
                  <button
                    key={key}
                    onClick={() => pickIcon(key)}
                    aria-label={key.replace(/__/g, "")}
                    className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 ${cfg.icon === key ? "border-on-background" : "border-transparent"}`}
                  >
                    {render(38)}
                  </button>
                ))}
              </div>
        
              {(() => {
                const gallery = Array.from(new Set([...(logoUrl ? [logoUrl] : []), ...(logoGallery ?? [])]));
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <Sub>Logo ou ícone da marca</Sub>
                      {gallery.length > 0 && onGalleryChange && (
                        <button type="button" onClick={() => { setEditandoLogos((v) => !v); setTrocandoLogo(null); }} className="min-h-[32px] rounded-full px-3 text-[12.5px] font-medium text-text-secondary active:opacity-60">
                          {editandoLogos ? "Pronto" : "Editar"}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {gallery.map((url) => (
                        <div key={url} className="relative">
                          <button
                            onClick={() => {
                              if (editandoLogos) { setTrocandoLogo(trocandoLogo === url ? null : url); setNovoIconeAberto(false); return; }
                              update({ icon: "__logo__", logo_url: url, logo_ajuste: undefined }); if (!liveOnly) onSave({ ...cfg, icon: "__logo__", logo_url: url, logo_ajuste: undefined });
                            }}
                            aria-label={editandoLogos ? "Trocar a imagem deste logo" : "Usar este logo"}
                            className={`h-11 w-11 overflow-hidden rounded-full border-2 ${trocandoLogo === url ? "border-on-background" : cfg.icon === "__logo__" && (cfg.logo_url ?? logoUrl) === url && !editandoLogos ? "border-on-background" : "border-transparent"}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </button>
                          {editandoLogos && onGalleryChange && url !== logoUrl && (
                            <button
                              type="button"
                              aria-label="Excluir este logo da lista"
                              onClick={() => { if (window.confirm("Excluir este logo da lista? Os botões que já usam ele continuam como estão.")) { setTrocandoLogo(null); onGalleryChange((logoGallery ?? []).filter((u) => u !== url)); } }}
                              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[12px] leading-none text-white shadow-sm active:scale-90"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setNovoIconeAberto((v) => !v)}
                        aria-expanded={novoIconeAberto}
                        aria-label="Cadastrar ícone da marca ou logo"
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed text-[20px] ${novoIconeAberto ? "border-on-background text-on-background" : "border-divider text-text-tertiary"}`}
                      >
                        +
                      </button>
                    </div>
                    {gallery.length === 0 && !novoIconeAberto && (
                      <p className="text-[12px] text-text-secondary">Cadastre o logo ou os ícones da sua marca pra usar nos botões.</p>
                    )}
                    {editandoLogos && trocandoLogo && onGalleryChange && (
                      <div className="rounded-2xl border border-divider p-3">
                        <p className="mb-2 text-[12px] text-text-secondary">Envie a nova imagem para trocar este logo na lista.</p>
                        <ImageUpload
                          value={null}
                          businessId={businessId}
                          lockedRatio="quadrado"
                          promptKind="avatar"
                          onChange={(novaUrl) => {
                            if (!novaUrl || !trocandoLogo) return;
                            const antiga = trocandoLogo;
                            onGalleryChange((logoGallery ?? []).map((u) => (u === antiga ? novaUrl : u)));
                            if (cfg.logo_url === antiga) { update({ icon: "__logo__", logo_url: novaUrl }); if (!liveOnly) onSave({ ...cfg, icon: "__logo__", logo_url: novaUrl }); }
                            setTrocandoLogo(null);
                          }}
                        />
                      </div>
                    )}
                    {novoIconeAberto && (
                      <div className="rounded-2xl border border-divider p-3">
                        <p className="mb-2 text-[12px] text-text-secondary">Envie um ícone da marca ou o logo. Ele fica salvo aqui e aparece pra escolher em todos os botões.</p>
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
                            setNovoIconeAberto(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {cfg.icon === "__logo__" && (cfg.logo_url ?? logoUrl) && (
                <AjusteLogo
                  key={cfg.logo_url ?? logoUrl ?? ""}
                  src={(cfg.logo_url ?? logoUrl) as string}
                  inicial={cfg.logo_ajuste ?? null}
                  onCommit={(a) => { update({ logo_ajuste: a ?? undefined }); if (!liveOnly) onSave({ ...cfg, logo_ajuste: a ?? undefined }); }}
                />
              )}
        
                <Sub>Linhas minimalistas</Sub>
              <div className="flex flex-wrap gap-1.5">
                {ICONES_LINHA.map((ic) => (
                  <button
                    key={ic.chave}
                    type="button"
                    onClick={() => pickIcon(ic.chave)}
                    aria-label={ic.rotulo}
                    title={ic.rotulo}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-on-background ${cfg.icon === ic.chave ? "border-on-background bg-surface-soft" : "border-divider"}`}
                  >
                    <IconeLinha chave={ic.chave} size={20} />
                  </button>
                ))}
              </div>
                <Sub>Emojis</Sub>
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
          </div>
        )}

        <details className="group rounded-2xl bg-surface-soft">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-4 text-[13.5px] font-medium">
            <span>Tamanho do botão</span>
            <span className="text-[12px] font-normal text-text-tertiary">{(cfg.layout ?? "auto") === "auto" ? "Automático" : cfg.layout === "medio" ? "Metade" : "Linha toda"}</span>
          </summary>
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {([
                { v: "auto", t: "Automático" },
                { v: "medio", t: "Metade" },
                { v: "largo", t: "Linha toda" },
              ] as const).map(({ v, t }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { update({ layout: v }); if (!liveOnly) onSave({ ...cfg, layout: v }); }}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${(cfg.layout ?? "auto") === v ? "bg-button-primary text-white" : "bg-surface-white text-text-secondary"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-text-tertiary">No automático, a Orbi escolhe o melhor tamanho para não sobrar espaço vazio.</p>
          </div>
        </details>
      </Secao>

      {onDelete && (
        <button onClick={onDelete} className="self-start border-t border-divider pt-4 text-[12.5px] font-medium text-red-600">
          Excluir este botão
        </button>
      )}


      {colorModalOpen && (
        <ColorPickerModal current={color} brandColors={brandColors} onSelect={pickColor} onClose={() => setColorModalOpen(false)} />
      )}
    </div>
  );
}

/** Paleta completa, as mesmas 5 da Vitrine, mais a Marca quando existe.
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

/** Linha de botão pronto: mesmo formato para todos (ícone, título, uma linha de
 * texto e uma ação à direita). Só o recomendado ganha fundo diferente. */
function LinhaPronta({
  icone,
  titulo,
  nota,
  texto,
  acao,
  ativo,
  destaque,
  compacto,
  href,
  onClick,
}: {
  icone: ReactNode;
  titulo: string;
  nota?: string;
  texto: string;
  acao?: string;
  ativo?: boolean;
  destaque?: boolean;
  /** Quadradinho para grade de 2 colunas: ícone, nome e ação, sem texto. */
  compacto?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  if (compacto) {
    const tile = (
      <>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-soft">{icone}</span>
        <span className="block min-h-[2.5em] text-[14.5px] font-medium leading-tight">{titulo}</span>
        <span className={`mt-auto inline-flex min-h-[32px] items-center rounded-full px-3.5 text-[12.5px] font-medium ${ativo ? "bg-[#E4F7EA] text-[#1F7A45]" : "border border-divider text-on-background"}`}>{ativo ? "✓ Ativo" : acao}</span>
      </>
    );
    const cls = "flex h-full w-full flex-col items-start gap-2.5 rounded-[22px] bg-surface-white p-3.5 text-left ring-1 ring-black/[0.06] active:scale-[0.98]";
    if (href) return <Link href={href} title={texto} className={cls}>{tile}</Link>;
    if (onClick) return <button type="button" onClick={onClick} title={texto} className={cls}>{tile}</button>;
    return <div title={texto} className={cls}>{tile}</div>;
  }
  const miolo = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-soft">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-medium">{titulo}</span>
          {nota && <span className="shrink-0 text-[11.5px] text-text-secondary">{nota}</span>}
        </span>
        {!ativo && <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-text-secondary">{texto}</span>}
      </span>
      {ativo ? (
        <span className="shrink-0 rounded-full bg-[#E4F7EA] px-2.5 py-1 text-[12px] font-medium text-[#1F7A45]">✓ Ativo</span>
      ) : acao ? (
        <span className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${destaque ? "bg-on-background text-white" : "border border-divider text-on-background"}`}>{acao}</span>
      ) : null}
    </>
  );
  const base = `flex w-full items-center gap-3 rounded-[22px] ${ativo ? "p-2.5" : "p-3.5"} text-left ${destaque ? "bg-gradient-to-br from-[#F6FDE6] to-[#E4F8F3] ring-1 ring-black/[0.06]" : "bg-surface-white ring-1 ring-black/[0.06]"}`;
  if (href) return <Link href={href} className={base}>{miolo}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={base}>{miolo}</button>;
  return <div className={base}>{miolo}</div>;
}


/** Ajuste da logo dentro da bolinha: arraste a prévia para mover e use os controles para o tamanho. */
function AjusteLogo({ src, inicial, onCommit }: { src: string; inicial: LogoAjuste | null; onCommit: (a: LogoAjuste | null) => void }) {
  const [a, setA] = useState<LogoAjuste>(inicial ? limitarLogo(inicial) : { z: 1, x: 0, y: 0 });
  const caixa = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mexido = a.z !== 1 || a.x !== 0 || a.y !== 0;

  function aplicar(prox: LogoAjuste, salvar: boolean) {
    const l = limitarLogo(prox);
    setA(l);
    if (timer.current) clearTimeout(timer.current);
    if (salvar) timer.current = setTimeout(() => onCommit(l.z === 1 && l.x === 0 && l.y === 0 ? null : l), salvar ? 350 : 0);
  }
  function baixo(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrasto.current = { px: e.clientX, py: e.clientY, x: a.x, y: a.y };
  }
  function move(e: React.PointerEvent) {
    const d = arrasto.current;
    const w = caixa.current?.clientWidth;
    if (!d || !w) return;
    // A logo ocupa 70% da bolinha: o deslocamento é em % do tamanho dela.
    aplicar({ z: a.z, x: d.x + ((e.clientX - d.px) / (w * 0.7)) * 100, y: d.y + ((e.clientY - d.py) / (w * 0.7)) * 100 }, false);
  }
  function solta() {
    if (!arrasto.current) return;
    arrasto.current = null;
    aplicar(a, true);
  }
  const faixa = "h-8 w-full accent-[#111318]";
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-surface-white p-3 ring-1 ring-black/[0.06]">
      <p className="text-[13px] font-medium">Tamanho e posição na bolinha</p>
      <div className="flex items-center gap-4">
        <div
          ref={caixa}
          onPointerDown={baixo}
          onPointerMove={move}
          onPointerUp={solta}
          onPointerCancel={solta}
          aria-label="Arraste para mover a logo"
          className="relative h-[116px] w-[116px] shrink-0 cursor-grab touch-none select-none overflow-hidden rounded-full ring-1 ring-black/[0.06] active:cursor-grabbing"
        >
          <LogoBolinha src={src} ajuste={a} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-[12px] text-text-secondary">Tamanho
            <input type="range" min={LOGO_ZOOM_MIN * 100} max={LOGO_ZOOM_MAX * 100} step={1} value={Math.round(a.z * 100)} onChange={(e) => aplicar({ ...a, z: Number(e.target.value) / 100 }, true)} aria-label="Tamanho da logo" className={faixa} />
          </label>
          <label className="text-[12px] text-text-secondary">Esquerda ou direita
            <input type="range" min={-LOGO_DESLOC_MAX} max={LOGO_DESLOC_MAX} step={1} value={Math.round(a.x)} onChange={(e) => aplicar({ ...a, x: Number(e.target.value) }, true)} aria-label="Posição horizontal da logo" className={faixa} />
          </label>
          <label className="text-[12px] text-text-secondary">Cima ou baixo
            <input type="range" min={-LOGO_DESLOC_MAX} max={LOGO_DESLOC_MAX} step={1} value={Math.round(a.y)} onChange={(e) => aplicar({ ...a, y: Number(e.target.value) }, true)} aria-label="Posição vertical da logo" className={faixa} />
          </label>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-text-tertiary">Arraste a bolinha ou use os controles.</p>
        {mexido && <button type="button" onClick={() => aplicar({ z: 1, x: 0, y: 0 }, true)} className="min-h-[36px] shrink-0 rounded-full bg-surface-soft px-3.5 text-[12.5px] font-medium text-text-secondary">Restaurar</button>}
      </div>
    </div>
  );
}
