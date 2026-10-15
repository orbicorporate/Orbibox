"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
  const montado = useSyncExternalStore(() => () => {}, () => true, () => false);

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
      <div className={`flex items-center gap-3 rounded-full p-2 pr-2 text-left text-white ${largura(largo)}`} style={{ background: voucherGradient(v.color as never), boxShadow: `0 6px 16px ${tema.glow}` }}>
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
        <button type="button" onClick={() => onVoucher(v.id)} disabled={restam <= 0} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-bold disabled:opacity-50" style={{ color: tema.ctaText }}>
          {restam > 0 ? "Pegar" : "Esgotado"}
        </button>
      </div>
    );
  };

  const cartaoBotao = (b: BotaoDestaque, largo: boolean) => (
    <div className={`flex items-center gap-3 rounded-full border border-divider bg-surface-white p-2 pr-2 text-left shadow-[0_4px_14px_rgba(17,19,24,0.06)] ${largura(largo)}`}>
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
      <button type="button" onClick={b.onClick} className="shrink-0 rounded-full bg-on-background px-3.5 py-1.5 text-[12.5px] font-semibold text-white">
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
        {destino && <span className="shrink-0 rounded-full bg-on-background px-3.5 py-1.5 text-[12.5px] font-semibold text-white">Ver</span>}
      </>
    );
    const classe = `flex items-center gap-3 rounded-full text-left border border-divider bg-surface-white p-2 pr-2 shadow-[0_4px_14px_rgba(17,19,24,0.06)] ${largura(largo)}`;
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
        {editar && (
          <AbrirEditor href={editar.href} rotulo={editar.rotulo} className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-divider bg-surface-white text-[13px] text-text-secondary shadow-md active:scale-95">
            ✎
          </AbrirEditor>
        )}
      </div>
    );
  };

  const maisQuadrado = podeEditar && (
    <button type="button" onClick={() => setAberto(true)} aria-label="Fixar ou tirar itens do destaque" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-divider text-[26px] font-light leading-none text-text-secondary active:scale-95">+</button>
  );

  return (
    <section className="w-full" aria-label="Destaque">
      {cartoes.length === 0 ? (
        <button type="button" onClick={() => setAberto(true)} className="flex min-h-[72px] w-full max-w-[300px] flex-col items-start justify-center gap-1 rounded-[20px] border-2 border-dashed border-divider px-4 text-left text-text-secondary">
          <span className="text-[15px] font-medium">+ Fixar no destaque</span>
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
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium">Fixar no destaque</span>
              <button type="button" onClick={() => setAberto(false)} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Pronto</button>
            </div>
            <p className="mt-1 text-[13px] text-text-secondary">Marque o que você quer em evidência: botões, vouchers ou produtos. Eles aparecem no começo da seção, na ordem em que você marcar. Desmarque para tirar.</p>

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
          </div>
        </>,
        document.body,
      )}
    </section>
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
