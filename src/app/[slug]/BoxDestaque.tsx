"use client";

import { useRouter } from "next/navigation";
import { comprimirPdf } from "@/lib/comprimirPdf";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { IconeBotao } from "./IconeBotao";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { voucherGradient, voucherTheme } from "@/lib/voucherThemes";
import { descontoGrande } from "@/lib/voucherDesconto";
import Link from "next/link";
import { AbrirEditor } from "@/components/mobile/EditarNoLugar";
import { trackClick } from "@/lib/track";
import { formatPrice } from "@/lib/showcase";
import type { ItemCartao } from "./CartaoItem";

export type Destaque = { t: "voucher" | "item" | "botao"; id: string };

/** Qualquer botão que o dono criou (WhatsApp, link, cardápio, endereço...), pronto para virar destaque. */
export type BotaoDestaque = { key: string; titulo: string; sub: string; icone: string; logo: string | null; cor: string; acao: string; onClick: () => void };

type V = {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  image_url: string | null;
  badge: string | null;
  discount_type: string;
  discount_value: number | null;
  quantity_total: number;
  quantity_claimed: number;
  show_discount: boolean | null;
};

/** Lê o que está salvo em businesses.home_destaques, ignorando lixo. */
export function lerDestaques(raw: unknown): Destaque[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((d): d is Destaque => !!d && typeof d === "object" && ((d as Destaque).t === "voucher" || (d as Destaque).t === "item" || (d as Destaque).t === "botao") && typeof (d as Destaque).id === "string");
}

/**
 * Box destaque da tela inicial: o que o dono quer que todo mundo veja primeiro.
 * Um ou mais itens (vouchers e produtos). Com mais de um, vira um carrossel.
 * O dono escolhe pelo lápis; quem visita só vê, e se não há nada fixado o box
 * nem aparece.
 */
