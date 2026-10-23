"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { AbrirEditor } from "@/components/mobile/EditarNoLugar";
import { LapisDono } from "@/components/mobile/LapisDono";
import { createPortal } from "react-dom";
import { COR_DA_REDE, FUNDO_DA_REDE, IconeRede, type Rede } from "@/lib/redesSociais";
import { CartaoItem, type ItemCartao } from "./CartaoItem";
import { useArrastarOrdem } from "@/hooks/useArrastarOrdem";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { ORBI_SPHERE_COLORS, sizeOf } from "@/lib/showcase";

export type BolinhaVitrine = {
  key: string;
  rotulo: string;
  tipo: "whatsapp" | "endereco" | "site" | "rede" | "voucher" | "sobre" | "presente" | "cardapio" | "materiais" | "catalogo";
  rede?: Rede;
  endereco?: string;
  /** "cor" = bolinha cheia de cor; "linha" = minimalista, só contorno e ícone. */
  estilo: "cor" | "linha";
  /** Só as que vêm de um box podem ser editadas e reordenadas. */
  editavel: boolean;
  /** Cor escolhida pelo dono (só vale para as que não são logo de rede social). */
  cor?: string;
  /** Selinho pequeno sobre a bolinha, ex.: "oferta". */
  selo?: string;
  /** Logo escolhida pelo dono pra bolinha (no lugar do ícone padrão). */
  logo?: string | null;
  /** A imagem é a logo da marca: aparece inteira, sem cortar nas bordas do círculo. */
  logoInteira?: boolean;
  /** Quando a bolinha é um item do catálogo: para onde o lápis leva (editor do item). */
  editarHref?: string;
  /** Foto original do item (para voltar a ela depois de trocar a imagem). */
  fotoPadrao?: string | null;
  onClick: () => void;
};

export type ItemVitrine = ItemCartao;

export type BotaoPrincipal = "orbi" | "vitrine" | "whatsapp";

const BOTOES: Record<BotaoPrincipal, { titulo: string; texto: string }> = {
  orbi: { titulo: "Orbi", texto: "Convida a pessoa a perguntar qualquer coisa à IA da marca." },
  vitrine: { titulo: "Vitrine", texto: "Leva direto ao catálogo completo." },
  whatsapp: { titulo: "WhatsApp", texto: "Abre a conversa com você, sem intermediário." },
};

export type FormatoItens = "vitrine" | "destaque" | "grade" | "carrossel";

const FORMATOS: { v: FormatoItens; titulo: string; texto: string }[] = [
  { v: "vitrine", titulo: "Igual à vitrine", texto: "Cada item no tamanho que você escolheu no Catálogo (Grande, Largo, Pequeno ou Alto)." },
  { v: "destaque", titulo: "Um grande e o resto em grade", texto: "O primeiro item grande, os outros em duas colunas." },
  { v: "grade", titulo: "Grade", texto: "Todos do mesmo tamanho, duas colunas." },
  { v: "carrossel", titulo: "Carrossel", texto: "Uma linha que rola de lado. Ocupa pouca altura." },
];

const MINIMO_COM_FOTO = 2;
const MAXIMO = 6;

function Icone({ tipo, rede, linha }: { tipo: BolinhaVitrine["tipo"]; rede?: Rede; linha?: boolean }) {
  const p = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (tipo === "whatsapp" && linha) return <svg {...p}><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" /><path d="M9 8.5c-.3 1.6.8 3.6 2.4 5s3.3 2 4.6 1.6" /></svg>;
  if (tipo === "whatsapp") return <svg {...p} fill="currentColor" stroke="none"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" /></svg>;
  if (tipo === "endereco") return <svg {...p}><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>;
  if (tipo === "voucher") return <svg {...p}><path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 0 0-6V6H3Z" /><path d="M14 6v12" strokeDasharray="2 2.5" /></svg>;
  if (tipo === "presente") return <svg {...p}><rect x="3.5" y="8.5" width="17" height="4" rx="1" /><path d="M5 12.5V20h14v-7.5" /><path d="M12 8.5V20" /><path d="M12 8.5C10 8.5 8 7.8 8 6.2 8 4.9 9 4 10.1 4 11.4 4 12 5.2 12 8.5Zm0 0C14 8.5 16 7.8 16 6.2 16 4.9 15 4 13.9 4 12.6 4 12 5.2 12 8.5Z" /></svg>;
  if (tipo === "cardapio") return <svg {...p}><path d="M7 3v8a2 2 0 0 0 2 2v8" /><path d="M5 3v6a2 2 0 0 0 2 2" /><path d="M9 3v6" /><path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 6.5 0 2 1 3.2 3.5 3.5" /></svg>;
  if (tipo === "materiais") return <svg {...p}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 13h5M10 16.5h5" /></svg>;
  if (tipo === "catalogo") return <svg {...p}><rect x="4" y="4" width="7" height="7" rx="1.6" /><rect x="13" y="4" width="7" height="7" rx="1.6" /><rect x="4" y="13" width="7" height="7" rx="1.6" /><rect x="13" y="13" width="7" height="7" rx="1.6" /></svg>;
  if (tipo === "sobre") return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r="0.6" fill="currentColor" /></svg>;
  if (tipo === "rede" && rede) return <IconeRede rede={rede} size={24} />;
  return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z" /></svg>;
}

/** Cores que o dono pode escolher para as bolinhas que não são logo de marca. */
const CORES_BOLINHA = ["#111318", "#E8508A", "#3B5BDB", "#EA4335", "#F29D38", "#2FA36B", "#7B4FE0", "#0E9AA7"];

/** WhatsApp e redes sociais mantêm a cor da própria marca. */
const podeMudarCor = (b: BolinhaVitrine) => b.editavel && !b.editarHref && b.tipo !== "whatsapp" && b.tipo !== "rede";

function corDe(b: BolinhaVitrine): { fundo: string; sombra: string } {
  if (b.cor && b.tipo !== "whatsapp" && b.tipo !== "rede") return { fundo: b.cor, sombra: b.cor };
  if (b.tipo === "whatsapp") return { fundo: "#25D366", sombra: "#25D366" };
  if (b.tipo === "endereco") return { fundo: "#EA4335", sombra: "#EA4335" };
  if (b.tipo === "voucher") return { fundo: "#111318", sombra: "#111318" };
  if (b.tipo === "presente") return { fundo: "#E8508A", sombra: "#E8508A" };
  if (b.tipo === "sobre") return { fundo: "#3B5BDB", sombra: "#3B5BDB" };
  if (b.tipo === "cardapio") return { fundo: "#F29D38", sombra: "#F29D38" };
  if (b.tipo === "materiais") return { fundo: "#7B4FE0", sombra: "#7B4FE0" };
  if (b.tipo === "catalogo") return { fundo: "#0E9AA7", sombra: "#0E9AA7" };
  if (b.tipo === "rede" && b.rede) return { fundo: FUNDO_DA_REDE[b.rede], sombra: COR_DA_REDE[b.rede] };
  return { fundo: "#111318", sombra: "#111318" };
}

