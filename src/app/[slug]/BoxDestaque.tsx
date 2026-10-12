"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { voucherGradient, voucherTheme } from "@/lib/voucherThemes";
import { descontoGrande } from "@/lib/voucherDesconto";
import Link from "next/link";
import { trackClick } from "@/lib/track";
import { formatPrice } from "@/lib/showcase";
import type { ItemCartao } from "./CartaoItem";

export type Destaque = { t: "voucher" | "item"; id: string };

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
  return raw.filter((d): d is Destaque => !!d && typeof d === "object" && ((d as Destaque).t === "voucher" || (d as Destaque).t === "item") && typeof (d as Destaque).id === "string");
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
  podeEditar,
  onSalvar,
  onVoucher,
}: {
  businessId: string;
  slug: string;
  sessionId: string | null;
  destaques: Destaque[];
  itens: ItemCartao[];
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
    .map((d) => (d.t === "voucher" ? { d, v: vouchers.find((x) => x.id === d.id) } : { d, i: itens.find((x) => x.id === d.id) }))
    .filter((c) => ("v" in c ? !!c.v : !!c.i));

  const marcado = (t: Destaque["t"], id: string) => destaques.some((d) => d.t === t && d.id === id);
  const alternar = (t: Destaque["t"], id: string) => onSalvar(marcado(t, id) ? destaques.filter((d) => !(d.t === t && d.id === id)) : [...destaques, { t, id }]);

  if (cartoes.length === 0 && !podeEditar) return null;

  // Cartões pequenos e delicados: miniatura, nome, uma linha de apoio e um botão discreto.
  const largura = (largo: boolean) => (largo ? "min-w-0 flex-1 max-w-[300px]" : "w-[80%] max-w-[300px] shrink-0 snap-center");
  const cartaoVoucher = (v: V, largo: boolean) => {
    const tema = voucherTheme(v.color as never);
    const restam = v.quantity_total - v.quantity_claimed;
    const apoio = v.discount_type === "gift" ? "Brinde" : v.show_discount === false ? (v.description?.trim() || "Voucher") : descontoGrande(v);
    return (
      <div className={`flex items-center gap-3 rounded-[20px] p-2 pr-3 text-left text-white ${largura(largo)}`} style={{ background: voucherGradient(v.color as never), boxShadow: `0 6px 16px ${tema.glow}` }}>
        {v.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.image_url} alt="" className="h-14 w-14 shrink-0 rounded-[14px] object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-white/20 text-[18px]" aria-hidden>🎟</span>
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

  const cartaoItem = (i: ItemCartao, largo: boolean) => {
    const destino = i.link_kind === "nenhum" ? null : i.link_kind === "categoria" ? i.target_url : i.target_url && i.link_kind === "externo" ? i.target_url : `/${slug}/p/${i.id}`;
    const externo = i.link_kind === "categoria" || i.link_kind === "externo";
    const kind: "categoria" | "produto" | "link" = i.link_kind === "categoria" ? "categoria" : i.link_kind === "produto" ? "produto" : "link";
    const apoio = formatPrice(i) || i.brand_label || "";
    const miolo = (
      <>
        {i.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={i.image_url} alt="" className="h-14 w-14 shrink-0 rounded-[14px] object-cover" />
        ) : (
          <span className="h-14 w-14 shrink-0 rounded-[14px] bg-surface-soft" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14.5px] font-semibold leading-tight">{i.title}</span>
          {apoio && <span className="mt-0.5 block truncate text-[12px] text-text-secondary">{apoio}</span>}
        </span>
        {destino && <span className="shrink-0 rounded-full bg-on-background px-3.5 py-1.5 text-[12.5px] font-semibold text-white">Ver</span>}
      </>
    );
    const classe = `flex items-center gap-3 rounded-[20px] text-left border border-divider bg-surface-white p-2 pr-3 shadow-[0_4px_14px_rgba(17,19,24,0.06)] ${largura(largo)}`;
    return destino ? (
      <Link href={destino} target={externo ? "_blank" : undefined} onClick={() => trackClick({ businessId, kind, contentItemId: i.id, sessionId, targetUrl: destino })} className={classe}>
        {miolo}
      </Link>
    ) : (
      <div className={classe}>{miolo}</div>
    );
  };

  const maisQuadrado = podeEditar && (
    <button type="button" onClick={() => setAberto(true)} aria-label="Adicionar ao box destaque" className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] border-2 border-dashed border-divider text-[26px] font-light leading-none text-text-secondary active:scale-95">+</button>
  );

  return (
    <section className="w-full" aria-label="Destaque">
      {podeEditar && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Box destaque</span>
          <button type="button" onClick={() => setAberto(true)} aria-label="Escolher o que fica em destaque" className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-on-background/35 text-[13px] text-on-background/70 active:scale-95">✎</button>
        </div>
      )}

      {cartoes.length === 0 ? (
        <button type="button" onClick={() => setAberto(true)} className="flex min-h-[72px] w-full max-w-[300px] flex-col items-start justify-center gap-1 rounded-[20px] border-2 border-dashed border-divider px-4 text-left text-text-secondary">
          <span className="text-[15px] font-medium">+ Adicionar box destaque</span>
          <span className="text-[12.5px] text-text-tertiary">Fixe um voucher ou produto no topo. Só você vê este aviso.</span>
        </button>
      ) : cartoes.length === 1 ? (
        <div className="flex w-full items-center gap-2">
          {"v" in cartoes[0] && cartoes[0].v ? cartaoVoucher(cartoes[0].v, true) : "i" in cartoes[0] && cartoes[0].i ? cartaoItem(cartoes[0].i, true) : null}
          {maisQuadrado}
        </div>
      ) : (
        <ul data-rolavel className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-6 pb-2">
          {cartoes.map((c) => (
            <li key={`${c.d.t}-${c.d.id}`} className="contents">
              {"v" in c && c.v ? cartaoVoucher(c.v, false) : "i" in c && c.i ? cartaoItem(c.i, false) : null}
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
              <span className="text-[17px] font-medium">Box destaque</span>
              <button type="button" onClick={() => setAberto(false)} className="min-h-[40px] rounded-full bg-on-background px-5 text-[14px] text-white">Pronto</button>
            </div>
            <p className="mt-1 text-[13px] text-text-secondary">Escolha um ou mais. Ficam no topo da tela inicial, na ordem em que você marcar.</p>

            <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">Vouchers no ar</p>
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

function Linha({ ligado, titulo, sub, foto, onClick }: { ligado: boolean; titulo: string; sub: string; foto: string | null; onClick: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={ligado} onClick={onClick} className={`flex items-center gap-3 rounded-2xl border-2 p-2.5 text-left ${ligado ? "border-on-background" : "border-divider"}`}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
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
