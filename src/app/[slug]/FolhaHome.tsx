"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirPdf } from "@/lib/comprimirPdf";
import { AbrirEditor } from "@/components/mobile/EditarNoLugar";
import { IconeBotao } from "./IconeBotao";

export type Posicao = "escondido" | "bolinha" | "destaque";

export type LinhaHome = {
  id: string;
  tipo: "botao" | "voucher" | "item";
  titulo: string;
  sub: string;
  foto: string | null;
  icone?: string;
  cor?: string;
  pos: Posicao;
  /** Botões que não existem como box (ex.: atalho de WhatsApp) não podem ser escondidos. */
  semEscondido?: boolean;
};

export type NovoBox = {
  nome: string;
  config: { label: string; subtitle?: string; icon: string; action: "whatsapp" | "endereco" | "avaliar" | "cupom" | "link"; url?: string; color: string };
};

/** Coisa que ainda não existe e se monta em tela própria (Cardápio, Delivery, Materiais). */
export type CriarEm = { id: string; titulo: string; texto: string; href: string };

type Preset = {
  id: string;
  titulo: string;
  texto: string;
  nome: string;
  icon: string;
  action: NovoBox["config"]["action"];
  subtitle?: string;
  campo?: { rotulo: string; dica: string; inicial: string };
  pedeNome?: boolean;
};

const POSICOES: { v: Posicao; r: string }[] = [
  { v: "escondido", r: "Escondido" },
  { v: "bolinha", r: "Bolinha" },
  { v: "destaque", r: "Tag" },
];

/**
 * Uma folha só para decidir o que aparece na página: cada item pode ficar
 * escondido, virar bolinha ou ir para o destaque. Os dois botões de "+" da
 * Home abrem esta mesma folha; só muda a posição que já vem marcada.
 */
