"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDialogs } from "@/hooks/useDialogs";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { VoucherLines } from "@/components/mobile/VoucherDecor";
import { VOUCHER_THEMES, voucherGradient, CHERRY_GRADIENT, CHERRY_SHADOW, type VoucherColor } from "@/lib/voucherThemes";
import type { Database } from "@/lib/supabase/types";
import { avisarErroSalvar, conferirSalvo } from "@/components/ui/AvisoSalvar";

type Voucher = Database["public"]["Tables"]["vouchers"]["Row"];
type Redemption = Database["public"]["Tables"]["voucher_redemptions"]["Row"];

// Opções de validade em linguagem de gente. O banco continua guardando horas.
const VALIDADES: { horas: string; rotulo: string }[] = [
  { horas: "24", rotulo: "1 dia" },
  { horas: "48", rotulo: "2 dias" },
  { horas: "168", rotulo: "7 dias" },
  { horas: "720", rotulo: "30 dias" },
  { horas: "", rotulo: "Sem prazo" },
];

type RascunhoVoucher = {
  title: string; description: string; discountType: "percent" | "fixed"; discountValue: string;
  quantityTotal: string; expiresHours: string; imageUrl: string | null; badge: string; color: VoucherColor;
  /** Veio pronto do cadastro, sugerido pelo ramo do negócio. */
  sugestao?: boolean;
};
const chaveRascunho = (id: string) => `orbi_voucher_rascunho_${id}`;
function lerRascunho(id: string): string | null {
  try {
    return window.localStorage.getItem(chaveRascunho(id));
  } catch {
    return null;
  }
}

function discountLabel(v: Pick<Voucher, "discount_type" | "discount_value">) {
  return v.discount_type === "percent" ? `${v.discount_value}% off` : `R$ ${v.discount_value} off`;
}