/**
 * Home em estilo Vitrine: bolinhas com nome no topo (estilo destaques do
 * Instagram), um botão principal e uma fileira curta de itens (com ou sem foto).
 * Os itens só aparecem com pelo menos 4 fotos, pra nunca ficar um buraco.
 */
export function HomeVitrine({
  bolinhas,
  ctaRotulo,
  ctaTipo,
  orbiAvatar,
  onPerguntar,
  opcoesCta,
  onCtaTipo,
  onCta,
  itens,
  tituloItens,
  onTitulo,
  destaque,
  slug,
  businessId,
  sessionId,
  extras,
  podeEditar,
  onReordenarItens,
  onEstilo,
  onCor,
  onReordenar,
  onRenomear,
  onEsconder,
  onSelo,
  onImagemItem,
  logoMarca,
  onAdicionar,
  formato,
  onFormato,
  itensEscolhidos,
  onEscolherItens,
}: {
  bolinhas: BolinhaVitrine[];
  ctaRotulo: string;
  ctaTipo: BotaoPrincipal;
  /** Bolinha da Orbi no começo da barra de pergunta. */
  orbiAvatar?: ReactNode;
  /** Chamado ao enviar a pergunta digitada na barra da Orbi. */
  onPerguntar: (pergunta: string) => void;
  opcoesCta: BotaoPrincipal[];
  /** Undefined quando não há onde guardar a escolha. */
  onCtaTipo?: (t: BotaoPrincipal) => void;
  onCta: () => void;
  itens: ItemVitrine[];
  tituloItens: string;
  /** Dono: salva o título da seção (vazio volta ao padrão, Destaque). */
  onTitulo?: (t: string) => void;
  /** Box destaque, fixado no topo da tela inicial. */
  destaque?: ReactNode;
  slug: string;
  businessId: string;
  sessionId: string | null;
  onVerTudo: (categoria: string | null) => void;
  /** Caminhos que não viram bolinha (Perguntar, Presentear, Sobre), em pílulas discretas. */
  extras: { key: string; rotulo: string; onClick: () => void }[];
  /** Dono fora do modo visitante: mostra o lápis das bolinhas. */
  podeEditar: boolean;
  onEstilo: (keys: string[], estilo: "cor" | "linha") => void;
  /** Escolhe (ou limpa, com null) a cor de uma bolinha que não é logo de rede social. */
  onCor?: (key: string, cor: string | null) => void;
  /** Nova ordem das bolinhas editáveis (chaves), depois de arrastar ou de usar as setas. */
  onReordenar: (chaves: string[]) => void;
  /** Muda o nome de uma bolinha editável. */
  onRenomear?: (key: string, nome: string) => void;
  /** Esconde uma bolinha editável (desliga o botão). */
  onEsconder?: (key: string) => void;
  /** Muda a etiqueta da bolinha de vouchers (vazio esconde). */
  onSelo?: (key: string, texto: string) => void;
  onImagemItem?: (key: string, url: string | null) => void;
  logoMarca?: string | null;
  /** Só o dono: abre a folha para adicionar um botão novo. */
  onAdicionar?: () => void;
  /** Só o dono: grava a ordem nova dos itens em destaque (ids na ordem final, só os visíveis). */
  onReordenarItens?: (ids: string[]) => void;
  ordemCategorias: string[];
  formato: FormatoItens;
  /** Undefined quando não há onde guardar a escolha (sem box da vitrine). */
  onFormato?: (f: FormatoItens) => void;
  /** Ids que o dono escolheu para a Home, na ordem. Null ou vazio: mostra as capas da vitrine. */
  itensEscolhidos?: string[] | null;
  /** Só o dono: guarda a escolha (null volta ao automático). Undefined quando não há onde guardar. */
  onEscolherItens?: (ids: string[] | null) => void;
}) {
  const [editandoFormato, setEditandoFormato] = useState(false);
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  const [busca, setBusca] = useState("");
  const [avisoCheio, setAvisoCheio] = useState(false);
  const [avisoNovo, setAvisoNovo] = useState<string | null>(null);
  const router = useRouter();

  /** Depois de criar um item pelo painel: publica (se já tem foto ou cor), põe nos destaques e descarta rascunho vazio. */
  async function aposCriarItem() {
    setAvisoNovo(null);
    const supabase = createClient();
    const desde = new Date(new Date().getTime() - 30 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("content_items")
      .select("id, title, status, image_url, gallery_urls, description, price, box_color")
      .eq("business_id", businessId)
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(1);
    const novo = data?.[0];
    if (!novo || itens.some((i) => i.id === novo.id)) return;
    const comFoto = !!novo.image_url || (Array.isArray(novo.gallery_urls) && novo.gallery_urls.length > 0);
    const vazio = novo.status === "draft" && novo.title === "Novo item" && !comFoto && !novo.description?.trim() && novo.price == null;
    if (vazio) {
      await supabase.from("content_items").delete().eq("id", novo.id).eq("status", "draft");
      return;
    }
    if (novo.status !== "published") await supabase.from("content_items").update({ status: "published" }).eq("id", novo.id);
    const atuais = naSelecao.map((e) => e.id);
    if (atuais.length >= MAXIMO) {
      setAvisoNovo(`"${novo.title}" foi criado, mas já são ${MAXIMO} itens na Home. Tire um e marque o novo.`);
    } else {
      onEscolherItens?.([...atuais, novo.id]);
      setAvisoNovo(`"${novo.title}" foi criado e entrou nos itens da Home.`);
    }
    router.refresh();
  }
  const [editandoCta, setEditandoCta] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [editando, setEditando] = useState(false);
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [enderecoAberto, setEnderecoAberto] = useState<string | null>(null);
  // Item sem foto também entra: o cartão vira um letreiro com o nome.
  const comFoto = itens;
  // Categorias do Catálogo viram cartões escolhíveis (id "cat:Nome"); tocar abre a categoria.
  const categoriasCartao: ItemVitrine[] = (() => {
    const vistas = new Map<string, ItemVitrine>();
    for (const i of [...itens].sort((a, b) => a.position - b.position)) {
      const nome = i.brand_label?.trim();
      if (!nome) continue;
      const atual = vistas.get(nome);
      if (atual) { if (!atual.image_url && i.image_url) { atual.image_url = i.image_url; atual.box_style = "foto"; } continue; }
      vistas.set(nome, {
        id: `cat:${nome}`, title: nome, description: null, price: null, price_type: null, price_max: null,
        image_url: i.image_url, brand_label: null, type: "product", position: i.position, layout_size: "medio",
        box_color: "neutro", footer_color: null, box_style: i.image_url ? "foto" : "cor", title_placement: "sobre",
        target_url: `/${slug}?tab=vitrine&cat=${encodeURIComponent(nome)}`, link_kind: "categoria-interna",
      });
    }
    return [...vistas.values()];
  })();
  const todosEscolhiveis = [...comFoto, ...categoriasCartao];
  const escolhidos = (itensEscolhidos ?? []).map((id) => todosEscolhiveis.find((i) => i.id === id)).filter((i): i is ItemVitrine => !!i).slice(0, MAXIMO);
  const personalizado = escolhidos.length > 0;
  // Sem escolha do dono, a Home mostra as capas da vitrine: os itens sem categoria (Rodízio, Buffet, Drinks...).
  // Os pratos de um cardápio importado, que têm categoria, ficam de fora. Sem nenhuma capa, vale a ordem do catálogo.
  const porPosicao = [...comFoto].sort((a, b) => a.position - b.position);
  const capas = porPosicao.filter((i) => !i.brand_label?.trim());
  const base = personalizado ? escolhidos : capas.length > 0 ? capas : porPosicao;
  const naSelecao = personalizado ? escolhidos : base.slice(0, MAXIMO);
  const mostrar = personalizado || comFoto.length >= MINIMO_COM_FOTO ? base.slice(0, MAXIMO) : [];

  function aoClicar(b: BolinhaVitrine) {
    if (b.tipo === "endereco" && b.endereco) {
      setEnderecoAberto((v) => (v === b.key ? null : b.key));
      return;
    }
    b.onClick();
  }

  const aberto = bolinhas.find((b) => b.key === enderecoAberto);

  const arrastoB = useArrastarOrdem(bolinhas.map((b) => b.key), podeEditar && !!onReordenar, (ord) => onReordenar?.(ord.filter((k) => bolinhas.find((b) => b.key === k)?.editavel)));
  const bolinhasNaOrdem = arrastoB.ordem.map((k) => bolinhas.find((b) => b.key === k)).filter((b): b is BolinhaVitrine => !!b);
  const arrastoI = useArrastarOrdem(mostrar.map((i) => i.id), podeEditar && !!onReordenarItens, (ids) => onReordenarItens?.(ids));
  const mostrarNaOrdem = arrastoI.ordem.map((id) => mostrar.find((i) => i.id === id)).filter((i): i is ItemVitrine => !!i);

  return (
    <div className="mt-8 flex w-full flex-col items-center">
      <div className="relative w-full max-w-[340px] lg:max-w-[480px]">
        {ctaTipo === "orbi" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onPerguntar(pergunta.trim());
            }}
            className="flex min-h-[56px] w-full items-center gap-3 rounded-full border-[1.5px] border-on-background/25 bg-transparent py-1.5 pl-3 pr-1.5 transition-colors focus-within:border-on-background/60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden>{orbiAvatar}</span>
            <input
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Pergunte o que quiser..."
              aria-label={ctaRotulo}
              enterKeyHint="send"
              // Tocar no campo vazio já abre a conversa, com as sugestões de tema na tela
              // antes de a pessoa digitar (e o campo de escrever lá embaixo).
              onFocus={(e) => { if (!pergunta.trim() && !podeEditar) { e.currentTarget.blur(); onPerguntar(""); } }}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-on-background outline-none placeholder:text-text-tertiary"
            />
            <button type="submit" aria-label="Enviar pergunta" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-on-background text-white transition-transform active:scale-95">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={onCta}
            className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-transform active:scale-[0.98] ${
              ctaTipo === "whatsapp"
                ? "bg-[#25D366] text-white shadow-[0_10px_24px_-10px_rgba(37,211,102,0.7)]"
                : "bg-button-primary text-white shadow-[0_10px_24px_-10px_rgba(17,19,24,0.5)]"
            }`}
          >
            {ctaRotulo}
          </button>
        )}
        {podeEditar && onCtaTipo && opcoesCta.length > 1 && (
          <button type="button" onClick={() => setEditandoCta(true)} aria-label="Escolher o botão principal" className="absolute -right-2 -top-3 flex h-8 w-8 items-center justify-center lapis-edita text-[15px] text-on-background/60">✎</button>
        )}
      </div>

      {editandoCta && montado && onCtaTipo && createPortal(
        <>
          <button type="button" aria-label="Fechar" onClick={() => setEditandoCta(false)} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
          <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-[440px] rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium">Botão principal</span>
              <button type="button" onClick={() => setEditandoCta(false)} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Concluir</button>
            </div>
            <div role="radiogroup" className="mt-4 flex flex-col gap-2">
              {opcoesCta.map((t) => (
                <button key={t} type="button" role="radio" aria-checked={ctaTipo === t} onClick={() => onCtaTipo(t)} className={`rounded-2xl border-2 p-3.5 text-left ${ctaTipo === t ? "border-on-background" : "border-divider"}`}>
                  <span className="block text-[14.5px] font-medium">{BOTOES[t].titulo}</span>
                  <span className="mt-0.5 block text-[13px] text-text-secondary">{BOTOES[t].texto}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body,
      )}

      {(bolinhas.length > 0 || (podeEditar && onAdicionar)) && (
        <div className="relative mt-7 w-full">
          {podeEditar && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              aria-label="Editar bolinhas"
              className="absolute -top-3 right-0 z-10 flex h-8 w-8 items-center justify-center lapis-edita text-[15px] text-on-background/60"
            >
              ✎
            </button>
          )}
          <div
            role="list"
            data-rolavel
            className="no-scrollbar relative -mx-6 flex w-[calc(100%+3rem)] snap-x snap-proximity scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 pt-2 [justify-content:safe_center] [mask-image:linear-gradient(to_right,transparent,#000_22px,#000_calc(100%-22px),transparent)]"
          >
            {bolinhasNaOrdem.map((b) => (
              <div
                key={b.key}
                ref={arrastoB.ref(b.key)}
                role="listitem"
                {...arrastoB.props(b.key, b.editavel)}
                className={`flex w-[72px] shrink-0 snap-center flex-col items-center transition-transform duration-150 ${arrastoB.pegado === b.key ? "z-20 scale-110 opacity-90" : ""}`}
              >
                <Bolinha b={b} aberto={enderecoAberto === b.key} onClick={() => aoClicar(b)} />
                <span className="mt-1.5 w-full truncate text-center text-[11.5px] leading-tight text-text-secondary">{b.rotulo}</span>
              </div>
            ))}
            {podeEditar && onAdicionar && (
              <div role="listitem" className="flex w-[72px] shrink-0 snap-center flex-col items-center">
                <button type="button" onClick={onAdicionar} aria-label="Adicionar botão" className="flex h-[60px] w-[60px] items-center justify-center rounded-full border-[1.5px] border-dashed border-on-background/35 text-[24px] text-text-secondary active:scale-95">＋</button>
                <span className="mt-1.5 w-full truncate text-center text-[11.5px] leading-tight text-text-tertiary">Adicionar</span>
              </div>
            )}
          </div>
        </div>
      )}

      {aberto?.endereco && (
        <div className="mt-4 w-full max-w-[320px] rounded-2xl bg-surface-white p-4 text-center shadow-[0_2px_12px_rgba(17,19,24,0.08)]">
          <p className="text-[13.5px] leading-snug text-text-secondary">{aberto.endereco}</p>
          <div className="mt-3 flex gap-2">
            <a href={`https://waze.com/ul?q=${encodeURIComponent(aberto.endereco)}&navigate=yes`} target="_blank" rel="noopener noreferrer" onClick={aberto.onClick} className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Waze</a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(aberto.endereco)}`} target="_blank" rel="noopener noreferrer" onClick={aberto.onClick} className="flex-1 rounded-full border border-divider py-2.5 text-center text-[14px] font-medium">Google Maps</a>
          </div>
        </div>
      )}

      {extras.length > 0 && (
        <nav aria-label="Mais caminhos" className="mt-4 flex w-full flex-wrap items-center justify-center gap-x-1 text-[13.5px] text-text-secondary">
          {extras.map((x, i) => (
            <span key={x.key} className="flex items-center">
              {i > 0 && <span aria-hidden className="mx-2 text-text-tertiary">·</span>}
              <button type="button" onClick={x.onClick} className="min-h-[40px] underline decoration-black/15 underline-offset-[5px] active:opacity-60">
                {x.rotulo}
              </button>
            </span>
          ))}
        </nav>
      )}

      {mostrar.length === 0 && <div className="mt-9 flex w-full flex-col items-center empty:hidden">{destaque}</div>}

      {mostrar.length > 0 && (
        <section className="mt-9 w-full" aria-label={tituloItens}>
          <div className="mb-5 flex w-full min-w-0 flex-col items-center empty:hidden">{destaque}</div>
          <div className="flex items-center justify-between gap-2">
            {podeEditar && onEscolherItens ? (
              <button type="button" onClick={() => setEscolhendo(true)} aria-label={`${tituloItens}: escolher e ordenar os itens da Home`} className="flex min-h-[40px] min-w-0 items-center gap-2 rounded-full text-left active:opacity-70">
                <h2 className="truncate font-[family-name:var(--font-manrope)] text-[17px] font-medium tracking-[-0.01em]">{tituloItens}</h2>
                <span className="shrink-0 text-[14px] text-on-background/60" aria-hidden>✎</span>
              </button>
            ) : (
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate font-[family-name:var(--font-manrope)] text-[17px] font-medium tracking-[-0.01em]">{tituloItens}</h2>
                {podeEditar && onTitulo && (
                  <button type="button" onClick={() => setEditandoTitulo(true)} aria-label="Editar o título desta seção" className="flex h-7 w-7 shrink-0 items-center justify-center lapis-edita text-[14px] text-on-background/60">✎</button>
                )}
              </div>
            )}
            <div className="flex items-center gap-1">
              {podeEditar && onFormato && !onEscolherItens && (
                <span className="text-[12px] text-text-tertiary">{FORMATOS.find((f) => f.v === formato)?.titulo}</span>
              )}
              {podeEditar && onFormato && (
                <button type="button" onClick={() => setEditandoFormato(true)} aria-label="Editar formato dos itens" className="flex h-8 w-8 items-center justify-center lapis-edita text-[15px] text-on-background/60">✎</button>
              )}
            </div>
          </div>
          {formato === "vitrine" ? (
            <ul className="relative mt-3 grid grid-flow-dense grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {mostrarNaOrdem.map((i) => {
                const tam = sizeOf(i.layout_size);
                const largo = tam === "destaque" || tam === "largo";
                return (
                  <li key={i.id} ref={arrastoI.ref(i.id)} {...arrastoI.props(i.id)} className={`relative transition-transform duration-150 ${largo ? "col-span-2" : ""} ${arrastoI.pegado === i.id ? "z-20 scale-[1.03] opacity-90" : ""}`}>
                    <CartaoItem origem="home" curtir={!podeEditar} item={i} slug={slug} businessId={businessId} sessionId={sessionId} largura="w-full" tamanho={tam} />
                    {podeEditar && !i.id.startsWith("cat:") && <LapisDono href={`/admin/vitrine/pagina/${i.id}`} rotulo={`Editar ${i.title}`} className="absolute left-2 top-2 z-10" />}
                  </li>
                );
              })}
            </ul>
          ) : formato === "carrossel" ? (
            <ul data-rolavel className="no-scrollbar relative -mx-6 mt-3 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2">
              {mostrarNaOrdem.map((i) => (
                <li key={i.id} ref={arrastoI.ref(i.id)} {...arrastoI.props(i.id)} className={`relative w-[72%] shrink-0 snap-center lg:w-[30%] transition-transform duration-150 ${arrastoI.pegado === i.id ? "z-20 scale-[1.03] opacity-90" : ""}`}>
                  <CartaoItem origem="home" curtir={!podeEditar} item={i} slug={slug} businessId={businessId} sessionId={sessionId} largura="w-full" tamanho="medio" proporcao="retrato" />
                    {podeEditar && !i.id.startsWith("cat:") && <LapisDono href={`/admin/vitrine/pagina/${i.id}`} rotulo={`Editar ${i.title}`} className="absolute left-2 top-2 z-10" />}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="relative mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {mostrarNaOrdem.map((i, n) => {
                const grande = formato === "destaque" && n === 0;
                return (
                  <li key={i.id} ref={arrastoI.ref(i.id)} {...arrastoI.props(i.id)} className={`relative transition-transform duration-150 ${grande ? "col-span-2" : ""} ${arrastoI.pegado === i.id ? "z-20 scale-[1.03] opacity-90" : ""}`}>
                    <CartaoItem origem="home" curtir={!podeEditar} item={i} slug={slug} businessId={businessId} sessionId={sessionId} largura="w-full" tamanho={grande ? "destaque" : "medio"} proporcao={grande ? "paisagem" : "quadrado"} />
                    {podeEditar && !i.id.startsWith("cat:") && <LapisDono href={`/admin/vitrine/pagina/${i.id}`} rotulo={`Editar ${i.title}`} className="absolute left-2 top-2 z-10" />}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {editandoTitulo && montado && onTitulo && createPortal(
        <>
          <button type="button" aria-label="Fechar" onClick={() => setEditandoTitulo(false)} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
          <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-[440px] rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium">Título da seção</span>
              <button type="button" onClick={() => setEditandoTitulo(false)} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Concluir</button>
            </div>
            <input
              defaultValue={tituloItens === "Destaque" ? "" : tituloItens}
              placeholder="Destaque"
              maxLength={40}
              autoFocus
              onBlur={(e) => { const v = e.target.value.trim(); if (v !== (tituloItens === "Destaque" ? "" : tituloItens)) onTitulo(v); }}
              className="mt-4 w-full rounded-2xl border border-divider px-4 py-3 text-[16px] outline-none focus:border-on-background"
            />
            <p className="mt-2 text-[13px] text-text-secondary">O padrão é Destaque. Você pode trocar por qualquer nome, como Nossas delícias ou Mais pedidos. Vazio volta ao padrão.</p>
          </div>
        </>,
        document.body,
      )}

      {escolhendo && montado && onEscolherItens && createPortal(
        <>
          <button type="button" aria-label="Fechar" onClick={() => setEscolhendo(false)} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
          <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[85vh] w-full max-w-[440px] flex-col rounded-t-[28px] bg-white p-5 pb-6 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
            <div className="flex shrink-0 items-center justify-between">
              <span className="text-[17px] font-medium">Itens da Home</span>
              <button type="button" onClick={() => { setEscolhendo(false); setBusca(""); }} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Concluir</button>
            </div>
            {onTitulo && (
              <label className="mt-3 block shrink-0">
                <span className="text-[12px] font-medium text-text-tertiary">Nome da seção</span>
                <input
                  defaultValue={tituloItens === "Destaque" ? "" : tituloItens}
                  placeholder="Destaque"
                  maxLength={40}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v !== (tituloItens === "Destaque" ? "" : tituloItens)) onTitulo(v); }}
                  className="mt-1 w-full rounded-2xl border border-divider px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
                />
              </label>
            )}
            <p className="mt-1 shrink-0 text-[13px] text-text-secondary">
              {personalizado
                ? `Você escolheu ${escolhidos.length} de ${MAXIMO}. Toque num item para tirar ou para colocar outro.`
                : `Estes são os itens que a Home mostra agora, as capas da vitrine. Toque para tirar ou trocar, até ${MAXIMO}.`}
            </p>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar item"
              className="mt-3 w-full shrink-0 rounded-full border border-divider px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
            />
            <p className="mt-2 shrink-0 text-[14px] leading-snug text-text-secondary">Só itens publicados aparecem aqui. Se o seu item não está na lista, ele deve estar em rascunho: publique no Catálogo.</p>
            <AbrirEditor
              href="/admin/vitrine?novo=1"
              rotulo="Criar item"
              aoFechar={() => void aposCriarItem()}
              className="mt-3 flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-surface-soft text-[14px] font-medium active:scale-[0.98]"
            >
              <span className="text-[18px] leading-none" aria-hidden>+</span> Não achou? Criar um item novo
            </AbrirEditor>
            {avisoNovo && <p role="status" className="mt-2 shrink-0 rounded-xl bg-surface-soft px-3 py-2 text-[13px] text-text-secondary">{avisoNovo}</p>}
            {avisoCheio && <p role="status" className="mt-2 shrink-0 rounded-xl bg-surface-soft px-3 py-2 text-[13px] text-text-secondary">Já são {MAXIMO} itens. Toque num dos marcados para tirar e depois escolha outro.</p>}
            <ul className="mt-3 min-h-0 flex-1 overflow-y-auto">
              {(() => {
                const termo = busca.trim().toLowerCase();
                const filtrados = todosEscolhiveis.filter((i) => i.title.toLowerCase().includes(termo));
                const marcados = naSelecao.map((e) => filtrados.find((i) => i.id === e.id)).filter((i): i is ItemVitrine => !!i);
                const outros = filtrados.filter((i) => !i.id.startsWith("cat:") && !naSelecao.some((e) => e.id === i.id));
                const outrasCategorias = filtrados.filter((i) => i.id.startsWith("cat:") && !naSelecao.some((e) => e.id === i.id));
                const linha = (i: ItemVitrine) => {
                  const ordem = naSelecao.findIndex((e) => e.id === i.id);
                  const marcado = ordem >= 0;
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        aria-pressed={marcado}
                        onClick={() => {
                          const atuais = naSelecao.map((e) => e.id);
                          if (!marcado && atuais.length >= MAXIMO) { setAvisoCheio(true); return; }
                          setAvisoCheio(false);
                          const novos = marcado ? atuais.filter((id) => id !== i.id) : [...atuais, i.id];
                          onEscolherItens(novos.length > 0 ? novos : null);
                        }}
                        className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-1 py-1.5 text-left"
                      >
                        {i.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.image_url} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <span className="h-11 w-11 shrink-0 rounded-xl bg-surface-soft" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-medium">{i.title}</span>
                          {i.id.startsWith("cat:") ? <span className="block truncate text-[12px] text-text-tertiary">Categoria do Catálogo</span> : i.brand_label?.trim() && <span className="block truncate text-[12px] text-text-tertiary">{i.brand_label.trim()}</span>}
                        </span>
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium ${marcado ? "bg-on-background text-white" : "border border-divider text-transparent"}`}>
                          {marcado ? ordem + 1 : ""}
                        </span>
                      </button>
                    </li>
                  );
                };
                return (
                  <>
                    {marcados.length > 0 && <li className="px-1 pb-1 pt-1 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Na Home agora</li>}
                    {marcados.map(linha)}
                    {marcados.length > 0 && outros.length > 0 && <li className="px-1 pb-1 pt-4 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Outros itens</li>}
                    {outros.map(linha)}
                    {outrasCategorias.length > 0 && <li className="px-1 pb-1 pt-4 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Categorias do Catálogo</li>}
                    {outrasCategorias.map(linha)}
                  </>
                );
              })()}
            </ul>
            {personalizado && (
              <button type="button" onClick={() => onEscolherItens(null)} className="mt-3 min-h-[44px] w-full shrink-0 rounded-full border border-divider text-[14px] font-medium active:scale-[0.98]">
                Voltar ao automático (capas da vitrine)
              </button>
            )}
          </div>
        </>,
        document.body,
      )}

      {editandoFormato && montado && onFormato && createPortal(
        <>
          <button type="button" aria-label="Fechar" onClick={() => setEditandoFormato(false)} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
          <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-[440px] rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium">Formato dos itens</span>
              <button type="button" onClick={() => setEditandoFormato(false)} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Concluir</button>
            </div>
            <div role="radiogroup" className="mt-4 flex flex-col gap-2">
              {FORMATOS.map((f) => (
                <button key={f.v} type="button" role="radio" aria-checked={formato === f.v} onClick={() => onFormato(f.v)} className={`rounded-2xl border-2 p-3.5 text-left ${formato === f.v ? "border-on-background" : "border-divider"}`}>
                  <span className="block text-[14.5px] font-medium">{f.titulo}</span>
                  <span className="mt-0.5 block text-[13px] text-text-secondary">{f.texto}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body,
      )}

      {editando && montado && createPortal(
        <>
          <button type="button" aria-label="Fechar" onClick={() => setEditando(false)} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
          <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium">Editar bolinhas</span>
              <button type="button" onClick={() => setEditando(false)} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Concluir</button>
            </div>
            <p className="mt-1 text-[13px] text-text-secondary">Deixe em cor as que você quer destacar e as outras em linha. Use as setas para mudar a ordem.</p>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-soft p-3">
              <span className="text-[13.5px] font-medium">Todas</span>
              <Seletor valor={null} onChange={(e) => onEstilo(bolinhas.filter((x) => x.editavel).map((x) => x.key), e)} />
            </div>
            <ListaBolinhas bolinhas={bolinhas} onEstilo={onEstilo} onCor={onCor} onReordenar={onReordenar} onRenomear={onRenomear} onEsconder={onEsconder} onSelo={onSelo} onImagemItem={onImagemItem} logoMarca={logoMarca} businessId={businessId} />
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

/** Lista da folha "Editar bolinhas": estilo por bolinha e ordem, arrastando pela alça ou pelas setas. */
function ListaBolinhas({
  bolinhas,
  onEstilo,
  onCor,
  onReordenar,
  onRenomear,
  onEsconder,
  onSelo,
  onImagemItem,
  logoMarca,
  businessId,
}: {
  bolinhas: BolinhaVitrine[];
  onEstilo: (keys: string[], estilo: "cor" | "linha") => void;
  onCor?: (key: string, cor: string | null) => void;
  onReordenar: (chaves: string[]) => void;
  onRenomear?: (key: string, nome: string) => void;
  onEsconder?: (key: string) => void;
  onSelo?: (key: string, texto: string) => void;
  onImagemItem?: (key: string, url: string | null) => void;
  logoMarca?: string | null;
  businessId: string;
}) {
  const [trocandoImagem, setTrocandoImagem] = useState<string | null>(null);
  const [enviarNova, setEnviarNova] = useState(false);
  const itens = useRef<(HTMLLIElement | null)[]>([]);
  const [arrasto, setArrasto] = useState<{ de: number; para: number; dy: number; altura: number } | null>(null);
  const inicio = useRef<{ y: number; centros: number[] } | null>(null);
  // Qual bolinha está com a paleta completa aberta.
  const [maisCores, setMaisCores] = useState<string | null>(null);

  function aplicar(de: number, para: number) {
    if (de === para) return;
    const ordem = bolinhas.map((x) => x.key);
    const [k] = ordem.splice(de, 1);
    ordem.splice(para, 0, k);
    onReordenar(ordem.filter((chave) => bolinhas.find((x) => x.key === chave)?.editavel));
  }

  function comecar(e: React.PointerEvent<HTMLButtonElement>, i: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const centros = itens.current.map((el) => (el ? el.getBoundingClientRect().top + el.offsetHeight / 2 : 0));
    inicio.current = { y: e.clientY, centros };
    setArrasto({ de: i, para: i, dy: 0, altura: (itens.current[i]?.offsetHeight ?? 60) + 8 });
  }
  function mover(e: React.PointerEvent<HTMLButtonElement>) {
    const ini = inicio.current;
    if (!ini || !arrasto) return;
    const dy = e.clientY - ini.y;
    const centro = ini.centros[arrasto.de] + dy;
    let para = arrasto.de;
    ini.centros.forEach((c, j) => {
      if (j < arrasto.de && centro < c) para = Math.min(para, j);
      if (j > arrasto.de && centro > c) para = Math.max(para, j);
    });
    setArrasto({ ...arrasto, dy, para });
  }
  function soltar() {
    if (arrasto) aplicar(arrasto.de, arrasto.para);
    inicio.current = null;
    setArrasto(null);
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {bolinhas.map((b, i) => {
        let ty = 0;
        if (arrasto) {
          if (i === arrasto.de) ty = arrasto.dy;
          else if (arrasto.de < arrasto.para && i > arrasto.de && i <= arrasto.para) ty = -arrasto.altura;
          else if (arrasto.de > arrasto.para && i < arrasto.de && i >= arrasto.para) ty = arrasto.altura;
        }
        const arrastando = arrasto?.de === i;
        return (
          <li
            key={b.key}
            ref={(el) => { itens.current[i] = el; }}
            style={{ transform: ty ? `translateY(${ty}px)` : undefined, transition: arrastando ? "none" : "transform .18s ease" }}
            className={`relative flex flex-wrap items-center gap-2.5 rounded-2xl border bg-white p-2.5 ${arrastando ? "z-10 border-on-background/40 shadow-[0_8px_24px_rgba(17,19,24,0.18)]" : "border-divider"}`}
          >
            {b.editavel ? (
              <button
                type="button"
                aria-label={`Arrastar ${b.rotulo}`}
                onPointerDown={(e) => comecar(e, i)}
                onPointerMove={mover}
                onPointerUp={soltar}
                onPointerCancel={soltar}
                className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-text-tertiary active:cursor-grabbing"
              >
                <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden><circle cx="4" cy="4" r="1.5" /><circle cx="10" cy="4" r="1.5" /><circle cx="4" cy="9" r="1.5" /><circle cx="10" cy="9" r="1.5" /><circle cx="4" cy="14" r="1.5" /><circle cx="10" cy="14" r="1.5" /></svg>
              </button>
            ) : (
              <span className="w-7 shrink-0" />
            )}
            <div className="relative -mr-3.5 w-[60px] shrink-0">
              <div className="origin-left scale-[0.7]"><Bolinha b={b} aberto={false} onClick={() => {}} /></div>
              {b.editavel && (
                <AbrirEditor
                  href={b.editarHref ?? `/admin/boxes?box=${b.key}#box-${b.key}`}
                  rotulo={b.editarHref ? "Editar a foto e o item" : "Trocar o ícone ou logo"}
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-divider bg-surface-white text-[11px] text-text-secondary shadow-sm active:scale-90"
                >
                  ✎
                </AbrirEditor>
              )}
            </div>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{b.rotulo}</span>
            {b.editavel ? (
              <>
                {onCor && podeMudarCor(b) && b.estilo === "cor" && (
                  <button
                    type="button"
                    aria-label="Escolher a cor"
                    aria-expanded={maisCores === b.key}
                    onClick={() => setMaisCores(maisCores === b.key ? null : b.key)}
                    className={`h-8 w-8 shrink-0 rounded-full ${maisCores === b.key ? "ring-2 ring-on-background ring-offset-2" : "ring-1 ring-black/10"}`}
                    style={{ background: "conic-gradient(#EA4335, #F29D38, #F2D338, #2FA36B, #0E9AA7, #3B5BDB, #7B4FE0, #E8508A, #EA4335)" }}
                  />
                )}
                {!b.editarHref && <Seletor valor={b.estilo} onChange={(e) => onEstilo([b.key], e)} />}
                <div className="flex flex-col">
                  <button type="button" aria-label={`Subir ${b.rotulo}`} disabled={i === 0} onClick={() => aplicar(i, i - 1)} className="flex h-[22px] w-7 items-center justify-center text-[13px] text-text-secondary disabled:opacity-25">▲</button>
                  <button type="button" aria-label={`Descer ${b.rotulo}`} disabled={i === bolinhas.length - 1} onClick={() => aplicar(i, i + 1)} className="flex h-[22px] w-7 items-center justify-center text-[13px] text-text-secondary disabled:opacity-25">▼</button>
                </div>
              </>
            ) : (
              <span className="text-[12px] text-text-tertiary">automática</span>
            )}
            {b.editavel && (onRenomear || onEsconder) && (
              <div className="flex basis-full items-center gap-2 pl-[38px]">
                {onRenomear && !b.editarHref && (
                  <input
                    key={`${b.key}-${b.rotulo}`}
                    defaultValue={b.rotulo}
                    maxLength={24}
                    aria-label={`Nome de ${b.rotulo}`}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== b.rotulo) onRenomear(b.key, v); }}
                    className="min-h-[40px] min-w-0 flex-1 rounded-full border border-divider bg-surface-white px-4 text-[14px] outline-none focus:border-on-background"
                  />
                )}
                {b.editarHref && onImagemItem && (
                  <button
                    type="button"
                    aria-expanded={trocandoImagem === b.key}
                    onClick={() => { setTrocandoImagem(trocandoImagem === b.key ? null : b.key); setEnviarNova(false); }}
                    className="flex min-h-[40px] shrink-0 items-center rounded-full bg-surface-soft px-3.5 text-[13px] font-medium active:scale-[0.97]"
                  >
                    Trocar ícone
                  </button>
                )}
                {onEsconder && (
                  <button
                    type="button"
                    onClick={() => { if (window.confirm(b.editarHref ? `Tirar "${b.rotulo}" das bolinhas? O item continua no catálogo.` : `Esconder "${b.rotulo}" da tela inicial? Você pode religar em Botões.`)) onEsconder(b.key); }}
                    className="min-h-[40px] shrink-0 rounded-full px-3.5 text-[13px] font-medium text-red-600 active:opacity-60"
                  >
                    {b.editarHref ? "Tirar da fileira" : "Esconder"}
                  </button>
                )}
              </div>
            )}
            {b.editarHref && onImagemItem && trocandoImagem === b.key && (
              <div className="basis-full pl-[38px]">
                <p className="text-[12.5px] font-medium text-text-secondary">Imagem da bolinha</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {[
                    { url: null as string | null, img: b.fotoPadrao ?? null, nome: "Foto do item" },
                    ...(logoMarca ? [{ url: logoMarca as string | null, img: logoMarca as string | null, nome: "Logo da marca" }] : []),
                  ].map((o) => {
                    const ativa = o.url === null ? b.logo === (b.fotoPadrao ?? null) : b.logo === o.url;
                    return (
                      <button key={o.nome} type="button" aria-label={o.nome} aria-pressed={ativa} onClick={() => onImagemItem(b.key, o.url)} className={`flex flex-col items-center gap-1 rounded-2xl p-1 text-[11px] text-text-secondary ${ativa ? "ring-2 ring-on-background" : "ring-1 ring-divider"}`}>
                        <span className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full ${o.url && o.url === logoMarca ? "bg-[#F4F3EF]" : "bg-surface-soft"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {o.img && <img src={o.img} alt="" className={o.url && o.url === logoMarca ? "h-[70%] w-[70%] object-contain" : "h-full w-full object-cover"} />}
                        </span>
                        {o.nome}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setEnviarNova((v) => !v)} aria-expanded={enviarNova} aria-label="Enviar outra imagem" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-divider text-[20px] text-text-tertiary active:scale-95">+</button>
                </div>
                {enviarNova && (
                  <div className="mt-2 rounded-2xl border border-divider p-3">
                    <ImageUpload
                      value={null}
                      businessId={businessId}
                      lockedRatio="quadrado"
                      promptKind="avatar"
                      onChange={(url) => { if (!url) return; onImagemItem(b.key, url); setEnviarNova(false); }}
                    />
                  </div>
                )}
                <AbrirEditor href={b.editarHref} rotulo="Editar o item" className="mt-2 inline-flex min-h-[36px] items-center rounded-full px-1 text-[12.5px] font-medium text-text-secondary underline underline-offset-2">
                  Editar o item
                </AbrirEditor>
              </div>
            )}
            {b.editavel && onSelo && b.tipo === "voucher" && (
              <div className="basis-full pl-[38px]">
                <p className="text-[12.5px] font-medium text-text-secondary">Etiqueta que vibra sobre a bolinha</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["Oferta", "Promo", "Off", "Sale", "Brinde", "Cortesia", "Só hoje"].map((t) => {
                    const on = (b.selo ?? "").toLowerCase() === t.toLowerCase();
                    return (
                      <button key={t} type="button" aria-pressed={on} onClick={() => onSelo(b.key, t)} className={`min-h-[36px] rounded-full px-3.5 text-[13px] font-medium active:scale-[0.97] ${on ? "bg-on-background text-white" : "border border-divider bg-surface-white text-text-secondary"}`}>
                        {t}
                      </button>
                    );
                  })}
                  <button type="button" aria-pressed={!b.selo} onClick={() => onSelo(b.key, "")} className={`min-h-[36px] rounded-full px-3.5 text-[13px] font-medium active:scale-[0.97] ${!b.selo ? "bg-on-background text-white" : "border border-divider bg-surface-white text-text-secondary"}`}>
                    Sem etiqueta
                  </button>
                </div>
                <input
                  key={`${b.key}-${b.selo ?? ""}`}
                  defaultValue={b.selo ?? ""}
                  maxLength={10}
                  placeholder="Ou escreva a sua"
                  aria-label="Texto da etiqueta"
                  onBlur={(e) => { const v = e.target.value.trim(); if (v !== (b.selo ?? "")) onSelo(b.key, v); }}
                  className="mt-2 min-h-[40px] w-full rounded-full border border-divider bg-surface-white px-4 text-[14px] outline-none focus:border-on-background"
                />
              </div>
            )}
            {onCor && podeMudarCor(b) && b.estilo === "cor" && maisCores === b.key && (
              <div className="basis-full pl-[38px]">
                <div role="group" aria-label={`Cor de ${b.rotulo}`} className="flex flex-wrap items-center gap-2">
                  {CORES_BOLINHA.map((c) => {
                    const atual = (b.cor ?? corDe({ ...b, cor: undefined }).fundo).toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Usar a cor ${c}`}
                        aria-pressed={atual}
                        onClick={() => onCor(b.key, c)}
                        className={`h-8 w-8 rounded-full ${atual ? "ring-2 ring-on-background ring-offset-2" : "ring-1 ring-black/10"}`}
                        style={{ backgroundColor: c }}
                      />
                    );
                  })}
                  {b.cor && (
                    <button type="button" onClick={() => onCor(b.key, null)} className="min-h-[32px] rounded-full px-2.5 text-[12.5px] text-text-secondary underline underline-offset-4">
                      Cor original
                    </button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-8 gap-2">
                  {ORBI_SPHERE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      aria-label={c.label}
                      title={c.label}
                      aria-pressed={b.cor?.toLowerCase() === c.hex.toLowerCase()}
                      onClick={() => onCor(b.key, c.hex)}
                      className={`aspect-square rounded-full ${b.cor?.toLowerCase() === c.hex.toLowerCase() ? "ring-2 ring-on-background ring-offset-1" : "ring-1 ring-black/10"}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
                <label className="mt-3 flex min-h-[44px] items-center gap-3 text-[13px] text-text-secondary">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(b.cor ?? "") ? (b.cor as string) : corDe({ ...b, cor: undefined }).fundo}
                    onChange={(e) => onCor(b.key, e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-divider bg-transparent p-0.5"
                    aria-label="Escolher outra cor"
                  />
                  Outra cor, qualquer tom
                </label>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Bolinha({ b, aberto, onClick }: { b: BolinhaVitrine; aberto: boolean; onClick: () => void }) {
  const c = corDe(b);
  const linha = b.estilo === "linha";
  // Presente: só o desenho, sem círculo de fundo, balançando de leve de tempos em tempos.
  if (b.tipo === "presente" && !b.logo) {
    return (
      <button type="button" onClick={onClick} aria-label={b.rotulo} className="relative flex h-[60px] w-[60px] items-center justify-center text-on-background active:scale-95">
        <svg width="46" height="46" viewBox="0 0 24 24" className="presente-treme" aria-hidden>
          <rect x="2" y="8.5" width="20" height="4" rx="1.6" fill="currentColor" />
          <path d="M4 14h6.6v7H6a2 2 0 0 1-2-2z" fill="currentColor" />
          <path d="M13.4 14H20v5a2 2 0 0 1-2 2h-4.6z" fill="currentColor" />
          <path d="M12 8.5C10 8.5 7.6 8 7.6 6c0-1.3 1-2.2 2.1-2.2C11 3.8 12 6.3 12 8.5zM12 8.5c2 0 4.4-.5 4.4-2.5 0-1.3-1-2.2-2.1-2.2C13 3.8 12 6.3 12 8.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={b.rotulo}
      aria-expanded={b.tipo === "endereco" ? aberto : undefined}
      style={(linha ? {} : { background: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 48%), ${c.fundo}`, boxShadow: `inset 0 -7px 12px -5px rgba(0,0,0,0.22), inset 0 1.5px 2px rgba(255,255,255,0.28), 0 6px 16px -6px ${c.sombra}99` }) as CSSProperties}
      className={`relative flex h-[60px] w-[60px] items-center justify-center rounded-full transition-transform active:scale-95 ${linha ? "border-[1.5px] border-on-background/70 bg-transparent text-on-background" : "text-white"}`}
    >
      {b.logo && !/^(https?:|\/|data:|blob:)/.test(b.logo) ? (
        // Ícone escolhido na biblioteca (emoji), em vez de imagem.
        <span aria-hidden className={`pointer-events-none select-none text-[30px] leading-none ${linha ? "grayscale" : ""}`}>{b.logo}</span>
      ) : b.logo && b.logoInteira ? (
        // Logo da marca: mostra inteira (o quadrado cabe dentro do círculo), em fundo claro.
        <span className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#F4F3EF]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.logo} alt="" draggable={false} style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", ...(linha ? { filter: "grayscale(1) contrast(1.15)" } : {}) }} className="h-[70%] w-[70%] object-contain" />
        </span>
      ) : b.logo ? (
        // Com uma cor escolhida, o logo fica um pouco menor para a cor aparecer em volta.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.logo} alt="" draggable={false} style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", ...(linha ? { filter: "grayscale(1) contrast(1.15)" } : {}) }} className={`pointer-events-none h-full w-full rounded-full object-cover ${linha ? "p-[3px]" : b.cor ? "p-[9px]" : ""}`} />
      ) : (
        <Icone tipo={b.tipo} rede={b.rede} linha={linha} />
      )}
      {b.selo && (
        <span className="selo-vibra absolute -right-3 -top-1 whitespace-nowrap rounded-full bg-[#FF5A36] px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow">
          {b.selo}
        </span>
      )}
    </button>
  );
}

function Seletor({ valor, onChange }: { valor: "cor" | "linha" | null; onChange: (e: "cor" | "linha") => void }) {
  return (
    <div role="radiogroup" className="flex rounded-full bg-surface-soft p-0.5 text-[12.5px]">
      {(["cor", "linha"] as const).map((e) => (
        <button
          key={e}
          type="button"
          role="radio"
          aria-checked={valor === e}
          onClick={() => onChange(e)}
          className={`min-h-[34px] rounded-full px-3.5 font-medium ${valor === e ? "bg-on-background text-white" : "text-text-secondary"}`}
        >
          {e === "cor" ? "Cor" : "Linha"}
        </button>
      ))}
    </div>
  );
}
