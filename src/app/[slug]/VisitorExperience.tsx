"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { OrbiFloatingButton } from "./OrbiFloatingButton";
import { GiftFlow } from "./GiftFlow";
import { CuradoriaOrbi } from "./CuradoriaOrbi";
import { OrbiParticleSphere } from "@/components/orbi/OrbiParticleSphere";
import { LeadCapture } from "@/components/mobile/LeadCapture";
import { OrbiContactDisc } from "@/components/orbi/OrbiContactDisc";
import { OrbiMapPin } from "@/components/orbi/OrbiMapPin";
import { OrbiAvatar } from "@/components/orbi/OrbiAvatar";
import { COVER_RATIO_BY_SIZE, formatPrice, groupByCategory, sizeOf, youtubeId, instagramReelId } from "@/lib/showcase";
import { BOX_DEFAULT_DESCRIPTION } from "@/lib/boxDefaults";
import { heroBackground } from "@/lib/heroStyle";
import { desligarRastreio, trackClick, whatsappLink } from "@/lib/track";
import { OrbiInsightCard, OrbiInsightHeader, OrbiInsightMessage, OrbiSparkleMini, orbiInsightCtaClass } from "@/components/orbi/OrbiInsightCard";
import { COR_DA_REDE, FUNDO_DA_REDE, IconeRede, nomeDaRede, redeDoLink, type Rede } from "@/lib/redesSociais";
import { homeCardShellClass, homeCardShellStyle, HomeOptionCardContent } from "@/components/orbi/HomeOptionCard";
import { VoucherShareButton } from "@/components/mobile/VoucherShareButton";
import { VoucherQRCode } from "@/components/mobile/VoucherQRCode";
import { VoucherLines } from "@/components/mobile/VoucherDecor";
import { voucherGradient, voucherTheme } from "@/lib/voucherThemes";
import { OrbitHome } from "./OrbitHome";
import { CartaoItem } from "./CartaoItem";
import { AdicionarBox, type NovoBox } from "./AdicionarBox";
import { HomeVitrine, type BolinhaVitrine, type FormatoItens, type BotaoPrincipal } from "./HomeVitrine";
import { LogoEditor } from "./LogoEditor";
import { BotaoSalvar, conferirSalvo } from "@/components/ui/AvisoSalvar";
import { ICON_LIBRARY, isAnimatedIcon } from "@/lib/showcase";
import { HomeIcon } from "@/components/orbi/HomeOptionCard";
import { PaletaPanel } from "./PaletaPanel";
import { NOBRES, coresDaMarca } from "@/lib/paletasNobres";
import { guardarModoHome, guardarModoVitrine, useModoHomeDoVisitante, useModoVitrine, type ModoHome } from "@/lib/modoHome";
import { VitrineCoverflow, type CoverflowItem } from "./VitrineCoverflow";
import { descontoLongo, descontoGrande } from "@/lib/voucherDesconto";

type Business = {
  id: string;
  name: string;
  slug: string;
  vitrine_categories?: string[] | null;
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
  vitrine_lead_top?: boolean | null;
  home_mode?: string | null;
  share_description?: string | null;
};

// Uma frase curta que diz o que é o negócio, pra quem chega sem saber.
// Usa a descrição de compartilhamento ou a primeira frase do "sobre".
/** Texto guardado como só espaços = o dono apagou de propósito (não usar o texto padrão). */
function textoApagado(v: string | null | undefined): boolean {
  return typeof v === "string" && v.length > 0 && v.trim() === "";
}