export function BoxDestaque({
  businessId,
  slug,
  sessionId,
  destaques,
  itens,
  botoes,
  podeEditar,
  onSalvar,
  onVoucher,
}: {
  businessId: string;
  slug: string;
  sessionId: string | null;
  destaques: Destaque[];
  itens: ItemCartao[];
  botoes: BotaoDestaque[];
  podeEditar: boolean;
  onSalvar: (lista: Destaque[]) => void;
  onVoucher: (id: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [vouchers, setVouchers] = useState<V[]>([]);
  const [aberto, setAberto] = useState(false);
  // Folha em dois caminhos: destacar algo que já existe, ou criar algo novo.
  const [vista, setVista] = useState<"inicio" | "existente" | "novo" | "pdf">("inicio");
  const abrirFolha = () => { setVista("inicio"); setAberto(true); };
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);
  const router = useRouter();

  // Botão de PDF: o dono sobe o arquivo, dá um nome e vira um botão que abre o PDF, já fixado no destaque.
  const arquivoPdf = useRef<HTMLInputElement>(null);
  const [nomePdf, setNomePdf] = useState("");
  const [filePdf, setFilePdf] = useState<File | null>(null);
  const [criandoPdf, setCriandoPdf] = useState(false);
  const [erroPdf, setErroPdf] = useState<string | null>(null);

  async function criarBotaoPdf() {
    const nome = nomePdf.trim();
    if (!nome || !filePdf || criandoPdf) return;
    setErroPdf(null);
    setCriandoPdf(true);
    try {
      let arq = filePdf;
      // PDF pesado abre devagar no celular do cliente: reduz sozinho antes de enviar.
      if (arq.size > 5 * 1024 * 1024) {
        try { const menor = await comprimirPdf(arq, 4.5 * 1024 * 1024); if (menor && menor.size < arq.size) arq = menor; } catch { /* segue com o original */ }
      }
      if (arq.size > 10 * 1024 * 1024) { setErroPdf("O PDF passou de 10 MB. Reduza o arquivo e tente de novo."); return; }
      const caminho = `${businessId}/botao-${new Date().getTime()}.pdf`;
      const { error: errUp } = await supabase.storage.from("cardapios-pdf").upload(caminho, arq, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
      if (errUp) { setErroPdf("Não consegui enviar o PDF. Tente de novo."); return; }
      const url = supabase.storage.from("cardapios-pdf").getPublicUrl(caminho).data.publicUrl;
      const { data: ult } = await supabase.from("smart_boxes").select("position").eq("business_id", businessId).order("position", { ascending: false }).limit(1);
      const posicao = (ult?.[0]?.position ?? -1) + 1;
      const { data: caixa, error } = await supabase
        .from("smart_boxes")
        .insert({ business_id: businessId, box_type: "custom", title: nome, position: posicao, is_active: true, config: { label: nome, subtitle: "Abrir PDF", icon: "📄", action: "link", url, icone: false } })
        .select("id")
        .single();
      if (error || !caixa) { setErroPdf("Não consegui criar o botão. Tente de novo."); return; }
      onSalvar([...destaques, { t: "botao", id: caixa.id }]);
      setNomePdf("");
      setFilePdf(null);
      setAberto(false);
      router.refresh();
    } finally {
      setCriandoPdf(false);
    }
  }

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("vouchers")
        .select("id, title, description, color, image_url, badge, discount_type, discount_value, quantity_total, quantity_claimed, show_discount")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (vivo) setVouchers((data as V[]) ?? []);
    })();
    return () => {
      vivo = false;
    };
  }, [supabase, businessId]);

  const cartoes = destaques
    .map((d) => (d.t === "voucher" ? { d, v: vouchers.find((x) => x.id === d.id) } : d.t === "botao" ? { d, b: botoes.find((x) => x.key === d.id) } : { d, i: itens.find((x) => x.id === d.id) }))
    .filter((c) => ("v" in c ? !!c.v : "b" in c ? !!c.b : !!c.i));

  // Ao voltar de "Criar algo novo", o que acabou de ser criado já entra no destaque
  // (a pessoa criou justamente pra mostrar). Compara com o que existia antes.
  const ultimo = useRef({ destaques, itens, vouchers, botoes });
  useEffect(() => { ultimo.current = { destaques, itens, vouchers, botoes }; });
  async function fixarOQueFoiCriado(k: "voucher" | "produto" | "botao") {
    const antes = ultimo.current;
    let achados: Destaque[] = [];
    if (k === "produto") {
      // O produto nasce como rascunho e rascunho não aparece na Home. Pega o mais novo (criado agora há pouco),
      // descarta se ficou vazio e publica se o dono preencheu pelo menos o nome.
      const desde = new Date(new Date().getTime() - 30 * 60 * 1000).toISOString();
      const { data } = await supabase.from("content_items").select("id, title, status, image_url, gallery_urls, description, price").eq("business_id", businessId).gte("created_at", desde).order("created_at", { ascending: false }).limit(1);
      const conhecidos = new Set(antes.itens.map((i) => i.id));
      const novo = (data ?? []).find((r) => !conhecidos.has(r.id));
      if (novo) {
        const comFoto = !!novo.image_url || (Array.isArray(novo.gallery_urls) && novo.gallery_urls.length > 0);
        const vazio = novo.status === "draft" && novo.title === "Novo item" && !comFoto && !novo.description?.trim() && novo.price == null;
        if (vazio) {
          await supabase.from("content_items").delete().eq("id", novo.id).eq("status", "draft");
        } else {
          if (novo.status !== "published") await supabase.from("content_items").update({ status: "published" }).eq("id", novo.id);
          achados = [{ t: "item" as const, id: novo.id }];
        }
      }
    } else if (k === "voucher") {
      const { data } = await supabase.from("vouchers").select("id").eq("business_id", businessId).eq("is_active", true).order("created_at", { ascending: false }).limit(5);
      const conhecidos = new Set(antes.vouchers.map((v) => v.id));
      achados = (data ?? []).filter((r) => !conhecidos.has(r.id)).map((r) => ({ t: "voucher" as const, id: r.id }));
    } else {
      const { data } = await supabase.from("smart_boxes").select("id").eq("business_id", businessId).eq("box_type", "custom").order("position", { ascending: false }).limit(5);
      const conhecidos = new Set(antes.botoes.map((b) => b.key));
      achados = (data ?? []).filter((r) => !conhecidos.has(r.id)).slice(0, 1).map((r) => ({ t: "botao" as const, id: r.id }));
    }
    const jaFixados = new Set(antes.destaques.map((d) => `${d.t}:${d.id}`));
    const novos = achados.filter((d) => !jaFixados.has(`${d.t}:${d.id}`));
    if (novos.length > 0) onSalvar([...antes.destaques, ...novos]);
  }

  const marcado = (t: Destaque["t"], id: string) => destaques.some((d) => d.t === t && d.id === id);
  const alternar = (t: Destaque["t"], id: string) => onSalvar(marcado(t, id) ? destaques.filter((d) => !(d.t === t && d.id === id)) : [...destaques, { t, id }]);

  if (cartoes.length === 0 && !podeEditar) return null;

  // Cartões pequenos e delicados: miniatura, nome, uma linha de apoio e um botão discreto.
  const larguraBase = (largo: boolean) => (largo ? "min-w-0 flex-1 max-w-[300px]" : "w-[80%] max-w-[300px] shrink-0 snap-center");
  // Com o lápis, o invólucro assume a largura e o cartão preenche.
  const largura = (largo: boolean) => (podeEditar ? "w-full min-w-0" : larguraBase(largo));
  const cartaoVoucher = (v: V, largo: boolean) => {
    const tema = voucherTheme(v.color as never);
    const restam = v.quantity_total - v.quantity_claimed;
    const apoio = v.discount_type === "gift" ? "Brinde" : v.show_discount === false ? (v.description?.trim() || "Voucher") : descontoGrande(v);
    return (
      <div className={`flex items-center gap-3 rounded-full p-2 pr-4 text-left text-white ${largura(largo)}`} style={{ background: voucherGradient(v.color as never), boxShadow: `0 6px 16px ${tema.glow}` }}>
        {v.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.image_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-[18px]" aria-hidden>🎟</span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold leading-tight">{v.title}</span>
          <span className="mt-0.5 block truncate text-[12px] opacity-80">{apoio}</span>
        </span>
        <button type="button" onClick={() => onVoucher(v.id)} disabled={restam <= 0} className="shrink-0 rounded-full bg-white px-4 py-2 text-[12.5px] font-bold disabled:opacity-50" style={{ color: tema.ctaText }}>
          {restam > 0 ? "Pegar" : "Esgotado"}
        </button>
      </div>
    );
  };

  const cartaoBotao = (b: BotaoDestaque, largo: boolean) => (
    <div className={`flex items-center gap-3 rounded-full border border-divider bg-surface-white p-2 pr-4 text-left shadow-[0_4px_14px_rgba(17,19,24,0.06)] ${largura(largo)}`}>
      {b.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.logo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[22px] text-white" style={{ background: b.cor }} aria-hidden><IconeBotao icone={b.icone} size={24} /></span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold leading-tight">{b.titulo}</span>
        {b.sub && <span className="mt-0.5 block truncate text-[12px] text-text-secondary">{b.sub}</span>}
      </span>
      <button type="button" onClick={b.onClick} className="shrink-0 rounded-full bg-on-background px-4 py-2 text-[12.5px] font-semibold text-white">
        {b.acao}
      </button>
    </div>
  );

  const cartaoItem = (i: ItemCartao, largo: boolean) => {
    const destino = i.link_kind === "nenhum" ? null : i.link_kind === "categoria" ? i.target_url : i.target_url && i.link_kind === "externo" ? i.target_url : `/${slug}/p/${i.id}`;
    const externo = i.link_kind === "categoria" || i.link_kind === "externo";
    const kind: "categoria" | "produto" | "link" = i.link_kind === "categoria" ? "categoria" : i.link_kind === "produto" ? "produto" : "link";
    const apoio = formatPrice(i) || i.brand_label || "";
    const miolo = (
      <>
        {i.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={i.image_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="h-14 w-14 shrink-0 rounded-full bg-surface-soft" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold leading-tight">{i.title}</span>
          {apoio && <span className="mt-0.5 block truncate text-[12px] text-text-secondary">{apoio}</span>}
        </span>
        {destino && <span className="shrink-0 rounded-full bg-on-background px-4 py-2 text-[12.5px] font-semibold text-white">Ver</span>}
      </>
    );
    const classe = `flex items-center gap-3 rounded-full text-left border border-divider bg-surface-white p-2 pr-4 shadow-[0_4px_14px_rgba(17,19,24,0.06)] ${largura(largo)}`;
    return destino ? (
      <Link href={destino} target={externo ? "_blank" : undefined} onClick={() => trackClick({ businessId, kind, contentItemId: i.id, sessionId, targetUrl: destino })} className={classe}>
        {miolo}
      </Link>
    ) : (
      <div className={classe}>{miolo}</div>
    );
  };

  const renderCartao = (c: (typeof cartoes)[number], largo: boolean) => {
    const cartao = "v" in c && c.v ? cartaoVoucher(c.v, largo) : "b" in c && c.b ? cartaoBotao(c.b, largo) : "i" in c && c.i ? cartaoItem(c.i, largo) : null;
    if (!cartao || !podeEditar) return cartao;
    // Dono: lapisinho em cada cartão, levando direto ao lugar certo de editar.
    const editar = "v" in c && c.v ? { href: `/admin/vouchers/${c.v.id}`, rotulo: "Editar voucher" } : "b" in c && c.b ? { href: `/admin/boxes?box=${c.b.key}#box-${c.b.key}`, rotulo: "Editar botão" } : "i" in c && c.i ? { href: `/admin/vitrine/pagina/${c.i.id}`, rotulo: "Editar produto" } : null;
    return (
      <div className={`relative ${larguraBase(largo)}`}>
        {cartao}
        <button
          type="button"
          onClick={() => alternar(c.d.t, c.d.id)}
          aria-label="Tirar do destaque"
          className="absolute -left-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-divider bg-surface-white text-[12px] text-text-secondary shadow-md active:scale-95"
        >
          ✕
        </button>
        {editar && (
          <AbrirEditor href={editar.href} rotulo={editar.rotulo} className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-divider bg-surface-white text-[13px] text-text-secondary shadow-md active:scale-95">
            ✎
          </AbrirEditor>
        )}
      </div>
    );
  };

  const maisQuadrado = podeEditar && (
    <button type="button" onClick={abrirFolha} aria-label="Fixar ou tirar itens do destaque" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-divider text-[26px] font-light leading-none text-text-secondary active:scale-95">+</button>
  );

  return (
    <section className="w-full" aria-label="Em destaque">
      {cartoes.length === 0 ? (
        <button type="button" onClick={abrirFolha} className="flex min-h-[72px] w-full max-w-[300px] flex-col items-start justify-center gap-1 rounded-[20px] border-2 border-dashed border-divider px-4 text-left text-text-secondary">
          <span className="text-[15px] font-medium">+ Fixar em destaque</span>
          <span className="text-[12.5px] text-text-tertiary">Fixe um botão, voucher ou produto aqui. Só você vê este aviso.</span>
        </button>
      ) : cartoes.length === 1 ? (
        <div className="flex w-full items-center gap-2">
          {renderCartao(cartoes[0], true)}
          {maisQuadrado}
        </div>
      ) : (
        <ul data-rolavel className="no-scrollbar -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-2.5 overflow-x-auto px-6 pb-7 pt-1 -mb-5">
          {cartoes.map((c) => (
            <li key={`${c.d.t}-${c.d.id}`} className="contents">
              {renderCartao(c, false)}
            </li>
          ))}
          {maisQuadrado && <li className="contents">{maisQuadrado}</li>}
        </ul>
      )}

      {aberto && montado && createPortal(
        <>
          <button type="button" aria-label="Fechar" onClick={() => setAberto(false)} className="fixed inset-0 z-[55] cursor-default bg-black/30" />
          <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-white p-5 pb-8 text-on-background shadow-[0_-10px_36px_rgba(17,19,24,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {vista !== "inicio" && (
                  <button type="button" onClick={() => setVista(vista === "pdf" ? "novo" : "inicio")} aria-label="Voltar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[18px] active:scale-95">‹</button>
                )}
                <span className="truncate text-[17px] font-medium">{vista === "existente" ? "Destacar o que já existe" : vista === "novo" ? "Criar algo novo" : vista === "pdf" ? "Botão de PDF" : "Fixar em destaque"}</span>
              </div>
              <button type="button" onClick={() => setAberto(false)} className="min-h-[40px] shrink-0 rounded-full bg-on-background px-5 text-[14px] text-white">Concluir</button>
            </div>

            {vista === "inicio" && (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-[13px] text-text-secondary">O que você fixar fica em destaque no começo da página, na ordem em que você marcar. O que você quer fazer?</p>
                <button type="button" onClick={() => setVista("existente")} className="flex min-h-[80px] items-center gap-3 rounded-[22px] border-2 border-divider bg-surface-white p-3.5 text-left transition-transform active:scale-[0.98]">
                  <TileNovo k="existe" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-semibold">Destacar o que já existe</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">Escolha entre seus botões, vouchers e produtos.</span>
                  </span>
                  <span aria-hidden className="text-[20px] text-text-tertiary">›</span>
                </button>
                <button type="button" onClick={() => setVista("novo")} className="flex min-h-[80px] items-center gap-3 rounded-[22px] border-2 border-divider bg-surface-white p-3.5 text-left transition-transform active:scale-[0.98]">
                  <TileNovo k="novo" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-semibold">Criar algo novo</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">Voucher, gift card, produto ou botão. Quando terminar, você volta aqui para destacar.</span>
                  </span>
                  <span aria-hidden className="text-[20px] text-text-tertiary">›</span>
                </button>
              </div>
            )}

            {vista === "novo" && (
              <div className="mt-4 flex flex-col gap-2">
                {[
                  { k: "voucher", href: "/admin/vouchers?novo=1", rotulo: "Criar voucher", titulo: "Voucher", sub: "Desconto ou brinde para o cliente resgatar." },
                  { k: "gift", href: "/admin/gift", rotulo: "Criar gift card", titulo: "Gift card", sub: "Vale-presente que o cliente compra ou ganha." },
                  { k: "produto", href: "/admin/vitrine?novo=1", rotulo: "Criar produto", titulo: "Produto", sub: "Um item novo no catálogo." },
                  { k: "botao", href: "/admin/boxes?novo=1#novo-botao", rotulo: "Criar botão", titulo: "Botão", sub: "WhatsApp, link, endereço, cardápio e outros." },
                ].map((n) => (
                  <AbrirEditor key={n.href} href={n.href} rotulo={n.rotulo} aoFechar={() => { setVista("existente"); if (n.k === "voucher" || n.k === "produto" || n.k === "botao") void fixarOQueFoiCriado(n.k); }} className={`flex min-h-[68px] w-full items-center gap-3 rounded-[22px] p-3 text-left transition-transform active:scale-[0.98] border-2 border-divider bg-surface-white`}>
                    <TileNovo k={n.k as keyof typeof CORES_NOVO} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{n.titulo}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">{n.sub}</span>
                    </span>
                    <span aria-hidden className="text-[20px] leading-none text-text-tertiary">›</span>
                  </AbrirEditor>
                ))}
                <button type="button" onClick={() => setVista("pdf")} className="flex min-h-[68px] w-full items-center gap-3 rounded-[22px] border-2 border-divider bg-surface-white p-3 text-left transition-transform active:scale-[0.98]">
                  <TileNovo k="pdf" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">PDF</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-text-secondary">Cardápio de Natal, catálogo, tabela de preços. Vira um botão que abre o arquivo.</span>
                  </span>
                  <span aria-hidden className="text-[20px] leading-none text-text-tertiary">›</span>
                </button>
              </div>
            )}

            {vista === "pdf" && (
              <div className="mt-4 flex flex-col gap-3">
                <label className="block">
                  <span className="text-[12px] font-medium text-text-tertiary">Nome do botão</span>
                  <input value={nomePdf} onChange={(e) => setNomePdf(e.target.value)} maxLength={40} placeholder="Ex: Cardápio de Natal" className="mt-1 w-full rounded-2xl border border-divider px-4 py-3 text-[16px] outline-none focus:border-on-background" />
                </label>
                <input ref={arquivoPdf} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; if (f.type !== "application/pdf") return setErroPdf("Envie um arquivo PDF."); setErroPdf(null); setFilePdf(f); if (!nomePdf.trim()) setNomePdf(f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").slice(0, 40)); }} />
                <button type="button" onClick={() => arquivoPdf.current?.click()} disabled={criandoPdf} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 border-dashed border-divider px-4 text-left active:scale-[0.99]">
                  <span className="text-[22px]" aria-hidden>📄</span>
                  <span className="min-w-0 flex-1 truncate text-[14.5px]">{filePdf ? filePdf.name : "Escolher o PDF"}</span>
                  {filePdf && <span className="shrink-0 text-[12px] text-text-tertiary">{(filePdf.size / 1024 / 1024).toFixed(1)} MB</span>}
                </button>
                {erroPdf && <p role="alert" className="text-[13px] text-red-600">{erroPdf}</p>}
                <button type="button" onClick={() => void criarBotaoPdf()} disabled={!nomePdf.trim() || !filePdf || criandoPdf} className="min-h-[48px] rounded-full bg-on-background text-[15px] font-semibold text-white disabled:opacity-40 active:scale-[0.98]">
                  {criandoPdf ? "Criando o botão…" : "Criar botão e destacar"}
                </button>
                <p className="text-center text-[12.5px] leading-snug text-text-tertiary">O botão abre o PDF direto, entra em destaque e fica na lista de Botões para você editar a cor e o ícone.</p>
              </div>
            )}

            {vista === "existente" && (
              <>
                <p className="mt-1 text-[13px] text-text-secondary">Marque o que você quer em evidência. Desmarque para tirar.</p>
                <button type="button" onClick={() => setVista("novo")} className="mt-3 min-h-[40px] rounded-full bg-surface-soft px-4 text-[13px] font-medium text-text-secondary active:scale-95">Não achou? Criar algo novo</button>

            <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Botões</p>
            <div className="mt-2 flex flex-col gap-2">
              {botoes.length === 0 && <p className="text-[13px] text-text-tertiary">Nenhum botão criado ainda.</p>}
              {botoes.map((b) => (
                <Linha key={b.key} ligado={marcado("botao", b.key)} titulo={b.titulo} sub={b.sub} foto={b.logo} icone={b.icone} cor={b.cor} onClick={() => alternar("botao", b.key)} />
              ))}
            </div>

            <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Vouchers no ar</p>
            <div className="mt-2 flex flex-col gap-2">
              {vouchers.length === 0 && <p className="text-[13px] text-text-tertiary">Nenhum voucher ativo agora.</p>}
              {vouchers.map((v) => (
                <Linha key={v.id} ligado={marcado("voucher", v.id)} titulo={v.title} sub={v.discount_type === "gift" ? "Brinde" : descontoGrande(v)} foto={v.image_url} onClick={() => alternar("voucher", v.id)} />
              ))}
            </div>

            <p className="mt-5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Produtos</p>
            <div className="mt-2 flex flex-col gap-2">
              {itens.length === 0 && <p className="text-[13px] text-text-tertiary">Nenhum produto no catálogo ainda.</p>}
              {itens.slice(0, 60).map((i) => (
                <Linha key={i.id} ligado={marcado("item", i.id)} titulo={i.title} sub={i.brand_label ?? ""} foto={i.image_url} onClick={() => alternar("item", i.id)} />
              ))}
            </div>
              </>
            )}
          </div>
        </>,
        document.body,
      )}
    </section>
  );
}

const TRACOS = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONES_NOVO: Record<string, React.ReactNode> = {
  voucher: (<svg width="22" height="22" viewBox="0 0 24 24" {...TRACOS}><path d="M3 9a2 2 0 0 0 0 6v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a2 2 0 0 1 0-6V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z" /><path d="M14 6v12" strokeDasharray="2 3" /></svg>),
  gift: (<svg width="22" height="22" viewBox="0 0 24 24" {...TRACOS}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></svg>),
  produto: (<svg width="22" height="22" viewBox="0 0 24 24" {...TRACOS}><path d="M6 7h12l1 13H5z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>),
  pdf: (<svg width="22" height="22" viewBox="0 0 24 24" {...TRACOS}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>),
  botao: (<svg width="22" height="22" viewBox="0 0 24 24" {...TRACOS}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>),
  existe: (<svg width="22" height="22" viewBox="0 0 24 24" {...TRACOS}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>),
  novo: (<svg width="22" height="22" viewBox="0 0 24 24" {...TRACOS}><path d="M12 4v16M4 12h16" /><path d="M19 3v4M17 5h4" /></svg>),
};
const CORES_NOVO: Record<string, { fundo: string; tile: string }> = {
  voucher: { fundo: "#FDECF2", tile: "#E5487F" },
  gift: { fundo: "#FFF2E0", tile: "#F29A1F" },
  produto: { fundo: "#E3F5F6", tile: "#0E9AA7" },
  botao: { fundo: "#ECEBFD", tile: "#6B63E8" },
  pdf: { fundo: "#FDECEC", tile: "#E5483F" },
  existe: { fundo: "#FFF7D6", tile: "#E3A800" },
  novo: { fundo: "#F3E8FF", tile: "#9B5CF0" },
};
function TileNovo({ k }: { k: keyof typeof CORES_NOVO }) {
  // Só o ícone, solto e colorido, sem quadradinho por trás.
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center [&>svg]:h-[28px] [&>svg]:w-[28px]" style={{ color: CORES_NOVO[k].tile }} aria-hidden>
      {ICONES_NOVO[k]}
    </span>
  );
}

function Linha({ ligado, titulo, sub, foto, icone, cor, onClick }: { ligado: boolean; titulo: string; sub: string; foto: string | null; icone?: string; cor?: string; onClick: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={ligado} onClick={onClick} className={`flex items-center gap-3 rounded-2xl border-2 p-2.5 text-left ${ligado ? "border-on-background" : "border-divider"}`}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      ) : icone ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[18px] text-white" style={{ background: cor ?? "#111318" }} aria-hidden><IconeBotao icone={icone} /></span>
      ) : (
        <span className="h-11 w-11 shrink-0 rounded-xl bg-surface-soft" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium">{titulo}</span>
        {sub && <span className="block truncate text-[12px] text-text-tertiary">{sub}</span>}
      </span>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${ligado ? "bg-on-background text-white" : "border border-divider text-transparent"}`}>✓</span>
    </button>
  );
}
