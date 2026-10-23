"use client";

import { useEffect, useMemo, useState } from "react";
import { IconeBotao } from "./IconeBotao";
import { createClient } from "@/lib/supabase/client";
import { voucherGradient, voucherTheme } from "@/lib/voucherThemes";
import { descontoGrande } from "@/lib/voucherDesconto";
import Link from "next/link";
import { AbrirEditor } from "@/components/mobile/EditarNoLugar";
import { trackClick } from "@/lib/track";
import { formatPrice } from "@/lib/showcase";
import { textoSobre } from "@/lib/cardapio";
import type { ItemCartao } from "./CartaoItem";

export type Destaque = { t: "voucher" | "item" | "botao"; id: string };
/** O que fica salvo em home_destaques: os destaques e os itens que viraram bolinha. */
export type DestaqueSalvo = Destaque | { t: "item_bolinha"; id: string; p?: number; logo?: string | null };

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
export function lerDestaques(raw: unknown): DestaqueSalvo[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((d): d is DestaqueSalvo => !!d && typeof d === "object" && ((d as DestaqueSalvo).t === "voucher" || (d as DestaqueSalvo).t === "item" || (d as DestaqueSalvo).t === "botao" || (d as DestaqueSalvo).t === "item_bolinha") && typeof (d as DestaqueSalvo).id === "string");
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
  onAbrirFolha,
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
  onAbrirFolha: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [vouchers, setVouchers] = useState<V[]>([]);
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

  const cartaoBotao = (b: BotaoDestaque, largo: boolean) => {
    // Com uma cor escolhida para o botão, o cartão inteiro fica nessa cor; sem escolha, fica branco.
    const fundo = /^#[0-9a-f]{6}$/i.test(b.cor) && b.cor.toLowerCase() !== "#111318" ? b.cor : null;
    const fg = fundo ? textoSobre(fundo) : null;
    const claro = fg === "#FFFFFF";
    return (
    <div
      className={`flex items-center gap-3 rounded-full p-2 pr-4 text-left ${fundo ? "" : "border border-divider bg-surface-white shadow-[0_4px_14px_rgba(17,19,24,0.06)]"} ${largura(largo)}`}
      style={fundo ? { backgroundColor: fundo, color: fg ?? undefined, boxShadow: `0 8px 20px -8px ${fundo}99` } : undefined}
    >
      {b.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.logo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
      ) : (
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[22px] ${fundo ? "" : "text-white"}`} style={fundo ? { backgroundColor: claro ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.08)" } : { background: b.cor }} aria-hidden><IconeBotao icone={b.icone} size={24} /></span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold leading-tight">{b.titulo}</span>
        {b.sub && <span className={`mt-0.5 block truncate text-[12px] ${fundo ? "opacity-80" : "text-text-secondary"}`}>{b.sub}</span>}
      </span>
      <button
        type="button"
        onClick={b.onClick}
        style={fundo && fg ? { backgroundColor: fg, color: fundo } : undefined}
        className={`shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold ${fundo ? "" : "bg-on-background text-white"}`}
      >
        {b.acao}
      </button>
    </div>
    );
  };

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
    <button type="button" onClick={() => onAbrirFolha()} aria-label="Fixar ou tirar itens do destaque" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-divider text-[26px] font-light leading-none text-text-secondary active:scale-95">+</button>
  );

  return (
    <section className="w-full" aria-label="Em destaque">
      {cartoes.length === 0 ? (
        <button type="button" onClick={() => onAbrirFolha()} className="flex min-h-[72px] w-full max-w-[300px] flex-col items-start justify-center gap-1 rounded-[20px] border-2 border-dashed border-divider px-4 text-left text-text-secondary">
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

    </section>
  );
}