function fraseDoNegocio(b: Business): string | null {
  // Dono apagou a frase de propósito (guardamos um espaço): não mostra nada.
  if (textoApagado(b.share_description)) return null;
  const fonte = b.share_description?.trim() || b.about_business?.trim() || "";
  if (!fonte) return null;
  const primeira = fonte.split(/(?<=[.!?])\s|\n/)[0].trim();
  const texto = primeira.length >= 20 ? primeira : fonte;
  return texto.length > 110 ? `${texto.slice(0, 110).replace(/\s+\S*$/, "")}…` : texto;
}

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
type CustomConfig = { label?: string; subtitle?: string; icon?: string; color?: string; action?: "vitrine" | "zara" | "whatsapp" | "link" | "avaliar" | "endereco" | "cupom" | "gift"; url?: string; logo_url?: string; layout?: "auto" | "largo" | "medio"; icone?: boolean; bolinha?: "cor" | "linha"; formatoItens?: FormatoItens; botaoPrincipal?: BotaoPrincipal };

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
  giftEnabled: giftLigado = false,
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
  giftEnabled?: boolean;
  suggestedQuestions?: string[];
}) {
  const supabase = createClient();
  // Gift sem WhatsApp vira beco sem saída (o pagamento é combinado por lá),
  // então só aparece pro visitante quando o negócio tem número.
  const giftEnabled = giftLigado && !!business.contact_whatsapp;
  const searchParams = useSearchParams();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Cópia local editável dos boxes, o dono pode reordenar e renomear direto
  // na Home (sem precisar ir pro painel), e isso atualiza tanto a tela na
  // hora quanto o banco.
  const [boxList, setBoxList] = useState<BoxRow[]>(boxes);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  // Box com a paletinha de cor aberta na tela inicial.
  const [colorPickerBox, setColorPickerBox] = useState<string | null>(null);
  const [iconeBox, setIconeBox] = useState<string | null>(null);
  const [textosAberto, setTextosAberto] = useState(false);
  // Menu recolhido de opções do card (cor, formato, ordem), aberto pelo lapinho.
  const [menuBox, setMenuBox] = useState<string | null>(null);
  // Paleta da página inteira (prévia ao vivo) e grade completa de cores no seletor do card.
  const [paletaAberta, setPaletaAberta] = useState(false);
  const [originaisPaleta, setOriginaisPaleta] = useState<Record<string, string | null>>({});
  const [todasCores, setTodasCores] = useState(false);
  const [enderecoIconeAberto, setEnderecoIconeAberto] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  // "Modo visitante", o dono liga isso pra ver a Home exatamente como o
  // visitante vê, sem os controles de edição no meio, sem precisar sair da
  // página nem abrir uma aba anônima.
  // ?preview=1 já entra em modo visitante. É a prévia embutida no painel:
  // além de esconder os controles de edição, esconde o "voltar a editar",
  // porque quem controla a saída é o modal que abriu a prévia.
  const previewTravado = searchParams.get("preview") === "1";
  const [previewMode, setPreviewMode] = useState(previewTravado);
  const showOwnerControls = isOwner && !previewMode;
  // Pergunta digitada na tela cheia da CuradoriaOrbi, passa pro campo do
  // chat real já preenchida, pronta pra mandar, em vez de perder o que a
  // pessoa escreveu.
  const [orbiPrefill, setOrbiPrefill] = useState<string | undefined>(undefined);
  // Box de endereço expande direto na Home (sem navegar pra outra tela) , 
  // guarda qual box está expandido agora (ou null se nenhum).
  const [expandedBox, setExpandedBox] = useState<string | null>(null);
  // Logo editável na própria página (lapinho no modo de edição).
  const [logoAtual, setLogoAtual] = useState<string | null>(business.logo_url);
  const [editandoLogo, setEditandoLogo] = useState(false);
  // Modo Órbita x Modo Grade. O dono define o padrão da página; o visitante
  // pode trocar e a escolha dele vale só no aparelho dele.
  const [modoPadrao, setModoPadrao] = useState<ModoHome>(business.home_mode === "orbita" ? "orbita" : "grade");
  const escolhaVisitante = useModoHomeDoVisitante(business.slug);
  const modo: ModoHome = escolhaVisitante ?? modoPadrao;
  // Estilo da Home em grade: "classica" (cards) ou "vitrine" (bolinhas + fotos).
  // Fica guardado em home_mode ("vitrine"); ?estilo=vitrine|classica na URL
  // força um dos dois só pra testar, sem salvar nada.
  const estiloUrl = searchParams.get("estilo");
  const [vitrineSalva, setVitrineSalva] = useState(business.home_mode === "vitrine");
  const estiloVitrine = estiloUrl === "vitrine" ? true : estiloUrl === "classica" ? false : vitrineSalva;
  async function tornarPadrao(novo: ModoHome) {
    const valor = novo === "grade" && vitrineSalva ? "vitrine" : novo;
    setModoPadrao(novo);
    setVitrineSalva(valor === "vitrine");
    conferirSalvo(await supabase.from("businesses").update({ home_mode: valor }).eq("id", business.id));
  }

  useEffect(() => {
    // Dono ou prévia do painel: não abre sessão nem registra cliques.
    if (isOwner || new URLSearchParams(window.location.search).get("preview") === "1") {
      desligarRastreio();
      return;
    }
    // Detecta origem e dispositivo do visitante, antes era fixo "direct/web",
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
  // com ?chat=1, abre o chat direto, sem passar pela tela de escolha.
  // ?tab=conhecer abre a página "Sobre", ?tab=vitrine abre o catálogo.
  // ?preview=1 esconde os controles de edição mesmo pro dono: é a prévia
  // "ver como visitante", que precisa mostrar a página crua.
  useEffect(() => {
    const chat = searchParams.get("chat");
    const tab = searchParams.get("tab");
    const msg = searchParams.get("msg");
    if (chat === "1" && hasAiChat) chooseIntent("duvida", msg || undefined);
    else if (tab === "conhecer") chooseIntent("conhecer");
    else if (tab === "vitrine") chooseIntent("comprar");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Só aparecem os caminhos que o dono deixou ativos em Smart Boxes , 
  // mistura os fixos com os personalizados, na ordem que o dono escolheu.
  type Option = { key: string; interno: boolean; icon: string; boxLogo?: string | null; t: string; d: string; color?: string; ai?: boolean; stars?: boolean; cupom?: boolean; address?: string; layoutOverride?: "largo" | "medio"; rede?: Rede | null; atalho?: "whatsapp" | "site" | "endereco" | null; comoIcone?: boolean; acao?: string; bolinha?: "cor" | "linha"; formatoItens?: FormatoItens; botaoPrincipal?: BotaoPrincipal; onClick: () => void };
  const todasOpcoes: Option[] = boxList
    .filter((b) => b.is_active && (BOX_TO_OPTION[b.box_type] || b.box_type === "custom"))
    .filter((b) => {
      if (hasAiChat) return true;
      if (b.box_type === "agent") return false;
      const cfg = (b.config ?? {}) as CustomConfig;
      if (b.box_type === "custom" && cfg.action === "zara") return false;
      if (b.box_type === "custom" && cfg.action === "cupom" && !hasVouchers) return false;
      if (b.box_type === "custom" && cfg.action === "gift" && !giftEnabled) return false;
      return true;
    })
    // "Presentear" é um só: se o box fixo de campanha está ativo, um box
    // personalizado de gift (atalho antigo) seria repetido, então sai.
    .filter((b) => {
      const cfg = (b.config ?? {}) as CustomConfig;
      return !(b.box_type === "custom" && cfg.action === "gift" && boxList.some((x) => x.box_type === "campaign" && x.is_active));
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
          } else if (cfg.action === "gift") {
            chooseIntent("presentear");
          } else if (cfg.url) {
            trackClick({ businessId: business.id, kind: "link", sessionId, targetUrl: cfg.url });
            window.open(/^https?:\/\//i.test(cfg.url) ? cfg.url : `https://${cfg.url}`, "_blank");
          }
        };
        return { key: b.id, interno: cfg.action === "vitrine" || cfg.action === "zara" || cfg.action === "cupom" || cfg.action === "gift", icon: cfg.icon || "◆", boxLogo: cfg.logo_url ?? null, t: cfg.action === "cupom" ? "Vouchers" : label, d: cfg.action === "cupom" ? "Resgate agora e aproveite" : (cfg.subtitle || ""), color: cfg.color, stars: cfg.action === "avaliar", cupom: cfg.action === "cupom", address: cfg.action === "endereco" ? (cfg.url?.trim() || business.address || undefined) : undefined, layoutOverride: cfg.layout === "auto" ? undefined : cfg.layout, rede: cfg.action === "link" || !cfg.action ? redeDoLink(cfg.url) : null, atalho: cfg.action === "whatsapp" ? "whatsapp" : cfg.action === "endereco" ? "endereco" : ((cfg.action === "link" || !cfg.action) && !redeDoLink(cfg.url) && cfg.url ? "site" : null), comoIcone: cfg.icone !== undefined ? !!cfg.icone : ((cfg.action === "link" || !cfg.action) && !redeDoLink(cfg.url) && !!cfg.url), acao: cfg.action ?? "link", bolinha: cfg.bolinha, formatoItens: cfg.formatoItens, botaoPrincipal: cfg.botaoPrincipal, onClick };
      }
      const base = BOX_TO_OPTION[b.box_type];
      // "Sobre" sugere o nome da marca quando o dono não personalizou, igual ao editor.
      const fallbackLabel = b.box_type === "content" ? `Sobre a ${business.name}` : base.t;
      return { key: b.id, interno: true, icon: cfg.icon || base.icon, boxLogo: cfg.logo_url ?? null, t: cfg.label || fallbackLabel, d: cfg.subtitle?.trim() || (b.box_type === "campaign" && giftEnabled ? "Monte um vale-presente." : base.d), color: cfg.color, ai: base.ai, layoutOverride: cfg.layout === "auto" ? undefined : cfg.layout, acao: base.k, formatoItens: cfg.formatoItens, botaoPrincipal: cfg.botaoPrincipal, onClick: () => chooseIntent(base.k) };
    })
    .filter((o): o is Option => o !== null);
  // Redes sociais saem da grade de boxes e viram uma fileira de bolinhas
  // logo abaixo, na ordem em que estão nos Smart Boxes.
  // WhatsApp, site e endereço podem virar ícone na fileira de baixo (o dono escolhe).
  const options = todasOpcoes.filter((o) => !o.rede && !(o.comoIcone && o.atalho));
  const atalhosTodos = todasOpcoes.filter((o) => !o.rede && o.comoIcone && !!o.atalho);
  // O site vira ícone na mesma fileira das redes sociais; WhatsApp e endereço ficam em "Fale com a gente".
  const atalhosSite = atalhosTodos.filter((o) => o.atalho === "site");
  const atalhos = atalhosTodos.filter((o) => o.atalho !== "site");
  const redes = todasOpcoes.filter((o) => o.rede);

  // Cada tela interna (catálogo, chat, vouchers, sobre) entra no histórico do
  // navegador. Assim o "voltar" do celular volta pra tela inicial em vez de
  // sair da página, que é o que o visitante espera.
  const empilhou = useRef(false);
  useEffect(() => {
    const aoVoltar = () => {
      empilhou.current = false;
      setIntent(null);
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);
  function voltarAoInicio() {
    if (empilhou.current) {
      window.history.back();
    } else {
      setIntent(null);
    }
  }

  async function chooseIntent(value: Intent, prefill?: string) {
    if (value === "duvida" && !hasAiChat) return;
    setOrbiPrefill(prefill);
    setIntent(value);
    if (!empilhou.current) {
      window.history.pushState({ orbiTela: value }, "");
      empilhou.current = true;
    } else {
      window.history.replaceState({ orbiTela: value }, "");
    }
    window.scrollTo({ top: 0 });
    if (sessionId) {
      await supabase.from("visitor_sessions").update({ intent: value }).eq("id", sessionId);
    }
  }

  // Reordenar direto na Home, troca a posição desse box com o vizinho na
  // direção pedida (dentre os que aparecem na tela agora).
  async function moveOption(key: string, dir: -1 | 1) {
    const idx = options.findIndex((o) => o.key === key);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= options.length) return;
    const boxA = boxList.find((b) => b.id === options[idx].key);
    const boxB = boxList.find((b) => b.id === options[swapIdx].key);
    if (!boxA || !boxB) return;
    setBoxList((prev) => prev.map((b) => (b.id === boxA.id ? { ...b, position: boxB.position } : b.id === boxB.id ? { ...b, position: boxA.position } : b)));
    const [r1, r2] = await Promise.all([
      supabase.from("smart_boxes").update({ position: boxB.position }).eq("id", boxA.id),
      supabase.from("smart_boxes").update({ position: boxA.position }).eq("id", boxB.id),
    ]);
    conferirSalvo(r1.error ? r1 : r2);
  }

  // Troca o formato direto na Home, o dono vê o card mudar de tamanho na
  // hora, em vez de escolher às cegas lá no editor de Boxes. Define um valor
  // explícito (não mais "automático") pra esse box.
  async function toggleLayout(key: string, currentlyLargo: boolean) {
    const box = boxList.find((b) => b.id === key);
    if (!box) return;
    const cfg = (box.config ?? {}) as CustomConfig;
    const nextLayout: "largo" | "medio" = currentlyLargo ? "medio" : "largo";
    const nextCfg: CustomConfig = { ...cfg, layout: nextLayout };
    setBoxList((prev) => prev.map((b) => (b.id === key ? { ...b, config: nextCfg } : b)));
    conferirSalvo(await supabase.from("smart_boxes").update({ config: nextCfg }).eq("id", key));
  }

  // Troca a cor do box direto na tela inicial, sem abrir o editor. Salva na
  // hora. cor null volta o card pro branco padrão.
  async function setBoxColor(key: string, cor: string | null) {
    const box = boxList.find((b) => b.id === key);
    if (!box) return;
    const cfg = (box.config ?? {}) as CustomConfig;
    const nextCfg: CustomConfig = { ...cfg, color: cor ?? undefined };
    setBoxList((prev) => prev.map((b) => (b.id === key ? { ...b, config: nextCfg } : b)));
    conferirSalvo(await supabase.from("smart_boxes").update({ config: nextCfg }).eq("id", key));
    setColorPickerBox(null);
  }

  // Troca (ou tira) o ícone do box direto na página.
  async function setBoxIcon(key: string, icone: string) {
    const box = boxList.find((b) => b.id === key);
    if (!box) return;
    const nextCfg: CustomConfig = { ...((box.config ?? {}) as CustomConfig), icon: icone };
    setBoxList((prev) => prev.map((b) => (b.id === key ? { ...b, config: nextCfg } : b)));
    setIconeBox(null);
    conferirSalvo(await supabase.from("smart_boxes").update({ config: nextCfg }).eq("id", key));
  }

  // Vira ícone na fileira de baixo (ou volta a ser card) direto na página.
  async function definirIcone(key: string, icone: boolean) {
    const box = boxList.find((b) => b.id === key);
    if (!box) return;
    const nextCfg: CustomConfig = { ...((box.config ?? {}) as CustomConfig), icone };
    setBoxList((prev) => prev.map((b) => (b.id === key ? { ...b, config: nextCfg } : b)));
    setMenuBox(null);
    setEnderecoIconeAberto(false);
    conferirSalvo(await supabase.from("smart_boxes").update({ config: nextCfg }).eq("id", key));
  }

  // Prévia ao vivo da paleta: pinta os cards só na tela, sem salvar.
  function previaCores(mapa: Record<string, string | null>) {
    setBoxList((prev) => prev.map((b) => {
      if (!(b.id in mapa)) return b;
      const cfg = (b.config ?? {}) as CustomConfig;
      return { ...b, config: { ...cfg, color: mapa[b.id] ?? undefined } };
    }));
  }

  async function aplicarPaleta(mapa: Record<string, string>) {
    const res = await Promise.all(
      Object.entries(mapa).map(([id, cor]) => {
        const box = boxList.find((b) => b.id === id);
        if (!box) return null;
        const cfg = (box.config ?? {}) as CustomConfig;
        return supabase.from("smart_boxes").update({ config: { ...cfg, color: cor } }).eq("id", id);
      }),
    );
    conferirSalvo(res.find((r) => r && r.error) ?? { error: null });
    setBoxList((prev) => prev.map((b) => (b.id in mapa ? { ...b, config: { ...((b.config ?? {}) as CustomConfig), color: mapa[b.id] } } : b)));
  }

  function abrirPaleta() {
    const orig: Record<string, string | null> = {};
    for (const o of options) orig[o.key] = o.color ?? null;
    setOriginaisPaleta(orig);
    setColorPickerBox(null);
    setMenuBox(null);
    setPaletaAberta(true);
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
    conferirSalvo(await supabase.from("smart_boxes").update({ title: trimmed, config: nextCfg }).eq("id", key));
  }

  const frase = fraseDoNegocio(business);
  const [textos, setTextos] = useState<{ nome: string; frase?: string; pergunta: string | null }>({ nome: business.name, frase: textoApagado(business.share_description) ? "" : undefined, pergunta: textoApagado(business.hero_question) ? "" : business.hero_question });
  async function salvarTexto(campo: "nome" | "frase" | "pergunta", valor: string) {
    if (campo === "nome" && !valor.trim()) return;
    setTextos((t) => ({ ...t, [campo]: valor }));
    // Vazio vira um espaço no banco, pra diferenciar "apagou" de "nunca preencheu".
    const guardar = valor.trim() === "" ? " " : valor;
    const coluna = campo === "nome" ? { name: valor } : campo === "frase" ? { share_description: guardar } : { hero_question: guardar };
    conferirSalvo(await supabase.from("businesses").update(coluna).eq("id", business.id));
  }
  // WhatsApp sempre à mão na tela inicial: se o dono tem número mas não ligou
  // um botão de WhatsApp, aparece um atalho discreto embaixo dos botões.
  const temBotaoWhats = boxList.some((b) => b.is_active && b.box_type === "custom" && ((b.config ?? {}) as CustomConfig).action === "whatsapp");
  const whatsAtalho = !temBotaoWhats && business.contact_whatsapp ? whatsappLink(business.contact_whatsapp, `Olá! Vim pelo ${business.name}.`) : null;

  // Home em estilo Vitrine: bolinhas com nome (WhatsApp, endereço, redes, site,
  // voucher), um botão principal e o resto em pílulas discretas.
  const bolinhasVitrine: BolinhaVitrine[] = (() => {
    // Segue a ordem dos Smart Boxes, então reordenar aqui reordena lá também.
    const out: BolinhaVitrine[] = [];
    for (const o of todasOpcoes) {
      const estilo = o.bolinha === "linha" ? "linha" : "cor";
      const base = { key: o.key, estilo, editavel: true } as const;
      if (o.atalho === "whatsapp") out.push({ ...base, rotulo: "WhatsApp", tipo: "whatsapp", onClick: o.onClick });
      else if (o.atalho === "endereco" && o.address) out.push({ ...base, rotulo: "Local", tipo: "endereco", endereco: o.address, onClick: () => trackClick({ businessId: business.id, kind: "link", sessionId }) });
      else if (o.rede) out.push({ ...base, rotulo: o.t || nomeDaRede(o.rede), tipo: "rede", rede: o.rede, onClick: o.onClick });
      else if (o.atalho === "site") out.push({ ...base, rotulo: o.t || "Site", tipo: "site", onClick: o.onClick });
      else if (o.cupom) out.push({ ...base, rotulo: "Vouchers", tipo: "voucher", selo: "oferta", onClick: o.onClick });
    }
    if (!out.some((b) => b.tipo === "whatsapp") && whatsAtalho) {
      out.unshift({ key: "zap", estilo: "cor", editavel: false, rotulo: "WhatsApp", tipo: "whatsapp", onClick: () => { trackClick({ businessId: business.id, kind: "whatsapp", sessionId }); window.open(whatsAtalho, "_blank"); } });
    }
    return out;
  })();
  const [adicionando, setAdicionando] = useState(false);
  async function criarBox(novo: NovoBox): Promise<boolean> {
    const posicao = boxList.reduce((m, b) => Math.max(m, b.position), -1) + 1;
    const { data, error } = await supabase
      .from("smart_boxes")
      .insert({ business_id: business.id, box_type: "custom", title: novo.nome, position: posicao, is_active: true, config: novo.config })
      .select()
      .single();
    if (error || !data) return false;
    setBoxList((prev) => [...prev, data as BoxRow]);
    return true;
  }
  const [categoriaInicial, setCategoriaInicial] = useState<string | null>(null);
  // O formato dos itens fica guardado no box da vitrine (o mesmo do botão principal).
  const boxFormato = todasOpcoes.find((o) => o.acao === "vitrine" || o.acao === "comprar");
  async function guardarNaVitrine(patch: { formatoItens?: FormatoItens; botaoPrincipal?: BotaoPrincipal }) {
    if (!boxFormato) return;
    const box = boxList.find((b) => b.id === boxFormato.key);
    if (!box) return;
    const cfg = { ...((box.config ?? {}) as CustomConfig), ...patch };
    setBoxList((prev) => prev.map((b) => (b.id === box.id ? { ...b, config: cfg } : b)));
    conferirSalvo(await supabase.from("smart_boxes").update({ config: cfg }).eq("id", box.id));
  }
  const escolherFormato = (f: FormatoItens) => guardarNaVitrine({ formatoItens: f });
  async function estiloBolinhas(keys: string[], estilo: "cor" | "linha") {
    setBoxList((prev) => prev.map((b) => (keys.includes(b.id) ? { ...b, config: { ...((b.config ?? {}) as CustomConfig), bolinha: estilo } } : b)));
    const res = await Promise.all(keys.map((id) => {
      const box = boxList.find((b) => b.id === id);
      if (!box) return null;
      return supabase.from("smart_boxes").update({ config: { ...((box.config ?? {}) as CustomConfig), bolinha: estilo } }).eq("id", id);
    }));
    conferirSalvo(res.find((r) => r && r.error) ?? { error: null });
  }
  // Reordena as bolinhas e renumera todos os boxes em sequência. Antes, a troca
  // só trocava o número de dois boxes, e dois boxes com o mesmo número (comum)
  // ficavam sem sair do lugar.
  async function reordenarBolinhas(chaves: string[]) {
    const cheia = [...boxList].sort((a, b) => a.position - b.position);
    const ocupadas = cheia.map((b, i) => (chaves.includes(b.id) ? i : -1)).filter((i) => i >= 0);
    const porId = new Map(cheia.map((b) => [b.id, b]));
    const nova = [...cheia];
    ocupadas.forEach((slot, n) => {
      const b = porId.get(chaves[n]);
      if (b) nova[slot] = b;
    });
    const posicoes = new Map(nova.map((b, i) => [b.id, i]));
    setBoxList((prev) => prev.map((b) => ({ ...b, position: posicoes.get(b.id) ?? b.position })));
    const mudaram = cheia.filter((b) => posicoes.get(b.id) !== b.position);
    const res = await Promise.all(mudaram.map((b) => supabase.from("smart_boxes").update({ position: posicoes.get(b.id) }).eq("id", b.id)));
    conferirSalvo(res.find((r) => r.error) ?? { error: null });
  }
  // Botão principal da Home em Vitrine: Orbi (quando há IA), Vitrine ou WhatsApp.
  const zapBolinha = bolinhasVitrine.find((b) => b.tipo === "whatsapp");
  const vitOpcao = todasOpcoes.find((o) => o.acao === "vitrine" || o.acao === "comprar");
  const temVitrine = !!vitOpcao || content.length > 0;
  const opcoesCta: BotaoPrincipal[] = [...(hasAiChat ? (["orbi"] as const) : []), ...(temVitrine ? (["vitrine"] as const) : []), ...(zapBolinha ? (["whatsapp"] as const) : [])];
  const escolhaCta = boxFormato?.botaoPrincipal;
  const ctaTipo: BotaoPrincipal | null = escolhaCta && opcoesCta.includes(escolhaCta) ? escolhaCta : (opcoesCta[0] ?? null);
  const ctaVitrine: { tipo: BotaoPrincipal; rotulo: string; onClick: () => void } =
    ctaTipo === "orbi"
      ? { tipo: "orbi", rotulo: `Pergunte à ${agentName?.trim() || "Orbi"}`, onClick: () => chooseIntent("duvida") }
      : ctaTipo === "whatsapp"
        ? { tipo: "whatsapp", rotulo: "Falar no WhatsApp", onClick: zapBolinha?.onClick ?? (() => {}) }
        : { tipo: "vitrine", rotulo: vitOpcao?.t || "Ver catálogo", onClick: () => chooseIntent("comprar") };
  const extrasVitrine = todasOpcoes
    .filter((o) => !o.rede && !o.atalho && !o.cupom && o.acao !== "vitrine" && o.acao !== "comprar")
    .filter((o) => !(ctaVitrine.tipo === "orbi" && (o.ai || o.acao === "zara" || o.acao === "duvida")))
    .map((o) => ({ key: o.key, rotulo: o.t, onClick: o.onClick }));

  const heroGradient = Array.isArray(business.hero_gradient) && business.hero_gradient.length >= 2
    ? (business.hero_gradient as string[])
    : ["#B7F34A", "#6EE7D8"];
  const heroStyle = (business as { hero_style?: string }).hero_style || "brilho";
  const heroPrecisaVeu = heroStyle === "cheio" || heroStyle === "meio" || heroStyle === "degrade";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background-main">
      {/* Fundo conforme o estilo escolhido pelo dono. "brilho" é o halo suave
          (padrão); os demais preenchem a tela com cor forte + um véu claro por
          cima pra a Orbi e os textos continuarem legíveis. */}
      {heroStyle === "brilho" ? (
        <div
          className="pointer-events-none absolute -bottom-56 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full opacity-25 blur-[80px]"
          style={{ backgroundImage: `linear-gradient(135deg, ${heroGradient[0]}, ${heroGradient[1]})` }}
        />
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: heroBackground(heroStyle, heroGradient[0], heroGradient[1]) }}
          />
          {heroPrecisaVeu && <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(247,247,244,0.18)" }} />}
        </>
      )}

      {/* O dono, navegando o próprio link, ganha um atalho de volta pro painel
          e um alternador pra ver a página exatamente como o visitante vê,
          sem os controles de edição (lápis, setinhas, formato) no meio , 
          só na tela inicial. Escondido nos overlays (chat, catálogo, sobre)
          porque senão fica borrado atrás do fundo semitransparente deles. */}
      {paletaAberta && (
        <PaletaPanel
          chaves={options.map((o) => o.key)}
          originais={originaisPaleta}
          coresMarca={coresDaMarca(business.brand_colors)}
          logoUrl={logoAtual}
          onPreview={previaCores}
          onApply={aplicarPaleta}
          onClose={() => setPaletaAberta(false)}
        />
      )}
      {editandoLogo && (
        <LogoEditor
          businessId={business.id}
          logoUrl={logoAtual}
          onClose={() => setEditandoLogo(false)}
          onSaved={(url) => { setLogoAtual(url); setEditandoLogo(false); }}
        />
      )}
      {isOwner && intent === null && !previewMode && (
        <div className="fixed right-4 top-[60px] z-20"><BotaoSalvar /></div>
      )}
      {iconeBox && showOwnerControls && (() => {
        const alvo = todasOpcoes.find((o) => o.key === iconeBox);
        if (!alvo) return null;
        const especiais = ["__orb__", "__pin__", "__google__", "__money__", "__percent__", "__arrow__", "__heart__", "__gift__", "__happy__", "__dog__", "__leaf__", "__ticket__"];
        return (
          <div className="fixed inset-0 z-[60]">
            <button type="button" aria-label="Fechar" onClick={() => setIconeBox(null)} className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[75vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-surface-white p-5 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between">
                <p className="font-[family-name:var(--font-manrope)] text-[18px] font-medium">Ícone de “{alvo.t}”</p>
                <button type="button" onClick={() => setIconeBox(null)} className="min-h-[40px] px-2 text-[14px] text-text-secondary">Fechar</button>
              </div>
              <button
                type="button"
                onClick={() => setBoxIcon(iconeBox, "__none__")}
                className={`mt-4 flex min-h-[48px] w-full items-center justify-center rounded-full border text-[15px] font-medium ${alvo.icon === "__none__" ? "border-on-background bg-surface-soft" : "border-divider"}`}
              >
                Sem ícone
              </button>
              <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Destaques</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {especiais.map((ic) => (
                  <button key={ic} type="button" onClick={() => setBoxIcon(iconeBox, ic)} className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border ${alvo.icon === ic ? "border-on-background bg-surface-soft" : "border-divider"}`}>
                    <HomeIcon icon={ic} orbiColors={orbiColors} businessLogo={logoAtual} />
                  </button>
                ))}
                {logoAtual && (
                  <button type="button" onClick={() => setBoxIcon(iconeBox, "__logo__")} className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border ${alvo.icon === "__logo__" ? "border-on-background bg-surface-soft" : "border-divider"}`}>
                    <HomeIcon icon="__logo__" orbiColors={orbiColors} businessLogo={logoAtual} />
                  </button>
                )}
              </div>
              <button type="button" onClick={() => { setIconeBox(null); setEditandoLogo(true); }} className="mt-3 min-h-[44px] w-full rounded-full border border-divider text-[14px]">
                {logoAtual ? "Editar a logo da página" : "Adicionar a logo da página"}
              </button>
              <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Símbolos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ICON_LIBRARY.filter((ic) => !isAnimatedIcon(ic)).map((ic) => (
                  <button key={ic} type="button" onClick={() => setBoxIcon(iconeBox, ic)} className={`flex h-12 w-12 items-center justify-center rounded-full border text-[20px] ${alvo.icon === ic ? "border-on-background bg-surface-soft" : "border-divider"}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
      {isOwner && (
        <AdicionarBox
          aberto={adicionando}
          onFechar={() => setAdicionando(false)}
          whatsappInicial={business.contact_whatsapp ?? ""}
          enderecoInicial={business.address ?? ""}
          temVouchers={hasVouchers}
          onCriar={criarBox}
        />
      )}
      {isOwner && intent === null && !previewMode && (
        <div className="fixed left-4 top-[62px] z-20">
          <SeletorModo
            compacto
            modo={modo}
            onTrocar={(m) => guardarModoHome(business.slug, m)}
            padrao={modoPadrao}
            onTornarPadrao={() => tornarPadrao(modo)}
          />
        </div>
      )}
      {isOwner && intent === null && !previewMode && (
        <div className="fixed right-4 top-4 z-20 flex items-center gap-2">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-full bg-on-background/90 px-3.5 py-2 text-[13px] font-medium text-white shadow-lg backdrop-blur"
          >
            ← Meu painel
          </Link>
          <button
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-1.5 rounded-full bg-surface-white/90 px-3.5 py-2 text-[13px] font-medium text-text-secondary shadow-lg backdrop-blur"
          >
            👁 Modo visitante
          </button>
        </div>
      )}
      {isOwner && intent === null && previewMode && !previewTravado && (
        <button
          onClick={() => setPreviewMode(false)}
          className="fixed right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-on-background/90 px-3.5 py-2 text-[13px] font-medium text-white shadow-lg backdrop-blur"
        >
          ✎ Voltar a editar
        </button>
      )}

      {/* Centralizado só na tela inicial. Nas telas de conteúdo (vouchers,
          catálogo, sobre) centralizar empurrava tudo pra baixo e sobrava
          um vazio enorme no topo. */}
      <div className={`relative mx-auto flex min-h-screen max-w-[440px] flex-col items-center px-6 ${intent === null ? "justify-center py-16" : "justify-start py-8"}`}>
        {intent === null && !showOwnerControls && (
          <SeletorModo
            modo={modo}
            onTrocar={(m) => guardarModoHome(business.slug, m)}
            padrao={null}
            onTornarPadrao={() => tornarPadrao(modo)}
          />
        )}

        {intent === null && modo === "orbita" && (
          <OrbitHome
            itens={todasOpcoes.filter((o) => !o.rede)}
            redes={redes.map((o) => ({ key: o.key, t: o.t, rede: o.rede as Rede, onClick: o.onClick }))}
            nome={business.name}
            descricao={frase}
            pergunta={textoApagado(business.hero_question) ? null : business.hero_question}
            logoUrl={logoAtual}
            cores={orbiColors ?? heroGradient}
            agentName={agentName}
            onPerguntar={hasAiChat ? () => chooseIntent("duvida") : undefined}
          />
        )}
        {intent === null && modo === "orbita" && whatsAtalho && (
          <a
            href={whatsAtalho}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick({ businessId: business.id, kind: "whatsapp", sessionId })}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,211,102,0.7)]"
          >
            Falar no WhatsApp
          </a>
        )}

        {intent === null && modo === "grade" && (
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-8">
              {business.hero_avatar === "particle" || business.hero_avatar === "sphere" ? (
                <OrbiParticleSphere size={96} colors={orbiColors ?? undefined} className="rounded-full" />
              ) : logoAtual ? (
                // "logo" ou "auto" (padrão): logo se tiver, senão a esfera.
                <OrbiAvatar logoUrl={logoAtual} size={96} />
              ) : (
                <OrbiParticleSphere size={96} colors={orbiColors ?? undefined} className="rounded-full" />
              )}
              {showOwnerControls && (
                <button
                  type="button"
                  onClick={() => setEditandoLogo(true)}
                  aria-label="Editar logo"
                  className="absolute -right-1 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-surface-white text-[13px] text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.18)] ring-1 ring-black/[0.06] active:scale-95"
                >
                  ✎
                </button>
              )}
            </div>
            <div className="relative flex w-full flex-col items-center">
              {showOwnerControls && (
                <button
                  type="button"
                  onClick={() => setTextosAberto((v) => !v)}
                  aria-label="Editar textos do topo"
                  aria-expanded={textosAberto}
                  className="absolute -right-1 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-white text-[13px] text-text-secondary shadow-[0_2px_10px_rgba(17,19,24,0.18)] ring-1 ring-black/[0.06] active:scale-95"
                >
                  ✎
                </button>
              )}
              <p className="text-[14px] uppercase tracking-wide text-text-tertiary">
                {textos.nome}
              </p>
              {(textos.frase ?? frase) ? (
                <p className="mt-1.5 max-w-[320px] text-[14px] leading-snug text-text-secondary">{textos.frase ?? frase}</p>
              ) : null}
              {textos.pergunta !== "" && (
                <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-[24px] font-medium leading-[1.15] tracking-[-0.015em]">
                  {textos.pergunta?.trim() ? (
                    textos.pergunta
                  ) : (
                    <>
                      O que trouxe você
                      <br />
                      aqui hoje?
                    </>
                  )}
                </h1>
              )}
              {showOwnerControls && textosAberto && (
                <div className="mt-3 w-full max-w-[360px] rounded-2xl bg-surface-white p-4 text-left shadow-[0_8px_30px_rgba(17,19,24,0.16)] ring-1 ring-black/[0.05]">
                  {([
                    { campo: "nome", rotulo: "Nome", valor: textos.nome, dica: "Nome do seu negócio" },
                    { campo: "frase", rotulo: "Frase", valor: textos.frase ?? frase ?? "", dica: "Uma frase que diz o que você faz" },
                    { campo: "pergunta", rotulo: "Pergunta", valor: textos.pergunta === "" ? "" : textos.pergunta?.trim() ? textos.pergunta : "", dica: "O que trouxe você aqui hoje?" },
                  ] as const).map((c) => (
                    <label key={c.campo} className="mb-3 block last:mb-0">
                      <span className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">{c.rotulo}</span>
                      <input
                        defaultValue={c.valor}
                        placeholder={c.dica}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== c.valor.trim()) salvarTexto(c.campo, v);
                        }}
                        className="mt-1 w-full rounded-xl border border-divider px-3 py-2.5 text-[15px] outline-none focus:border-on-background"
                      />
                    </label>
                  ))}
                  <p className="text-[12px] text-text-tertiary">Deixe a frase ou a pergunta vazia para esconder.</p>
                  <button type="button" onClick={() => setTextosAberto(false)} className="mt-3 min-h-[44px] w-full rounded-full bg-button-primary text-[15px] font-medium text-white">Pronto</button>
                </div>
              )}
            </div>
            {estiloVitrine && (
              <HomeVitrine
                bolinhas={bolinhasVitrine}
                ctaRotulo={ctaVitrine.rotulo}
                ctaTipo={ctaVitrine.tipo}
                orbiAvatar={<OrbiParticleSphere size={34} colors={orbiColors ?? undefined} className="rounded-full" />}
                onPerguntar={(q) => chooseIntent("duvida", q || undefined)}
                opcoesCta={opcoesCta}
                onCtaTipo={boxFormato ? (t) => guardarNaVitrine({ botaoPrincipal: t }) : undefined}
                onCta={ctaVitrine.onClick}
                itens={content}
                tituloItens={business.catalog_title?.trim() || "Em destaque"}
                slug={business.slug}
                businessId={business.id}
                sessionId={sessionId}
                onVerTudo={(cat) => { setCategoriaInicial(cat); chooseIntent("comprar"); }}
                ordemCategorias={business.vitrine_categories ?? []}
                formato={boxFormato?.formatoItens ?? "destaque"}
                onFormato={boxFormato ? escolherFormato : undefined}
                extras={extrasVitrine}
                podeEditar={showOwnerControls}
                onEstilo={estiloBolinhas}
                onReordenar={reordenarBolinhas}
                onAdicionar={() => setAdicionando(true)}
              />
            )}
            {!estiloVitrine && (
              <>
            <div className="mt-10 grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              {(() => {
                // Distribuição mista: cada opção recebe "largo" (linha toda,
                // card horizontal e compacto) ou "medio" (metade, card
                // vertical). Uma escolha manual (setinha de formato) sempre
                // vale exatamente como escolhida, nunca é desfeita sozinha.
                // Só os boxes automáticos (sem escolha manual) formam par
                // entre si pra nunca sobrar espaço vazio; endereço e estrela
                // são largos por padrão nesse caso. Quando a escolha manual
                // não encontra um vizinho compatível, pode sobrar um espaço
                // vazio do lado, é o preço de ter controle de verdade.
                function resolvedLargo(opt: (typeof options)[number]): boolean {
                  if (opt.layoutOverride === "largo") return true;
                  if (opt.layoutOverride === "medio") return false;
                  return !!opt.address || !!opt.stars;
                }
                const withLayout: { o: (typeof options)[number]; largo: boolean }[] = [];
                for (let i = 0; i < options.length; i++) {
                  const o = options[i];
                  if (o.layoutOverride === "largo") { withLayout.push({ o, largo: true }); continue; }
                  if (o.layoutOverride === "medio") { withLayout.push({ o, largo: false }); continue; }
                  if (!!o.address || !!o.stars) { withLayout.push({ o, largo: true }); continue; }

                  // Automático: só vira médio se o próximo puder ficar do
                  // lado (seja porque também é automático elegível, seja
                  // porque já escolheu "Metade" manualmente).
                  const proximo = options[i + 1];
                  const proximoCabeAoLado = !!proximo && !resolvedLargo(proximo);
                  if (proximoCabeAoLado) {
                    withLayout.push({ o, largo: false });
                    // Só "consome" o próximo aqui se ele também for
                    // automático, se a escolha dele for manual, ele resolve
                    // sozinho no próprio turno do loop, sem duplicar.
                    if (!proximo!.layoutOverride) {
                      withLayout.push({ o: proximo!, largo: false });
                      i++;
                    }
                  } else {
                    // Sozinho (sem par pra formar médio+médio), vira largo
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
                      className="w-full rounded-full border border-black/15 bg-white px-3 py-1 text-[15px] font-semibold text-[#111318] caret-[#111318] outline-none placeholder:text-black/35"
                    />
                  ) : (
                    <>
                      {o.t}{o.ai ? <span className="orbi-gradient-text"> ✦</span> : null}
                    </>
                  );
                  return (
                  <div key={o.key} className={`relative ${largo ? "col-span-2" : "col-span-1"}`}>
                    {showOwnerControls && (
                      <div className="absolute right-2.5 top-2.5 z-20">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); setColorPickerBox(null); setTitleDraft(o.t); setMenuBox(menuBox === o.key ? null : o.key); }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[13px] text-text-secondary shadow-[0_1px_6px_rgba(17,19,24,0.18)] active:scale-95"
                          aria-label="Opções do card"
                          aria-expanded={menuBox === o.key}
                        >
                          ✎
                        </span>
                        {menuBox === o.key && (
                          <Portal>
                            <button type="button" aria-label="Fechar opções" onClick={(e) => { e.stopPropagation(); saveTitle(o.key); setMenuBox(null); }} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
                            <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-h-[78vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between">
                                <span className="text-[17px] font-medium">Editar card</span>
                                <button type="button" onClick={() => { saveTitle(o.key); setMenuBox(null); }} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Pronto</button>
                              </div>

                              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Nome</p>
                              <input
                                value={titleDraft}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                onBlur={() => saveTitle(o.key)}
                                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                                className="mt-2 w-full rounded-full border border-divider px-4 py-3 text-[15px] outline-none focus:border-on-background"
                                aria-label="Nome do card"
                              />

                              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Cor</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => setBoxColor(o.key, null)} aria-label="Branco padrão" className="flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-surface-white">
                                  {!o.color && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111318" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                                </button>
                                {NOBRES.slice(0, 7).map((c) => {
                                  const claro = ["#F1EDE4", "#D9D4C7", "#D8C8A0"].includes(c.hex);
                                  return (
                                    <button key={c.hex} type="button" onClick={() => setBoxColor(o.key, c.hex)} aria-label={c.nome} title={c.nome} className={`flex h-9 w-9 items-center justify-center rounded-full ${claro ? "border border-divider" : ""}`} style={{ backgroundColor: c.hex }}>
                                      {o.color?.toLowerCase() === c.hex.toLowerCase() && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={claro ? "#111318" : "#fff"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                      )}
                                    </button>
                                  );
                                })}
                                <button type="button" onClick={() => { saveTitle(o.key); setMenuBox(null); setColorPickerBox(o.key); }} className="min-h-[36px] rounded-full border border-divider px-3 text-[12.5px] text-text-secondary">Mais cores</button>
                              </div>

                              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Ícone</p>
                              <button type="button" onClick={() => { saveTitle(o.key); setMenuBox(null); setIconeBox(o.key); }} className="mt-2 flex min-h-[48px] w-full items-center justify-between rounded-full border border-divider px-4 text-[14px]">
                                <span>Trocar o ícone do card</span>
                                <span aria-hidden>→</span>
                              </button>
                              <button type="button" onClick={() => { saveTitle(o.key); setMenuBox(null); setEditandoLogo(true); }} className="mt-2 flex min-h-[48px] w-full items-center justify-between rounded-full border border-divider px-4 text-[14px]">
                                <span>Editar a logo da página</span>
                                <span aria-hidden>→</span>
                              </button>

                              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Formato</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {([[false, "Quadrado"], [true, "Retângulo"]] as const).map(([ehLargo, rot]) => (
                                  <button key={rot} type="button" aria-pressed={largo === ehLargo} onClick={() => { if (largo !== ehLargo) toggleLayout(o.key, largo); }} className={`min-h-[44px] rounded-full text-[14px] ${largo === ehLargo ? "bg-on-background text-white" : "border border-divider"}`}>
                                    {rot}
                                  </button>
                                ))}
                              </div>

                              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Posição</p>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => moveOption(o.key, -1)} className="min-h-[44px] rounded-full border border-divider text-[14px]">↑ Subir</button>
                                <button type="button" onClick={() => moveOption(o.key, 1)} className="min-h-[44px] rounded-full border border-divider text-[14px]">↓ Descer</button>
                              </div>

                              {o.atalho && (
                                <button type="button" onClick={() => { setMenuBox(null); definirIcone(o.key, true); }} className="mt-5 min-h-[48px] w-full rounded-full border border-divider text-[14px]">Virar ícone embaixo</button>
                              )}
                              <button type="button" onClick={() => { saveTitle(o.key); setMenuBox(null); abrirPaleta(); }} className="orbi-gradient mt-3 flex min-h-[48px] w-full items-center justify-between rounded-full px-4 text-left text-[14px] font-medium text-on-background">
                                <span>✦ Paleta da página inteira</span>
                                <span aria-hidden>→</span>
                              </button>
                            </div>
                          </Portal>
                        )}
                      </div>
                    )}

                    {/* Paletinha rápida de cor, abre sobre o card. Salva no
                        toque, sem precisar abrir o editor completo. */}
                    {showOwnerControls && colorPickerBox === o.key && (
                      <Portal>
                      <button type="button" aria-label="Fechar cores" onClick={(e) => { e.stopPropagation(); setColorPickerBox(null); }} className="fixed inset-0 z-[55] cursor-default" />
                      <div
                        className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-h-[60vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[16px] font-medium">Cor do card</span>
                          <button type="button" onClick={() => setColorPickerBox(null)} className="min-h-[40px] px-2 text-[14px] text-text-secondary">Fechar</button>
                        </div>
                        <p className="px-0.5 pb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Cores nobres</p>
                        <div className="grid grid-cols-8 gap-2">
                          <button
                            type="button"
                            onClick={() => setBoxColor(o.key, null)}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-surface-white"
                            aria-label="Branco padrão"
                            title="Branco padrão"
                          >
                            {!o.color && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111318" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                          </button>
                          {NOBRES.map((c) => {
                            const claro = ["#F1EDE4", "#D9D4C7", "#D8C8A0"].includes(c.hex);
                            return (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => setBoxColor(o.key, c.hex)}
                                className={`flex h-9 w-9 items-center justify-center rounded-full ${claro ? "border border-divider" : ""}`}
                                style={{ backgroundColor: c.hex }}
                                aria-label={c.nome}
                                title={c.nome}
                              >
                                {o.color?.toLowerCase() === c.hex.toLowerCase() && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={claro ? "#111318" : "#fff"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <button type="button" onClick={abrirPaleta} className="orbi-gradient mt-3 flex w-full items-center justify-between rounded-full px-3 py-2.5 text-left text-[13px] font-medium text-on-background">
                          <span>✦ Paleta da página inteira</span>
                          <span aria-hidden>→</span>
                        </button>
                        <button type="button" onClick={() => setTodasCores((v) => !v)} className="mt-2 w-full text-center text-[12px] text-text-tertiary underline underline-offset-2">
                          {todasCores ? "Esconder outras cores" : "Ver outras cores"}
                        </button>
                        {todasCores && (
                          <div className="mt-2 grid grid-cols-8 gap-2">
                            {[
                              "#000000", "#5C6B73", "#9A968C", "#B9B3A6",
                              "#C0392B", "#E5482F", "#C2650A", "#E8902A", "#F2B705", "#B8860B", "#8A6A2B",
                              "#1F7A3D", "#3FA34D", "#0B6B4F", "#0E7490", "#1FA2C9", "#1D4ED8", "#3B82F6",
                              "#6D28D9", "#8B5CF6", "#5B2A6E", "#B0309E", "#E0457B", "#B76E79", "#C97064",
                              "#14213D", "#2E4034", "#4A3728", "#6E5A3D",
                              "#F6C6C0", "#F7D9B5", "#F3E7A6", "#CFE8C4", "#C4E4EC", "#C9D6F2", "#DCCDF0",
                            ].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setBoxColor(o.key, c)}
                                className={`flex h-9 w-9 items-center justify-center rounded-full ${c.startsWith("#F") ? "border border-divider" : ""}`}
                                style={{ backgroundColor: c }}
                                aria-label={`Cor ${c}`}
                              >
                                {o.color === c && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      </Portal>
                    )}
                    {largo ? (
                      // Card LARGO, horizontal (ícone + texto na linha)
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !isEditingThis && o.onClick()}
                        onKeyDown={(e) => { if (!isEditingThis && (e.key === "Enter" || e.key === " ")) o.onClick(); }}
                        className={homeCardShellClass("largo", o.ai, o.cupom, o.color)}
                        style={homeCardShellStyle(o.color)}
                      >
                        <HomeOptionCardContent
                          layout="largo"
                          icon={o.icon}
                          boxLogo={o.boxLogo}
                          color={o.color}
                          orbiColors={orbiColors}
                          businessLogo={logoAtual}
                          titleNode={titleNode}
                          ai={o.ai}
                          stars={o.stars}
                          cupom={o.cupom}
                          description={o.ai ? `Fale com a ${agentName}, nossa IA.` : o.d}
                          addressIndicator={o.address ? (expandedBox === o.key ? "▾" : "▸") : undefined}
                        />
                      </div>
                    ) : (
                      // Card MÉDIO, vertical (ícone em cima, texto embaixo).
                      // O título tem altura mínima de 2 linhas sempre, assim
                      // a descrição começa na mesma altura nos dois cards da
                      // dupla, mesmo quando um título quebra em 2 linhas e o
                      // outro cabe numa só.
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !isEditingThis && o.onClick()}
                        onKeyDown={(e) => { if (!isEditingThis && (e.key === "Enter" || e.key === " ")) o.onClick(); }}
                        className={homeCardShellClass("medio", o.ai, o.cupom, o.color)}
                        style={homeCardShellStyle(o.color)}
                      >
                        <HomeOptionCardContent
                          layout="medio"
                          icon={o.icon}
                          boxLogo={o.boxLogo}
                          color={o.color}
                          orbiColors={orbiColors}
                          businessLogo={logoAtual}
                          titleNode={titleNode}
                          ai={o.ai}
                          stars={o.stars}
                          cupom={o.cupom}
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
              {todasOpcoes.length === 0 && (
                <div className="col-span-2 rounded-[24px] bg-surface-white p-5 text-center shadow-[0_2px_12px_rgba(17,19,24,0.05)]">
                  <p className="text-[14px] font-medium">Ainda não tem nada por aqui</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-text-tertiary">
                    Essa página está sendo montada. Volta mais tarde pra conferir.
                  </p>
                </div>
              )}
            </div>

            {showOwnerControls && (
              <button type="button" onClick={() => setAdicionando(true)} className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-dashed border-on-background/30 text-[14.5px] font-medium text-text-secondary active:bg-surface-soft">
                <span aria-hidden className="text-[18px] leading-none">＋</span> Adicionar botão
              </button>
            )}
            {whatsAtalho && (
              <a
                href={whatsAtalho}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick({ businessId: business.id, kind: "whatsapp", sessionId })}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,211,102,0.7)]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" /></svg>
                Falar no WhatsApp
              </a>
            )}

            {atalhos.length > 0 && (
              <div className="mt-7 flex flex-col items-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Fale com a gente</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  {atalhos.map((o, i) => {
                    const cor = o.atalho === "whatsapp" ? "#25D366" : o.atalho === "endereco" ? "#EA4335" : "#111318";
                    const clique = o.atalho === "endereco" ? () => setEnderecoIconeAberto((v) => !v) : o.onClick;
                    return (
                      <div key={o.key} className="relative">
                        <button
                          type="button"
                          onClick={clique}
                          aria-label={o.t}
                          title={o.t}
                          aria-expanded={o.atalho === "endereco" ? enderecoIconeAberto : undefined}
                          style={{ "--i": i, "--cor": cor, background: cor, boxShadow: `0 6px 18px -6px ${cor}99` } as CSSProperties}
                          className="orbi-rede flex h-12 w-12 items-center justify-center rounded-full text-white"
                        >
                          <span className="orbi-rede-anel" aria-hidden />
                          <span className="orbi-rede-brilho" aria-hidden />
                          <span className="relative">
                            {o.atalho === "whatsapp" ? (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" /></svg>
                            ) : o.atalho === "endereco" ? (
                              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>
                            ) : (
                              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z" /></svg>
                            )}
                          </span>
                        </button>
                        {showOwnerControls && (
                          <button type="button" onClick={() => definirIcone(o.key, false)} aria-label="Voltar a ser card" title="Voltar a ser card" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-white text-[10px] text-text-secondary shadow ring-1 ring-black/10">↩</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {enderecoIconeAberto && (() => {
                  const end = atalhos.find((o) => o.atalho === "endereco")?.address;
                  if (!end) return null;
                  return (
                    <div className="mt-3 w-full max-w-[320px] rounded-2xl bg-surface-white p-4 text-center shadow-[0_2px_12px_rgba(17,19,24,0.08)]">
                      <p className="text-[13.5px] leading-snug text-text-secondary">{end}</p>
                      <div className="mt-3 flex gap-2">
                        <a href={`https://waze.com/ul?q=${encodeURIComponent(end)}&navigate=yes`} target="_blank" rel="noopener noreferrer" onClick={() => trackClick({ businessId: business.id, kind: "link", sessionId })} className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Waze</a>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackClick({ businessId: business.id, kind: "link", sessionId })} className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Google Maps</a>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {(redes.length > 0 || atalhosSite.length > 0) && (
              <div className="mt-7 flex flex-col items-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Siga a gente</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  {redes.map((o, i) => {
                    const r = o.rede as Rede;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        onClick={o.onClick}
                        aria-label={o.t || nomeDaRede(r)}
                        title={o.t || nomeDaRede(r)}
                        style={{ "--i": i, "--cor": COR_DA_REDE[r], background: FUNDO_DA_REDE[r], boxShadow: `0 6px 18px -6px ${COR_DA_REDE[r]}99` } as CSSProperties}
                        className="orbi-rede flex h-12 w-12 items-center justify-center rounded-full text-white"
                      >
                        <span className="orbi-rede-anel" aria-hidden />
                        <span className="orbi-rede-brilho" aria-hidden />
                        <span className="relative"><IconeRede rede={r} size={21} /></span>
                      </button>
                    );
                  })}
                  {atalhosSite.map((o, i) => (
                    <div key={o.key} className="relative">
                      <button
                        type="button"
                        onClick={o.onClick}
                        aria-label={o.t || "Nosso site"}
                        title={o.t || "Nosso site"}
                        style={{ "--i": redes.length + i, "--cor": "#111318", background: "#111318", boxShadow: "0 6px 18px -6px #11131899" } as CSSProperties}
                        className="orbi-rede flex h-12 w-12 items-center justify-center rounded-full text-white"
                      >
                        <span className="orbi-rede-anel" aria-hidden />
                        <span className="orbi-rede-brilho" aria-hidden />
                        <span className="relative">
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z" /></svg>
                        </span>
                      </button>
                      {showOwnerControls && (
                        <button type="button" onClick={() => definirIcone(o.key, false)} aria-label="Voltar a ser card" title="Voltar a ser card" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-white text-[10px] text-text-secondary shadow ring-1 ring-black/10">↩</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

              </>
            )}

            {hasAiChat && content.length >= 3 && (
              <div className="mt-6 w-full">
                <CuradoriaOrbi businessId={business.id} slug={business.slug} orbiColors={orbiColors} products={content} agentName={agentName} onAskOrbi={hasAiChat ? (q) => chooseIntent("duvida", q) : undefined} onGift={giftEnabled ? () => chooseIntent("presentear") : undefined} />
              </div>
            )}
          </div>
        )}

        {intent === "presentear" && giftEnabled && (
          <div className="w-full">
            <GiftFlow businessId={business.id} businessName={business.name} whatsapp={business.contact_whatsapp} onBack={voltarAoInicio} />
          </div>
        )}

        {((intent === "comprar") || (intent === "presentear" && !giftEnabled)) && (
          <div className="w-full">
            <VitrineCoverBleed business={business} />
            <button onClick={voltarAoInicio} className="mb-5 mt-5 text-[14px] text-text-tertiary hover:underline">← voltar</button>
            <h2 className="font-[family-name:var(--font-manrope)] text-[22px] font-medium tracking-[-0.01em]">
              {intent === "presentear" ? "Para presentear" : (business.catalog_title || `${business.name}, Catálogo`)}
            </h2>
            <p className="mt-1 text-[15px] text-text-secondary">
              {intent === "presentear" ? "Seleções que fazem sentido para dar de presente" : (business.catalog_subtitle || "Explore nossas soluções.")}
            </p>

            {/* Faixa de "receber novidades" no topo, só se o dono ligou. */}
            {business.vitrine_lead_top && (
              <LeadCapture
                businessId={business.id}
                businessName={business.name}
                sessionId={sessionId}
                orbiColors={orbiColors}
                contexto="vitrine"
                variant="compact"
                className="mt-4"
              />
            )}

            {hasAiChat && content.length >= 3 && (
              <div className="mt-5">
                <CuradoriaOrbi businessId={business.id} slug={business.slug} orbiColors={orbiColors} products={content} agentName={agentName} onAskOrbi={hasAiChat ? (q) => chooseIntent("duvida", q) : undefined} compact />
              </div>
            )}

            {content.length === 0 ? (
              <Card className="mt-6 text-[15px] text-text-secondary">Ainda não há produtos publicados por aqui.</Card>
            ) : (
              <>
                <Showcase categoriaInicial={categoriaInicial} content={content} business={business} sessionId={sessionId} orbiColors={orbiColors} onOrbi={hasAiChat ? () => chooseIntent("duvida") : undefined} />
                {/* Captura discreta no fim do catálogo: quem chegou até aqui
                    olhou tudo, é o momento certo de oferecer aviso. */}
                {!business.vitrine_lead_top && (
                  <LeadCapture
                    businessId={business.id}
                    businessName={business.name}
                    sessionId={sessionId}
                    orbiColors={orbiColors}
                    contexto="vitrine"
                    className="mt-6"
                  />
                )}
              </>
            )}
          </div>
        )}

        {intent === "conhecer" && (
          <StoryView
            business={business}
            onBack={voltarAoInicio}
            onCatalog={() => chooseIntent("comprar")}
            onOrbi={hasAiChat ? () => chooseIntent("duvida") : undefined}
            sessionId={sessionId}
          />
        )}

        {intent === "duvida" && (
          <OrbiChat businessId={business.id} slug={business.slug} sessionId={sessionId} agentName={agentName} orbiColors={orbiColors} heroGradient={heroGradient} content={content} whatsapp={business.contact_whatsapp} address={business.address ?? null} suggestedQuestions={suggestedQuestions} initialInput={orbiPrefill} onBack={voltarAoInicio} />
        )}

        {intent === "cupom" && (
          <VoucherFlow business={business} sessionId={sessionId} orbiColors={orbiColors} onBack={voltarAoInicio} />
        )}
      </div>

      {/* Orbi flutuante, sempre à mão, exceto quando o chat já está aberto ou
          o dono está visualizando a própria página. Só pra quem tem chat. */}
      {hasAiChat && intent !== null && intent !== "duvida" && (
        <OrbiFloatingButton onOpen={() => chooseIntent("duvida")} orbiColors={orbiColors} agentName={agentName} />
      )}
    </main>
  );
}

type VoucherPublic = { id: string; title: string; description: string | null; discount_type: string; discount_value: number; quantity_total: number; quantity_claimed: number; image_url: string | null; badge: string | null; color: string | null };

function voucherDiscountLabel(v: Pick<VoucherPublic, "discount_type" | "discount_value">) {
  return descontoLongo(v);
}

// Só o número grande do desconto, pra ficar em destaque no card ("10% OFF" / "R$ 10 OFF").
function voucherDiscountBig(v: Pick<VoucherPublic, "discount_type" | "discount_value">) {
  return descontoGrande(v);
}

type MeuVoucher = { code: string; title: string; expiresAt: string | null; claimedAt: string };

function meusVouchersKey(businessId: string) {
  // A chave NÃO acompanha o rename: ela já existe no celular de quem
  // resgatou antes, e mudar faria essas pessoas perderem os códigos.
  return `orbi_meus_cupons_${businessId}`;
}

function lerMeusVouchers(businessId: string): MeuVoucher[] {
  try {
    const raw = localStorage.getItem(meusVouchersKey(businessId));
    return raw ? (JSON.parse(raw) as MeuVoucher[]) : [];
  } catch {
    return [];
  }
}

/** Tela de vouchers, galeria dos ativos, resgate (nome + WhatsApp) e o
 * código único que a pessoa leva até o negócio. Os vouchers já resgatados
 * neste aparelho ficam guardados no próprio celular, pra ela reencontrar. */
function resultMessage(businessName: string, expiresAt: string | null) {
  const base = `Mostre esse código pro ${businessName}, no balcão ou pelo WhatsApp, pra usar o desconto.`;
  if (!expiresAt) return base;
  const data = new Date(expiresAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `${base} Vale até ${data}.`;
}

function VoucherFlow({ business, sessionId, orbiColors, onBack }: { business: Business; sessionId: string | null; orbiColors: string[] | null; onBack: () => void }) {
  const supabase = createClient();
  const [vouchers, setVouchers] = useState<VoucherPublic[] | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  // Nome e WhatsApp ficam lembrados neste aparelho: quem pega um segundo
  // voucher não precisa digitar tudo de novo.
  const chaveVisitante = `orbi_visitante_${business.id}`;
  const [name, setName] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(chaveVisitante) ?? "{}") as { nome?: string }).nome ?? ""; } catch { return ""; }
  });
  const [whatsapp, setWhatsapp] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(chaveVisitante) ?? "{}") as { whatsapp?: string }).whatsapp ?? ""; } catch { return ""; }
  });
  const [deixouWhats, setDeixouWhats] = useState(false);
  const [result, setResult] = useState<{ code: string; title: string; expiresAt: string | null; color: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meusVouchers, setMeusVouchers] = useState<MeuVoucher[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("vouchers")
      .select("id, title, description, discount_type, discount_value, quantity_total, quantity_claimed, image_url, badge, color")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setVouchers((data as VoucherPublic[]) ?? []));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMeusVouchers(lerMeusVouchers(business.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  function guardarMeuVoucher(c: MeuVoucher) {
    const next = [c, ...lerMeusVouchers(business.id).filter((x) => x.code !== c.code)].slice(0, 20);
    try { localStorage.setItem(meusVouchersKey(business.id), JSON.stringify(next)); } catch { /* ignora */ }
    setMeusVouchers(next);
  }

  async function copiar(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* sem clipboard */ }
  }

  async function resgatar(voucherId: string) {
    setError(null);
    const vouchercor = vouchers?.find((x) => x.id === voucherId)?.color ?? null;
    try {
      const res = await fetch("/api/vouchers/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId, name: name.trim() || null, whatsapp: whatsapp.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível resgatar esse voucher.");
        return;
      }
      trackClick({ businessId: business.id, kind: "cupom", sessionId });
      try { localStorage.setItem(chaveVisitante, JSON.stringify({ nome: name.trim(), whatsapp: whatsapp.trim() })); } catch { /* ignora */ }
      // Quem deixou o WhatsApp no resgate já entra na lista de quem quer
      // novidades. Um pedido só, em vez de perguntar o número duas vezes.
      if (whatsapp.replace(/\D/g, "").length >= 10) {
        setDeixouWhats(true);
        supabase.rpc("upsert_lead", {
          p_business_id: business.id,
          p_whatsapp: whatsapp.trim(),
          p_name: name.trim() || null,
          p_source: "voucher",
          p_session_id: sessionId,
          p_interest: data.title ?? null,
        }).then(() => {
          try { localStorage.setItem(`orbi_lead_${business.id}`, "1"); } catch { /* ignora */ }
        });
      }
      setResult({ code: data.code, title: data.title, expiresAt: data.expires_at, color: vouchercor });
      guardarMeuVoucher({ code: data.code, title: data.title, expiresAt: data.expires_at ?? null, claimedAt: new Date().toISOString() });
      setClaiming(null);
    } catch {
      setError("Erro de conexão ao resgatar o voucher.");
    }
  }

  return (
    <div className="w-full">
      <button onClick={onBack} className="mb-3 text-[14px] text-text-tertiary hover:underline">← voltar</button>
      <h2 className="font-[family-name:var(--font-manrope)] text-[24px] font-medium tracking-[-0.01em]">Vouchers</h2>
      <p className="mt-1 text-[14px] text-text-secondary">Vantagens exclusivas pra você.</p>

      {result ? (
        <div className="relative mt-6">
          <div aria-hidden className="absolute inset-0 -z-10 rounded-[28px] opacity-45 blur-3xl" style={{ background: voucherTheme(result.color).via }} />
          <div className="relative overflow-hidden rounded-[28px] p-7 text-center text-white" style={{ background: voucherGradient(result.color), boxShadow: `0 16px 44px ${voucherTheme(result.color).glow}` }}>
            <VoucherLines />
            <span className="relative text-[26px]">🎉</span>
            <p className="mt-2 text-[14px] font-medium opacity-90">{result.title}</p>
            <p className="mt-3 font-[family-name:var(--font-manrope)] text-[40px] font-bold tracking-[0.08em]">{result.code}</p>
            <div className="mt-4 flex justify-center">
              <VoucherQRCode code={result.code} />
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed opacity-90">
              {resultMessage(business.name, result.expiresAt)}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => copiar(result.code)}
                className="flex-1 rounded-full bg-white/20 py-3 text-[14px] font-semibold text-white backdrop-blur-sm"
              >
                {copied === result.code ? "Copiado ✓" : "Copiar código"}
              </button>
              <VoucherShareButton
                title={result.title}
                code={result.code}
                message={resultMessage(business.name, result.expiresAt)}
                className="flex-1 rounded-full bg-white/20 py-3 text-[14px] font-semibold text-white backdrop-blur-sm disabled:opacity-60"
              />
            </div>
            <button onClick={() => setResult(null)} className="mt-4 text-[12.5px] underline opacity-80">Ver outros vouchers</button>
          </div>
          {!deixouWhats && (
            <LeadCapture
              businessId={business.id}
              businessName={business.name}
              sessionId={sessionId}
              orbiColors={orbiColors}
              contexto="voucher"
              className="mt-5"
            />
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {vouchers === null && <p className="text-[14px] text-text-tertiary">Carregando…</p>}
          {vouchers?.length === 0 && <p className="text-[14px] text-text-tertiary">Nenhum voucher disponível no momento.</p>}
          {vouchers?.map((v) => {
            const restam = v.quantity_total - v.quantity_claimed;
            const isClaiming = claiming === v.id;

            if (isClaiming) {
              return (
                <div key={v.id} className="rounded-[24px] border border-divider bg-surface-white p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">Pegando seu voucher</p>
                  <p className="mt-1 text-[16px] font-semibold">{v.title}</p>
                  <p className="mt-0.5 text-[14px] text-text-secondary">{voucherDiscountLabel(v)}</p>
                  <div className="mt-4 flex flex-col gap-2.5">
                    <div>
                      <p className="text-[12px] text-text-tertiary">Seu nome</p>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Como podemos te chamar"
                        autoFocus
                        className="mt-1 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
                      />
                    </div>
                    <div>
                      <p className="text-[12px] text-text-tertiary">Seu WhatsApp (opcional, pra receber novos vouchers)</p>
                      <input
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="(11) 99999-9999"
                        inputMode="tel"
                        className="mt-1 w-full rounded-2xl border border-divider bg-surface-white px-4 py-3 text-[15px] outline-none focus:border-on-background"
                      />
                    </div>
                    {error && <p className="text-[13px] font-medium text-red-600">{error}</p>}
                    <div className="mt-1.5 flex gap-2">
                      <button onClick={() => { setClaiming(null); setError(null); }} className="flex-1 rounded-full bg-surface-soft py-3 text-[14px] font-medium">Cancelar</button>
                      <button onClick={() => resgatar(v.id)} className="flex-1 rounded-full bg-button-primary py-3 text-[14px] font-medium text-white">Confirmar</button>
                    </div>
                  </div>
                </div>
              );
            }

            const tema = voucherTheme(v.color);
            return (
              <div
                key={v.id}
                className="relative overflow-hidden rounded-[24px] text-white"
                style={{ background: voucherGradient(v.color), boxShadow: `0 12px 30px ${tema.glow}` }}
              >
                {/* Foto ocupa a lateral direita, com recorte curvo, e o
                    degradê da cor entra por cima dela pela esquerda, então o
                    texto continua legível sem espremer nada. Sem foto, fica
                    só o fundo metálico com as linhas. */}
                {v.image_url && (
                  <div className="absolute inset-y-0 right-0 w-[52%]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.image_url} alt={v.title} className="h-full w-full object-cover" style={{ WebkitMaskImage: "radial-gradient(140% 120% at 100% 50%, #000 55%, transparent 78%)", maskImage: "radial-gradient(140% 120% at 100% 50%, #000 55%, transparent 78%)" }} />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${tema.via} 0%, ${tema.via}CC 30%, transparent 72%)` }} />
                  </div>
                )}
                <VoucherLines />
                <div className="relative p-5">
                  <div className="max-w-[62%]">
                    {v.badge?.trim() && (
                      <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                        {v.badge}
                      </span>
                    )}
                    {/* Brinde/benefício não tem número: o título assume o destaque. */}
                    {v.discount_type !== "gift" && (
                      <p className={`font-[family-name:var(--font-manrope)] text-[32px] font-extrabold leading-none tracking-[-0.02em] ${v.badge?.trim() ? "mt-2.5" : ""}`}>
                        {voucherDiscountBig(v)}
                      </p>
                    )}
                    <p className={v.discount_type === "gift" ? `font-[family-name:var(--font-manrope)] text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] ${v.badge?.trim() ? "mt-2.5" : ""}` : "mt-2 text-[16px] font-semibold leading-snug"}>{v.title}</p>
                    {v.description?.trim() && (
                      <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed opacity-80">{v.description}</p>
                    )}
                  </div>

                  {/* Ação e estoque na mesma linha: o botão cabe inteiro e o
                      "restantes" deixa de gastar uma linha só pra ele. */}
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={() => { setClaiming(v.id); setError(null); }}
                      disabled={restam <= 0}
                      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-[14px] font-bold disabled:opacity-50"
                      style={{ color: tema.ctaText }}
                    >
                      {restam > 0 ? <>Pegar meu voucher <span aria-hidden>→</span></> : "Esgotado"}
                    </button>
                    <p className="min-w-0 flex-1 truncate text-[12.5px] opacity-75">
                      {restam > 0 ? `${restam} restantes` : "Acabou"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Vouchers já resgatados neste aparelho, pra pessoa reencontrar o código */}
          {meusVouchers.length > 0 && (
            <div className="mt-2">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-text-tertiary">Meus vouchers resgatados</p>
              <div className="mt-2.5 flex flex-col gap-2">
                {meusVouchers.map((c) => {
                  const vencido = !!c.expiresAt && new Date(c.expiresAt) < new Date();
                  return (
                    <div key={c.code} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-white p-3.5 shadow-[0_2px_10px_rgba(17,19,24,0.05)]">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium">{c.title}</p>
                        <p className="mt-0.5 font-[family-name:var(--font-manrope)] text-[17px] font-bold tracking-[2px]">{c.code}</p>
                        <p className={`mt-0.5 text-[11.5px] ${vencido ? "text-red-600" : "text-text-tertiary"}`}>
                          {vencido ? "Venceu" : c.expiresAt ? `Vale até ${new Date(c.expiresAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Sem validade"}
                        </p>
                      </div>
                      <button onClick={() => copiar(c.code)} className="shrink-0 rounded-full bg-surface-soft px-3 py-2 text-[12.5px] font-medium text-text-secondary">
                        {copied === c.code ? "Copiado ✓" : "Copiar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Card de endereço, pin animado, texto, e botões pra abrir no Waze ou
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
                      title={`${business.name}, vídeo ${i + 1}`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : igId ? (
                    <iframe
                      src={`https://www.instagram.com/reel/${igId}/embed`}
                      title={`${business.name}, reels ${i + 1}`}
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
          <div className="mt-2 flex flex-col gap-3.5 text-[14.5px] leading-[1.7] text-text-secondary">
            {paragrafosSobre(business.about_business).map((p, i) => (
              <p key={i} className={i === 0 ? "text-[15.5px] leading-[1.6] text-on-background" : undefined}>{p}</p>
            ))}
          </div>
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
 * **negrito** de verdade, em vez de um bloco só, apertado e sem cor.
 */
// Ícone das opções da tela inicial, cobre os tipos especiais (esfera, google,
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
  sessionId: string | null;
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
  // aberto, sem isso, no iOS o dedo "vaza" pro fundo e a página de trás
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

  // Sugestões puxadas do que existe de verdade no negócio, nunca genéricas.
  // Prioriza itens variados (categorias diferentes) pra cobrir mais opções.
  // Só 5, o suficiente pra caber na tela sem precisar rolar, com a barra de
  // digitar sempre visível.
  const QUICK = (() => {
    // Se o dono configurou perguntas no painel, usa elas (até 4).
    if (suggestedQuestions && suggestedQuestions.length > 0) {
      return suggestedQuestions.slice(0, 4);
    }
    // Senão, a Orbi gera automaticamente a partir do catálogo, itens de
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
    // carregando o histórico, assim, ao reabrir o chat em qualquer página, a
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

  // Efeito de "alguém digitando" no placeholder do campo, só decorativo,
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
      const reply = res.ok && data.reply ? data.reply : "Desculpa, tive um problema aqui, pode tentar de novo?";
      // Ao terminar: mostra o check por um instante ("pronto") antes de exibir a resposta.
      setJustDone(true);
      setMessages((prev) => [...prev, { role: "agent", content: reply }]);
      window.setTimeout(() => setJustDone(false), 1400);
    } finally {
      setSending(false);
    }
  }

  const started = messages.length > 0;

  // Auto-scroll só DEPOIS que a conversa começou, enquanto está nas sugestões,
  // o visitante rola livremente. Rolar pro fim só quando chega mensagem/pensa.
  useEffect(() => {
    if (!started && !sending) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending, justDone, started]);

  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-[440px] flex-col overflow-hidden bg-background-main">
      {/* Nada de cor no topo aqui também, mesmo motivo da tela inicial. */}

      {/* Mesmo halo da tela inicial, pra não ficar um fundo parado/liso aqui , 
          a marca continua presente mesmo depois de abrir o chat. */}
      <div
        className="pointer-events-none absolute -bottom-56 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full opacity-25 blur-[80px]"
        style={{ backgroundImage: `linear-gradient(135deg, ${heroGradient[0]}, ${heroGradient[1]})` }}
      />

      {/* Fechar, z-index acima do conteúdo pra o toque nunca ser bloqueado */}
      <button
        onClick={onBack}
        className="absolute left-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-surface-white text-[16px] shadow"
        aria-label="Fechar"
      >
        ×
      </button>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-6 pb-40 pt-20" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Avatar, a esfera configurada da Orbi, não mais a esfera de vidro genérica. */}
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
                href={whatsappLink(whatsapp, "Oi! Eu vim pelo Orbibox.")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick({ businessId, kind: "whatsapp", sessionId })}
                className="wa-reflect relative flex items-center justify-center gap-2 self-start overflow-hidden rounded-full px-5 py-3 text-[14px] font-semibold text-[#0B4A25] shadow-[0_8px_22px_rgba(37,211,102,0.35)]"
              >
                <OrbiContactDisc size={22} />
                <span className="relative">Prefiro falar direto por WhatsApp</span>
              </a>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Campo fixo */}
      {/* Faixa de fundo sólida da base até acima do campo, impede que as
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

function OrbiRecommendation({ businessId, sessionId, onOrbi, orbiColors }: { businessId: string; sessionId: string | null; onOrbi?: () => void; orbiColors?: string[] | null }) {
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
      {/* Esfera da Orbi no cantinho: deixa claro que quem "fala" é ela. */}
      <span className="absolute right-5 top-5 h-9 w-9 overflow-hidden rounded-full" aria-hidden>
        <OrbiParticleSphere size={36} colors={orbiColors ?? undefined} className="rounded-full" />
      </span>
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

  // Passa sozinha a cada 2s, a pessoa também pode arrastar quando quiser.
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
          // Só recalcula o índice depois que o scroll assenta, senão o
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

function Showcase({ content, business, sessionId, onOrbi, orbiColors, categoriaInicial = null }: { categoriaInicial?: string | null; content: ContentItem[]; business: Business; sessionId: string | null; onOrbi?: () => void; orbiColors?: string[] | null }) {
  const sections = groupByCategory(content, business.vitrine_categories ?? []);
  // Chips e títulos só pras categorias de verdade; itens sem categoria
  // aparecem no topo, sem título.
  const nomeadas = sections.filter((s) => s.name);
  const [active, setActive] = useState<string | null>(categoriaInicial && nomeadas.some((s) => s.name === categoriaInicial) ? categoriaInicial : null);

  const visible = active ? sections.filter((s) => s.name === active) : sections;
  const router = useRouter();
  const modo = useModoVitrine(business.slug);

  // Para onde cada produto leva. Mesma regra dos cards da grade.
  const destinoDe = (item: ContentItem) => {
    const destino = item.link_kind === "nenhum"
      ? null
      : item.link_kind === "categoria"
        ? item.target_url
        : item.target_url && item.link_kind === "externo"
          ? item.target_url
          : `/${business.slug}/p/${item.id}`;
    const isExterno = item.link_kind === "categoria" || item.link_kind === "externo";
    const kind: "categoria" | "produto" | "link" = item.link_kind === "categoria" ? "categoria" : item.link_kind === "produto" ? "produto" : "link";
    return { destino, isExterno, kind };
  };

  // Modo Órbita da vitrine: os produtos da categoria escolhida viram uma
  // galeria 3D (coverflow), cada card na proporção da foto.
  const PROPORCAO = { quadrado: 1, retrato: 4 / 5, paisagem: 16 / 9, banner: 1920 / 830 } as const;
  const clicaveis = visible.flatMap((sec) => sec.items).filter((item) => !!destinoDe(item).destino);
  const galeria: CoverflowItem[] = clicaveis.map((item) => {
    const { destino, isExterno, kind } = destinoDe(item);
    const size = sizeOf(item.layout_size);
    return {
      key: item.id,
      titulo: item.title,
      descricao: item.description?.trim() || "",
      imagem: item.image_url || null,
      preco: formatPrice(item) || null,
      ratio: PROPORCAO[COVER_RATIO_BY_SIZE[size]],
      destaque: size === "destaque",
      temPagina: !isExterno && (item.link_kind ?? "produto") === "produto",
      onClick: () => {
        if (!destino) return;
        trackClick({ businessId: business.id, kind: isExterno ? kind : "produto", contentItemId: item.id, sessionId, targetUrl: destino });
        if (isExterno) window.open(destino, "_blank", "noopener,noreferrer");
        else router.push(destino);
      },
    };
  });
  const emOrbita = modo === "orbita" && galeria.length >= 2;

  return (
    <>
      {clicaveis.length >= 2 && (
        <div className="relative z-[80] mt-5 flex justify-center">
          <SeletorModo modo={modo} onTrocar={(m) => guardarModoVitrine(business.slug, m)} padrao={null} onTornarPadrao={() => {}} />
        </div>
      )}
      {sections.length > 1 && nomeadas.length > 0 && (
        <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setActive(null)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] ${active === null ? "bg-button-primary text-white" : "border border-divider bg-surface-white text-text-secondary"}`}
          >
            Tudo
          </button>
          {nomeadas.map((s) => (
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

      {emOrbita ? (
        <div className="mt-4">
          <VitrineCoverflow key={active ?? "_tudo"} itens={galeria} />
          <div className="mt-6"><OrbiRecommendation businessId={business.id} sessionId={sessionId} onOrbi={onOrbi} orbiColors={orbiColors} /></div>
        </div>
      ) : (
      <div className="mt-6 flex flex-col gap-8">
        {visible.map((sec, si) => (
          <div key={sec.name || "_sem"}>
            {sections.length > 1 && sec.name && (
              <h3 className="mb-3 font-[family-name:var(--font-manrope)] text-[20px] font-medium">{sec.name}</h3>
            )}
            {/* Mesmo cartão grande da edição, o que você vê ao editar é o que o
                visitante vê aqui, sem surpresa. items-start: card sem rodapé
                não estica até a altura do vizinho. */}
            <div className="flex flex-wrap items-start gap-5">
              {sec.items.map((item) => (
                <CartaoItem
                  key={item.id}
                  item={item}
                  slug={business.slug}
                  businessId={business.id}
                  sessionId={sessionId}
                  largura={sizeOf(item.layout_size) === "medio" ? "w-[calc(50%-10px)]" : "w-full"}
                />
              ))}
            </div>
            {si === 0 && <div className="mt-6"><OrbiRecommendation businessId={business.id} sessionId={sessionId} onOrbi={onOrbi} orbiColors={orbiColors} /></div>}
          </div>
        ))}
      </div>
      )}
      <BarraContato business={business} sessionId={sessionId} onOrbi={onOrbi} />
    </>
  );
}

/** Troca clara entre os dois jeitos de ver a tela inicial. Pro dono (fora do
 * modo visitante) mostra também qual é o padrão da página e deixa tornar o
 * modo atual o padrão com um toque. */
/** Renderiza fora do card (no body), pra painéis fixos não herdarem corte/transform do pai. */
function Portal({ children }: { children: React.ReactNode }) {
  const pronto = useSyncExternalStore(() => () => {}, () => true, () => false);
  return pronto ? createPortal(children, document.body) : null;
}

function SeletorModo({
  modo,
  onTrocar,
  padrao,
  onTornarPadrao,
  compacto = false,
}: {
  modo: ModoHome;
  onTrocar: (m: ModoHome) => void;
  padrao: ModoHome | null;
  onTornarPadrao: () => void;
  compacto?: boolean;
}) {
  const opcoes: { v: ModoHome; rotulo: string }[] = [
    { v: "orbita", rotulo: "órbita" },
    { v: "grade", rotulo: "grade" },
  ];
  const texto = (
    <div role="radiogroup" aria-label="Como ver esta página" className="flex items-center gap-4 text-[14px]">
      {opcoes.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={modo === o.v}
          onClick={() => onTrocar(o.v)}
          className={`min-h-[36px] transition-colors ${modo === o.v ? "font-medium text-on-background underline underline-offset-[6px]" : "text-text-tertiary"}`}
        >
          {o.rotulo}
          {padrao === o.v && <span className="ml-1 text-[10px] text-text-tertiary" title="Padrão da sua página" aria-label="padrão">●</span>}
        </button>
      ))}
    </div>
  );
  if (compacto) {
    return (
      <div className="flex flex-col items-start">
        {texto}
        {padrao && padrao !== modo && (
          <button type="button" onClick={onTornarPadrao} className="text-[11.5px] text-text-secondary underline underline-offset-2">
            tornar {modo === "orbita" ? "órbita" : "grade"} o padrão
          </button>
        )}
      </div>
    );
  }
  return <div className="mb-6 flex justify-center">{texto}</div>;
}

/** Quebra o texto do "Sobre" em parágrafos. Respeita as quebras que o dono
 * escreveu; se veio tudo num bloco só (comum quando a Orbi importa do site),
 * agrupa de 2 em 2 frases pra leitura respirar no celular. */
function paragrafosSobre(texto: string): string[] {
  const blocos = texto.split(/\n\s*\n|\n/).map((b) => b.trim()).filter(Boolean);
  if (blocos.length > 1) return blocos;
  const frases = texto.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map((f) => f.trim()).filter(Boolean) ?? [texto];
  if (frases.length <= 2) return [texto.trim()];
  const out: string[] = [];
  for (let i = 0; i < frases.length; i += 2) out.push(frases.slice(i, i + 2).join(" "));
  return out;
}