export function FolhaHome({
  posicaoInicial,
  onFechar,
  businessId,
  botoes,
  itens,
  vouchersDestaque,
  criarEm,
  avisos,
  whatsappInicial,
  enderecoInicial,
  onMudar,
  onCriarBox,
  onPdfPronto,
  onGiftFechado,
  gratis,
  avisoGratis,
}: {
  posicaoInicial: "bolinha" | "destaque";
  onFechar: () => void;
  businessId: string;
  botoes: LinhaHome[];
  itens: LinhaHome[];
  vouchersDestaque: string[];
  criarEm: CriarEm[];
  /** Coisas ligadas que mesmo assim não aparecem para o visitante, com o motivo. */
  avisos: { id: string; titulo: string; texto: string; href: string }[];
  whatsappInicial: string;
  enderecoInicial: string;
  onMudar: (l: LinhaHome, pos: Posicao) => void;
  onCriarBox: (b: NovoBox, pos: "bolinha" | "destaque") => Promise<boolean>;
  onPdfPronto: (id: string, pos: "bolinha" | "destaque") => void;
  /** Fechou a tela do Gift card: liga o botão Presentear onde a pessoa escolheu. */
  onGiftFechado: (pos: "bolinha" | "destaque") => void;
  /** Plano grátis: sem voucher, gift e PDF, e com limite de bolinhas e boxes. */
  gratis?: boolean;
  avisoGratis?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [vouchers, setVouchers] = useState<LinhaHome[]>([]);
  const [recarga, setRecarga] = useState(0);
  const [rascunhos, setRascunhos] = useState<LinhaHome[]>([]);
  const [vista, setVista] = useState<"lista" | "novo" | "form" | "pdf">("lista");
  const [onde, setOnde] = useState<"bolinha" | "destaque">(posicaoInicial);
  const mudar = (l: LinhaHome, pos: Posicao) => {
    onMudar(l, pos);
  };
  const [criandoBotoes, setCriandoBotoes] = useState(false);
  async function criarBotoesProntos() {
    setCriandoBotoes(true);
    try {
      await fetch("/api/comecar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "botoes" }) });
      router.refresh();
    } finally {
      setCriandoBotoes(false);
    }
  }
  const [escolhido, setEscolhido] = useState<Preset | null>(null);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const arquivoPdf = useRef<HTMLInputElement>(null);
  const [nomePdf, setNomePdf] = useState("");
  const [filePdf, setFilePdf] = useState<File | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("vouchers")
        .select("id, title, description, image_url, discount_type")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      const { data: rasc } = await supabase
        .from("content_items")
        .select("id, title, image_url, description, price")
        .eq("business_id", businessId)
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!vivo) return;
      // Rascunho em branco (criado e abandonado) não vale a pena mostrar.
      setRascunhos((rasc ?? []).filter((r) => !(r.title === "Novo item" && !r.image_url && !((r.description as string | null) ?? "").trim() && r.price == null)).map((r) => ({ id: r.id as string, tipo: "item" as const, titulo: (r.title as string) || "Sem nome", sub: "Rascunho, não aparece na página", foto: (r.image_url as string | null) ?? null, pos: "escondido" as Posicao })));
      setVouchers((data ?? []).map((v) => ({ id: v.id as string, tipo: "voucher" as const, titulo: v.title as string, sub: v.discount_type === "gift" ? "Brinde" : ((v.description as string | null) ?? "Voucher"), foto: (v.image_url as string | null) ?? null, pos: "bolinha" as Posicao })));
    })();
    return () => {
      vivo = false;
    };
  }, [supabase, businessId, recarga]);

  const presets: Preset[] = [
    { id: "zap", titulo: "WhatsApp", texto: "Conversa direta", nome: "Fale no WhatsApp", icon: "__wadisc__", action: "whatsapp", subtitle: "Atendimento rápido", campo: { rotulo: "Número com DDD", dica: "11 99999-9999", inicial: whatsappInicial } },
    { id: "link", titulo: "Instagram ou site", texto: "Cole o link", nome: "", icon: "◆", action: "link", pedeNome: true, campo: { rotulo: "Link", dica: "instagram.com/seunegocio", inicial: "" } },
    { id: "end", titulo: "Endereço", texto: "Waze e Maps", nome: "Como chegar", icon: "__pin__", action: "endereco", subtitle: "Veja no mapa", campo: { rotulo: "Endereço", dica: "Rua, número, cidade", inicial: enderecoInicial } },
    { id: "av", titulo: "Avaliação no Google", texto: "Pede as estrelas", nome: "Avalie no Google", icon: "__google__", action: "avaliar", subtitle: "Deixe sua nota, leva 10 segundos", campo: { rotulo: "Link da sua avaliação no Google", dica: "g.page/r/...", inicial: "" } },
  ];

  function escolher(p: Preset) {
    setEscolhido(p);
    setNome(p.nome);
    setValor(p.campo?.inicial ?? "");
    setErro(null);
    setVista("form");
  }

  async function adicionar() {
    if (!escolhido) return;
    const n = nome.trim();
    if (!n) return setErro("Dê um nome ao botão.");
    if (escolhido.campo && !valor.trim()) return setErro(`Preencha: ${escolhido.campo.rotulo.toLowerCase()}.`);
    setSalvando(true);
    const ok = await onCriarBox({ nome: n, config: { label: n, subtitle: escolhido.subtitle, icon: escolhido.icon, action: escolhido.action, url: escolhido.campo ? valor.trim() : "", color: "transparent" } }, onde);
    setSalvando(false);
    if (ok) {
      setEscolhido(null);
      setVista("lista");
    } else setErro("Não foi possível adicionar. Tente de novo.");
  }

  async function publicar(id: string) {
    const { error } = await supabase.from("content_items").update({ status: "published" }).eq("id", id);
    if (!error) {
      setRascunhos((r) => r.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  async function criarPdf() {
    const n = nomePdf.trim();
    if (!n || !filePdf || salvando) return;
    setErro(null);
    setSalvando(true);
    try {
      let arq = filePdf;
      if (arq.size > 5 * 1024 * 1024) {
        try { const menor = await comprimirPdf(arq, 4.5 * 1024 * 1024); if (menor && menor.size < arq.size) arq = menor; } catch { /* segue com o original */ }
      }
      if (arq.size > 10 * 1024 * 1024) { setErro("O PDF passou de 10 MB. Reduza o arquivo e tente de novo."); return; }
      const caminho = `${businessId}/botao-${new Date().getTime()}.pdf`;
      const { error: errUp } = await supabase.storage.from("cardapios-pdf").upload(caminho, arq, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
      if (errUp) { setErro("Não consegui enviar o PDF. Tente de novo."); return; }
      const url = supabase.storage.from("cardapios-pdf").getPublicUrl(caminho).data.publicUrl;
      const { data: ult } = await supabase.from("smart_boxes").select("position").eq("business_id", businessId).order("position", { ascending: false }).limit(1);
      const posicao = (ult?.[0]?.position ?? -1) + 1;
      const { data: caixa, error } = await supabase
        .from("smart_boxes")
        .insert({ business_id: businessId, box_type: "custom", title: n, position: posicao, is_active: true, config: { label: n, subtitle: "Abrir PDF", icon: "📄", action: "link", url, icone: false } })
        .select("id")
        .single();
      if (error || !caixa) { setErro("Não consegui criar o botão. Tente de novo."); return; }
      onPdfPronto(caixa.id, onde);
      setNomePdf("");
      setFilePdf(null);
      setVista("lista");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  if (!montado) return null;

  const titulo = vista === "lista" ? "O que aparece na sua página" : vista === "novo" ? "Criar algo novo" : vista === "pdf" ? "Botão de PDF" : escolhido?.titulo ?? "Novo botão";
  const cardLink = "flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-divider p-3 text-left active:bg-surface-soft";

  return createPortal(
    <>
      <button type="button" aria-label="Fechar" onClick={onFechar} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
      <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-h-[85vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {vista !== "lista" && (
              <button type="button" onClick={() => { setErro(null); setVista(vista === "form" || vista === "pdf" ? "novo" : "lista"); }} aria-label="Voltar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[18px] active:scale-95">‹</button>
            )}
            <span className="truncate text-[17px] font-medium">{titulo}</span>
          </div>
          <button type="button" onClick={onFechar} className="min-h-[40px] shrink-0 rounded-full bg-on-background px-5 text-[14px] text-white">Concluir</button>
        </div>

        {gratis && (
          <div className={`mt-3 rounded-2xl px-4 py-3 text-[14px] leading-snug ${avisoGratis ? "bg-amber-50 text-on-background" : "bg-surface-soft text-text-secondary"}`}>
            {avisoGratis ?? "Plano grátis: até 3 bolinhas e 4 boxes. Assine para liberar tudo."}{" "}
            <Link href="/admin/planos" className="underline underline-offset-2">Ver planos</Link>
          </div>
        )}

        {vista === "lista" && (
          <>
            <p className="mt-3 text-[13.5px] leading-snug text-text-secondary">Escolha onde cada coisa aparece na sua página inicial.</p>
            {avisos.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {avisos.map((a) => (
                  <AbrirEditor key={a.id} href={a.href} rotulo={a.titulo} aoFechar={() => router.refresh()} className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3 text-left active:scale-[0.99]">
                    <span aria-hidden className="mt-0.5 text-[16px]">⚠</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">{a.titulo} não está aparecendo</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{a.texto}</span>
                    </span>
                    <span aria-hidden className="text-[18px] text-text-tertiary">›</span>
                  </AbrirEditor>
                ))}
              </div>
            )}

            <p className="mt-6 border-t border-divider pt-5 text-[14px] font-medium uppercase tracking-wide text-text-secondary">Botões</p>
            <div className="mt-2 flex flex-col gap-2">
              {botoes.length === 0 && (
                <div className="rounded-2xl bg-surface-soft p-4">
                  <p className="text-[14.5px] text-text-secondary">Você ainda não tem botões. A Orbi cria os básicos e você muda depois.</p>
                  <button type="button" disabled={criandoBotoes} onClick={() => void criarBotoesProntos()} className="mt-3 min-h-[44px] w-full rounded-full bg-on-background text-[14px] font-medium text-white disabled:opacity-50 active:scale-[0.98]">{criandoBotoes ? "Criando…" : "Criar botões prontos"}</button>
                </div>
              )}
              {botoes.map((l) => (
                <Linha key={l.id} l={l} onMudar={mudar} />
              ))}
            </div>

            {!gratis && (
              <>
            <p className="mt-6 border-t border-divider pt-5 text-[14px] font-medium uppercase tracking-wide text-text-secondary">Vouchers no ar</p>
            <div className="mt-2 flex flex-col gap-2">
              {vouchers.length === 0 && <p className="text-[14.5px] text-text-secondary">Nenhum voucher ativo agora.</p>}
              {vouchers.map((l) => (
                <Linha key={l.id} l={{ ...l, pos: vouchersDestaque.includes(l.id) ? "destaque" : "bolinha" }} onMudar={mudar} soDestaque />
              ))}
            </div>

              </>
            )}

            <p className="mt-6 border-t border-divider pt-5 text-[14px] font-medium uppercase tracking-wide text-text-secondary">Produtos</p>
            <div className="mt-2 flex flex-col gap-2">
              {itens.length === 0 && <p className="text-[14.5px] text-text-secondary">Nenhum produto no catálogo ainda.</p>}
              {itens.slice(0, 60).map((l) => (
                <Linha key={l.id} l={l} onMudar={mudar} />
              ))}
            </div>
            {rascunhos.length > 0 && (
              <>
                <p className="mt-6 border-t border-divider pt-5 text-[14px] font-medium uppercase tracking-wide text-text-secondary">Rascunhos</p>
                <p className="mt-1.5 text-[14px] leading-snug text-text-secondary">Ninguém vê estes ainda. Toque em Publicar.</p>
                <div className="mt-2 flex flex-col gap-2">
                  {rascunhos.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-divider p-2.5">
                      {l.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.foto} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <span className="h-11 w-11 shrink-0 rounded-xl bg-surface-soft" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-medium">{l.titulo}</span>
                        <span className="block truncate text-[12px] text-text-tertiary">{l.sub}</span>
                      </span>
                      <button type="button" onClick={() => void publicar(l.id)} className="min-h-[36px] shrink-0 rounded-full bg-on-background px-4 text-[13px] font-medium text-white active:scale-95">Publicar</button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="sticky -bottom-8 -mx-5 mt-6 bg-gradient-to-t from-white via-white to-white/0 px-5 pb-1 pt-4">
              <button type="button" onClick={() => { setOnde(posicaoInicial); setVista("novo"); }} className="min-h-[48px] w-full rounded-full bg-on-background text-[15px] font-medium text-white shadow-[0_10px_24px_-12px_rgba(17,19,24,0.5)] active:scale-[0.98]">+ Criar algo novo</button>
            </div>
          </>
        )}

        {vista === "novo" && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Onde vai aparecer</p>
            <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-full bg-surface-soft p-1">
              {(["bolinha", "destaque"] as const).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={onde === p} onClick={() => setOnde(p)} className={`min-h-[38px] rounded-full text-[13.5px] font-medium ${onde === p ? "bg-on-background text-white" : "text-text-secondary"}`}>
                  {p === "bolinha" ? "Bolinha" : "Tag"}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Botão rápido</p>
            {presets.map((p) => (
              <button key={p.id} type="button" onClick={() => escolher(p)} className={cardLink}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold leading-tight">{p.titulo}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{p.texto}</span>
                </span>
                <span aria-hidden className="text-[20px] text-text-tertiary">›</span>
              </button>
            ))}
            {!gratis && (            <button type="button" onClick={() => { setErro(null); setVista("pdf"); }} className={cardLink}>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold leading-tight">PDF</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">Cardápio de Natal, catálogo, tabela de preços.</span>
              </span>
              <span aria-hidden className="text-[20px] text-text-tertiary">›</span>
            </button>)}

            <p className="mt-3 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Em tela própria</p>
            <p className="text-[12px] leading-snug text-text-tertiary">Ao terminar, volte aqui e escolha onde o item aparece.</p>
            {criarEm.filter((x) => !gratis || x.id !== "materiais-novo").map((x) => (
              <AbrirEditor key={x.id} href={x.href} rotulo={x.titulo} aoFechar={() => setRecarga((n) => n + 1)} className={cardLink}>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[14.5px] font-semibold leading-tight">{x.titulo}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{x.texto}</span>
                </span>
                <span aria-hidden className="text-[20px] text-text-tertiary">›</span>
              </AbrirEditor>
            ))}
            {[
              { href: "/admin/vouchers?novo=1", titulo: "Voucher", texto: "Desconto ou brinde para o cliente resgatar." },
              { href: "/admin/gift", titulo: "Gift card", texto: "Vale-presente que o cliente compra ou ganha." },
              { href: "/admin/vitrine?novo=1", titulo: "Produto", texto: "Um item novo no catálogo." },
            ].filter((n) => !gratis || n.titulo === "Produto").map((n) => (
              <AbrirEditor key={n.href} href={n.href} rotulo={n.titulo} aoFechar={() => { setRecarga((c) => c + 1); setVista("lista"); if (n.href === "/admin/gift") onGiftFechado(onde); }} className={cardLink}>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[14.5px] font-semibold leading-tight">{n.titulo}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{n.texto}</span>
                </span>
                <span aria-hidden className="text-[20px] text-text-tertiary">›</span>
              </AbrirEditor>
            ))}
          </div>
        )}

        {vista === "form" && escolhido && (
          <form onSubmit={(e) => { e.preventDefault(); void adicionar(); }} className="mt-4 flex flex-col gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-text-tertiary">Nome do botão</span>
              <input value={nome} onChange={(e) => { setNome(e.target.value); setErro(null); }} placeholder={escolhido.pedeNome ? "Ex.: Instagram" : undefined} className="mt-1 w-full rounded-xl border border-divider px-3 py-2.5 text-[16px] outline-none focus:border-on-background" />
            </label>
            {escolhido.campo && (
              <label className="block">
                <span className="text-[12px] font-medium text-text-tertiary">{escolhido.campo.rotulo}</span>
                <input value={valor} onChange={(e) => { setValor(e.target.value); setErro(null); }} placeholder={escolhido.campo.dica} inputMode={escolhido.action === "whatsapp" ? "tel" : "text"} className="mt-1 w-full rounded-xl border border-divider px-3 py-2.5 text-[16px] outline-none focus:border-on-background" />
              </label>
            )}
            {erro && <p role="alert" className="text-[13px] text-red-600">{erro}</p>}
            <button type="submit" disabled={salvando} className="min-h-[48px] rounded-full bg-button-primary text-[15px] font-medium text-white disabled:opacity-50">{salvando ? "Adicionando..." : onde === "destaque" ? "Adicionar como tag" : "Adicionar como bolinha"}</button>
          </form>
        )}

        {vista === "pdf" && (
          <div className="mt-4 flex flex-col gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-text-tertiary">Nome do botão</span>
              <input value={nomePdf} onChange={(e) => setNomePdf(e.target.value)} maxLength={40} placeholder="Ex: Cardápio de Natal" className="mt-1 w-full rounded-2xl border border-divider px-4 py-3 text-[16px] outline-none focus:border-on-background" />
            </label>
            <input ref={arquivoPdf} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; if (f.type !== "application/pdf") return setErro("Envie um arquivo PDF."); setErro(null); setFilePdf(f); if (!nomePdf.trim()) setNomePdf(f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").slice(0, 40)); }} />
            <button type="button" onClick={() => arquivoPdf.current?.click()} disabled={salvando} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 border-dashed border-divider px-4 text-left active:scale-[0.99]">
              <span className="text-[22px]" aria-hidden>📄</span>
              <span className="min-w-0 flex-1 truncate text-[14.5px]">{filePdf ? filePdf.name : "Escolher o PDF"}</span>
              {filePdf && <span className="shrink-0 text-[12px] text-text-tertiary">{(filePdf.size / 1024 / 1024).toFixed(1)} MB</span>}
            </button>
            {erro && <p role="alert" className="text-[13px] text-red-600">{erro}</p>}
            <button type="button" onClick={() => void criarPdf()} disabled={!nomePdf.trim() || !filePdf || salvando} className="min-h-[48px] rounded-full bg-on-background text-[15px] font-semibold text-white disabled:opacity-40 active:scale-[0.98]">
              {salvando ? "Criando o botão…" : onde === "destaque" ? "Criar botão como tag" : "Criar botão como bolinha"}
            </button>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}

function Linha({ l, onMudar, soDestaque }: { l: LinhaHome; onMudar: (l: LinhaHome, pos: Posicao) => void; soDestaque?: boolean }) {
  // Cada item leva ao editor certo, no mesmo painel que o lápis do cartão usa.
  const href = l.tipo === "voucher" ? `/admin/vouchers/${l.id}` : l.tipo === "item" ? `/admin/vitrine/pagina/${l.id}` : l.id === "zap" || l.id === "catalogo" ? null : `/admin/boxes?box=${l.id}#box-${l.id}`;
  return (
    <div className="rounded-2xl border border-divider p-2.5">
      <div className="flex items-center gap-3">
        {l.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.foto} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
        ) : l.icone ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[18px] text-white" style={{ background: l.cor ?? "#111318" }} aria-hidden><IconeBotao icone={l.icone} /></span>
        ) : (
          <span className="h-11 w-11 shrink-0 rounded-xl bg-surface-soft" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-medium">{l.titulo}</span>
          {l.sub && <span className="block truncate text-[12px] text-text-tertiary">{l.sub}</span>}
        </span>
        {href && (
          <AbrirEditor href={href} rotulo={`Editar ${l.titulo}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[15px] text-text-secondary active:scale-95">
            ✎
          </AbrirEditor>
        )}
        {soDestaque && (
          <button type="button" role="switch" aria-checked={l.pos === "destaque"} onClick={() => onMudar(l, l.pos === "destaque" ? "bolinha" : "destaque")} className={`min-h-[36px] shrink-0 rounded-full px-4 text-[13px] font-medium ${l.pos === "destaque" ? "bg-on-background text-white" : "border border-divider text-text-secondary"}`}>
            {l.pos === "destaque" ? "Tag ligada" : "Virar tag"}
          </button>
        )}
      </div>
      {!soDestaque && l.tipo !== "item" && l.pos === "escondido" && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] leading-snug text-text-secondary">Desligado: não aparece na página. Escolha Bolinha ou Tag para ligar.</p>
      )}
      {!soDestaque && (
        <div role="radiogroup" aria-label={`Onde mostrar ${l.titulo}`} className={`mt-2 grid gap-1 rounded-full bg-surface-soft p-1 ${l.semEscondido ? "grid-cols-2" : "grid-cols-3"}`}>
          {POSICOES.filter((p) => !(l.semEscondido && p.v === "escondido")).map((p) => (
            <button key={p.v} type="button" role="radio" aria-checked={l.pos === p.v} onClick={() => l.pos !== p.v && onMudar(l, p.v)} className={`min-h-[34px] rounded-full text-[13px] font-medium ${l.pos === p.v ? "bg-on-background text-white" : "text-text-secondary"}`}>
              {l.tipo === "item" && p.v === "escondido" ? "Só no catálogo" : p.r}
            </button>
          ))}
        </div>
      )}
      {!soDestaque && (l.pos !== "escondido" || l.tipo === "item") && (
        <p className="mt-1.5 px-2 text-[12px] leading-snug text-text-tertiary">
          {l.pos === "bolinha" ? "Ícone redondo na fileira de cima da página inicial." : l.pos === "destaque" ? "Tag larga, logo abaixo das bolinhas." : "Aparece só dentro do catálogo."}
        </p>
      )}
    </div>
  );
}