export function VouchersManager({ businessId, initialVouchers, canSave = true, redemptionsByVoucher = {}, abrirNovo = false }: { businessId: string; initialVouchers: Voucher[]; canSave?: boolean; redemptionsByVoucher?: Record<string, Redemption[]>; abrirNovo?: boolean }) {
  const supabase = createClient();
  const { confirm, DialogRenderer } = useDialogs();
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [creating, setCreating] = useState(abrirNovo);
  // Fechada por padrão: quem entra normalmente quer criar um voucher novo ou
  // ver o painel, não rolar a lista inteira.
  const [listaAberta, setListaAberta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Form de criação
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [quantityTotal, setQuantityTotal] = useState("");
  const [expiresHours, setExpiresHours] = useState("48");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [badge, setBadge] = useState("");
  const [color, setColor] = useState<VoucherColor>("cherry");

  // Rascunho guardado quando um plano sem vouchers tentou criar: depois de
  // assinar, a pessoa volta e continua de onde parou.
  const [rascunhoDescartado, setRascunhoDescartado] = useState(false);
  const rascunhoBruto = useSyncExternalStore(
    () => () => {},
    () => lerRascunho(businessId),
    () => null,
  );
  const temRascunho = !!rascunhoBruto && !rascunhoDescartado && !creating;
  const ehSugestao = (() => {
    try {
      return !!(JSON.parse(rascunhoBruto ?? "{}") as RascunhoVoucher).sugestao;
    } catch {
      return false;
    }
  })();
  function retomarRascunho() {
    try {
      const r = JSON.parse(rascunhoBruto ?? "") as RascunhoVoucher;
      setTitle(r.title ?? ""); setDescription(r.description ?? ""); setDiscountType(r.discountType ?? "percent");
      setDiscountValue(r.discountValue ?? ""); setQuantityTotal(r.quantityTotal ?? ""); setExpiresHours(r.expiresHours ?? "48");
      setImageUrl(r.imageUrl ?? null); setBadge(r.badge ?? ""); setColor(r.color ?? "cherry");
      setCreating(true);
    } catch {
      setRascunhoDescartado(true);
    }
  }
  function apagarRascunho() {
    try {
      window.localStorage.removeItem(chaveRascunho(businessId));
    } catch {}
    setRascunhoDescartado(true);
  }

  async function createVoucher(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !discountValue || !quantityTotal || saving) return;
    // Titânio montou o voucher pra ver como é, na hora de salvar, pede o upgrade.
    if (!canSave) {
      try {
        const r: RascunhoVoucher = { title, description, discountType, discountValue, quantityTotal, expiresHours, imageUrl, badge, color };
        window.localStorage.setItem(chaveRascunho(businessId), JSON.stringify(r));
      } catch {}
      setShowUpgrade(true);
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("vouchers")
        .insert({
          business_id: businessId,
          title: title.trim(),
          description: description.trim() || null,
          discount_type: discountType,
          discount_value: Number(discountValue),
          quantity_total: Number(quantityTotal),
          expires_hours: expiresHours.trim() ? Number(expiresHours) : null,
          image_url: imageUrl,
          badge: badge.trim() || null,
          color,
        })
        .select()
        .single();
      if (error || !data) {
        avisarErroSalvar("Não conseguimos criar o voucher. Confira sua internet e tente de novo.");
      }
      if (!error && data) {
        apagarRascunho();
        setVouchers((p) => [data as Voucher, ...p]);
        setCreating(false);
        setTitle("");
        setDescription("");
        setDiscountValue("");
        setQuantityTotal("");
        setExpiresHours("48");
        setImageUrl(null);
        setBadge("");
        setColor("cherry");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(v: Voucher) {
    const res = await supabase.from("vouchers").update({ is_active: !v.is_active }).eq("id", v.id).select().single();
    const data = res.data;
    if (!conferirSalvo(res)) return;
    if (data) setVouchers((p) => p.map((x) => (x.id === v.id ? (data as Voucher) : x)));
  }

  async function deleteVoucher(v: Voucher) {
    if (!(await confirm({ title: "Excluir voucher", message: `Excluir "${v.title}"? Códigos já resgatados continuam válidos até você excluir também os resgates, mas ninguém mais vai conseguir gerar um novo.`, confirmLabel: "Excluir", danger: true }))) return;
    if (!conferirSalvo(await supabase.from("vouchers").delete().eq("id", v.id), "Não conseguimos excluir. Tente de novo.")) return;
    setVouchers((p) => p.filter((x) => x.id !== v.id));
  }

  return (
    <div className="mt-6 flex flex-col gap-7">
      <DialogRenderer />
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setShowUpgrade(false)}>
          <div className="w-full max-w-[340px] rounded-[24px] bg-surface-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-[16px] font-semibold">Vouchers são do plano Nióbio 💎</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
              Pra ele valer de verdade na sua página, com código único e controle de estoque, é só ativar o Nióbio.
              Deixamos seu voucher guardado neste aparelho: depois de assinar, volte aqui e toque em Continuar.
            </p>
            <Link href="/admin/planos" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-button-primary py-3 text-[14px] font-medium text-white">
              Assinar Nióbio
            </Link>
            <button onClick={() => setShowUpgrade(false)} className="mt-2 w-full rounded-full py-2 text-[14px] text-text-secondary">
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Lista de vouchers, atrás de um botão que expande: com vários vouchers
          a página ficava enorme e o que importa (criar, painel) sumia. */}
      <div className="flex flex-col gap-3">
        {vouchers.length > 0 && (
          <button
            type="button"
            onClick={() => setListaAberta((v) => !v)}
            aria-expanded={listaAberta}
            className="flex w-full cursor-pointer items-center gap-3 rounded-[22px] border border-divider bg-surface-white p-4 text-left"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[19px]">🎟️</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16.5px] font-bold leading-tight">Seus vouchers</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-text-secondary">
                {vouchers.length} {vouchers.length === 1 ? "voucher criado" : "vouchers criados"}. Toque pra gerenciar e editar.
              </span>
            </span>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft transition-transform ${listaAberta ? "rotate-180" : ""}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </button>
        )}
        {listaAberta && vouchers.map((v) => {
          const restam = v.quantity_total - v.quantity_claimed;
          const pct = v.quantity_total > 0 ? Math.min(100, Math.round((v.quantity_claimed / v.quantity_total) * 100)) : 0;
          const meusResgates = redemptionsByVoucher[v.id] ?? [];
          return (
            <div key={v.id} className="rounded-[24px] border border-divider bg-surface-white p-5">
              <div className="flex items-start gap-3">
                {v.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image_url} alt={v.title} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                ) : (
                  // Sem foto: mini cartão do voucher, com o desconto em
                  // destaque na cor dele. Mais informativo que o emoji.
                  <span className="relative flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl text-white" style={{ background: voucherGradient(v.color) }}>
                    <VoucherLines />
                    <span className="relative text-[9px] font-bold uppercase leading-none opacity-80">
                      {v.discount_type === "percent" ? "%" : "R$"}
                    </span>
                    <span className="relative text-[17px] font-extrabold leading-none">{v.discount_value}</span>
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{v.title}</p>
                  <p className="mt-0.5 text-[14px] text-text-secondary">{discountLabel(v)}</p>
                  {v.badge?.trim() && (
                    <span className="mt-1.5 inline-block rounded-full bg-[#FCE8EC] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#C4143A]">{v.badge}</span>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(v)}
                  className="shrink-0 rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-medium text-text-secondary"
                >
                  <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${v.is_active ? "bg-orbi-gradient-start" : "bg-text-tertiary"}`} />
                  {v.is_active ? "Ativo" : "Pausado"}
                </button>
              </div>

              {v.description?.trim() && (
                <div className="mt-3 rounded-2xl bg-surface-soft px-3.5 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Observação</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">{v.description}</p>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between text-[12px] text-text-tertiary">
                  <span>{v.quantity_claimed} de {v.quantity_total} resgatados</span>
                  <span>{restam > 0 ? `${restam} restantes` : "Esgotado"}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                  <div className="h-full rounded-full orbi-gradient" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <p className="mt-3 text-[12px] text-text-tertiary">
                {v.expires_hours ? `Código vale por ${v.expires_hours % 24 === 0 ? `${v.expires_hours / 24} ${v.expires_hours === 24 ? "dia" : "dias"}` : `${v.expires_hours} horas`} depois do resgate` : "Código sem prazo"}
              </p>

              {/* Quem resgatou, botão bem visível pro painel completo, com nome, WhatsApp e filtros */}
              <Link
                href={`/admin/vouchers/${v.id}`}
                className="relative mt-4 flex items-center justify-center gap-2 overflow-hidden rounded-full py-3 text-[14px] font-semibold text-white"
                style={{ background: CHERRY_GRADIENT, boxShadow: CHERRY_SHADOW }}
              >
                📊 Ver painel completo{meusResgates.length > 0 ? ` (${meusResgates.length})` : ""}
              </Link>

              <button onClick={() => deleteVoucher(v)} className="mt-3 text-[13px] text-red-600">
                Excluir
              </button>
            </div>
          );
        })}

        {vouchers.length === 0 && !creating && (
          <div className="flex flex-col items-center rounded-[24px] border border-dashed border-divider p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft text-[22px]">🎟️</span>
            <p className="mt-3 text-[15px] font-medium">Nenhum voucher ainda</p>
            <p className="mt-1 max-w-[240px] text-[13px] leading-relaxed text-text-tertiary">
              Crie o primeiro voucher aí embaixo, leva menos de um minuto.
            </p>
          </div>
        )}
      </div>

      {temRascunho && (
        <div className="flex items-center gap-3 rounded-[22px] bg-surface-white p-4 ring-1 ring-black/[0.07]">
          <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
            <span className="block font-semibold">{ehSugestao ? "A Orbi deixou um voucher pronto" : "Você tem um voucher guardado"}</span>
            <span className="text-text-secondary">{ehSugestao ? "Pensado pro seu ramo. Revise e publique." : "Continue de onde parou."}</span>
          </span>
          <button type="button" onClick={apagarRascunho} className="text-[12.5px] text-text-tertiary underline">Apagar</button>
          <button type="button" onClick={retomarRascunho} className="rounded-full bg-button-primary px-4 py-2 text-[13px] font-medium text-white">{ehSugestao ? "Ver" : "Continuar"}</button>
        </div>
      )}

      {creating ? (
        <form onSubmit={createVoucher} className="flex flex-col gap-3 rounded-[24px] border border-divider bg-surface-white p-5">
          <p className="text-[15px] font-semibold">Novo voucher</p>
          {!canSave && (
            <p className="rounded-2xl bg-surface-soft px-3.5 py-2.5 text-[12.5px] leading-snug text-text-secondary">
              Pode montar à vontade pra ver como fica. Publicar vouchers é do plano Nióbio, e o que você montar fica guardado.
            </p>
          )}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (ex: 10% na primeira compra)"
            className="rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional"
            rows={2}
            className="resize-none rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
          />

          <div>
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Cor do voucher</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(Object.keys(VOUCHER_THEMES) as VoucherColor[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  className={`relative h-16 overflow-hidden rounded-2xl text-left transition-transform ${color === key ? "ring-2 ring-on-background ring-offset-2 ring-offset-surface-white scale-[1.02]" : ""}`}
                  style={{ background: voucherGradient(key) }}
                  aria-label={VOUCHER_THEMES[key].label}
                >
                  <span className="absolute bottom-1.5 left-2 text-[11px] font-semibold text-white">{VOUCHER_THEMES[key].label}</span>
                  {color === key && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold" style={{ color: VOUCHER_THEMES[key].ctaText }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Etiqueta de destaque (opcional)</p>
            <input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="Ex: Mais usado, Cliente VIP, Aniversário"
              maxLength={24}
              className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[14px] outline-none focus:border-on-background"
            />
            <p className="mt-1 text-[12px] text-text-tertiary">Aparece como um selinho no voucher, na página do visitante.</p>
          </div>

          <div>
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Foto do voucher (opcional)</p>
            <p className="mb-2 mt-1 text-[12px] text-text-tertiary">Fica do lado do desconto, na galeria de vouchers. Uma foto do produto ou do ambiente funciona bem.</p>
            <ImageUpload value={imageUrl} businessId={businessId} lockedRatio="quadrado" promptKind="capa" promptSubject={title || undefined} onChange={setImageUrl} />
          </div>
          <div className="flex gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
              className="rounded-2xl border border-divider bg-surface-white px-3 py-2.5 text-[14px] outline-none"
            >
              <option value="percent">% desconto</option>
              <option value="fixed">R$ desconto</option>
            </select>
            <input
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent" ? "Ex: 10" : "Ex: 15"}
              type="number"
              min="0"
              className="min-w-0 flex-1 rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
            />
          </div>
          <div>
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Quantos vouchers disponíveis</p>
            <input
              value={quantityTotal}
              onChange={(e) => setQuantityTotal(e.target.value)}
              placeholder="Ex: 50"
              type="number"
              min="1"
              className="mt-1.5 w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background"
            />
          </div>
          <div>
            <p className="text-[13px] uppercase tracking-wide text-text-tertiary">Prazo pra usar depois de resgatar</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {VALIDADES.map((v) => (
                <button
                  key={v.rotulo}
                  type="button"
                  onClick={() => setExpiresHours(v.horas)}
                  aria-pressed={expiresHours === v.horas}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${expiresHours === v.horas ? "bg-button-primary text-white" : "bg-surface-soft text-text-secondary"}`}
                >
                  {v.rotulo}
                </button>
              ))}
              {!VALIDADES.some((v) => v.horas === expiresHours) && (
                <span className="rounded-full bg-button-primary px-3.5 py-2 text-[13px] font-medium text-white">
                  {Number(expiresHours) % 24 === 0 ? `${Number(expiresHours) / 24} dias` : `${expiresHours} horas`}
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-text-tertiary">
              Se a pessoa resgatar e não aparecer dentro desse prazo, a vaga volta pro estoque.
            </p>
          </div>
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => setCreating(false)} className="flex-1 rounded-full bg-surface-soft px-4 py-2.5 text-[14px] font-medium">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !discountValue || !quantityTotal}
              className="flex-1 rounded-full bg-button-primary px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-40"
            >
              {saving ? "Criando…" : canSave ? "Criar voucher" : "Criar voucher 💎"}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="orbi-gradient rounded-full px-5 py-3 text-[14px] font-medium text-on-background"
        >
          + Novo voucher
        </button>
      )}
    </div>
  );
}
