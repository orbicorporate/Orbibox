"use client";

import { useTravarRolagem } from "@/hooks/useTravarRolagem";
import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { conferirSalvo } from "@/components/ui/AvisoSalvar";
import { VOUCHER_THEMES, voucherGradient, type VoucherColor } from "@/lib/voucherThemes";
import type { Database } from "@/lib/supabase/types";
import { PrazoVoucher } from "../PrazoVoucher";
import { SeletorDesconto } from "../SeletorDesconto";
import { VoucherQuadrado } from "@/components/mobile/VoucherQuadrado";

type Voucher = Database["public"]["Tables"]["vouchers"]["Row"];

/**
 * Folha para editar o voucher depois de criado. O desconto trava assim que
 * alguém resgata (mudaria o que essa pessoa tem na mão); a quantidade nunca
 * fica menor do que a de quem já pegou.
 */
export function EditarVoucherSheet({ voucher, travado, onSalvo, onFechar }: { voucher: Voucher; travado: boolean; onSalvo: (v: Voucher) => void; onFechar: () => void }) {
  useTravarRolagem();
  const supabase = createClient();
  const [title, setTitle] = useState(voucher.title);
  const [description, setDescription] = useState(voucher.description ?? "");
  const [color, setColor] = useState<VoucherColor>((voucher.color as VoucherColor) ?? "cherry");
  const [badge, setBadge] = useState(voucher.badge ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(voucher.image_url);
  const [discountType, setDiscountType] = useState(voucher.discount_type as "percent" | "fixed" | "gift");
  const [discountValue, setDiscountValue] = useState(String(voucher.discount_value ?? ""));
  const [quantityTotal, setQuantityTotal] = useState(String(voucher.quantity_total));
  const [expiresHours, setExpiresHours] = useState(voucher.expires_hours ? String(voucher.expires_hours) : "");
  const [mostrarDesconto, setMostrarDesconto] = useState(voucher.show_discount !== false);
  const [apenasFas, setApenasFas] = useState(voucher.apenas_fas === true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (salvando) return;
    const qtd = Number(quantityTotal);
    if (!title.trim()) return setErro("Dê um título ao voucher.");
    if (!qtd || qtd < 1) return setErro("Informe a quantidade disponível.");
    if (qtd < voucher.quantity_claimed) return setErro(`Já foram resgatados ${voucher.quantity_claimed}. A quantidade não pode ser menor que isso.`);
    if (!travado && discountType !== "gift" && (!discountValue || Number(discountValue) <= 0)) return setErro("Informe o valor do desconto.");
    setErro(null);
    setSalvando(true);
    const campos: Partial<Voucher> = {
      title: title.trim(),
      description: description.trim() || null,
      color,
      badge: badge.trim() || null,
      image_url: imageUrl,
      quantity_total: qtd,
      expires_hours: expiresHours.trim() ? Number(expiresHours) : null,
      show_discount: mostrarDesconto,
      apenas_fas: apenasFas,
      sugerido: false,
    };
    if (!travado) {
      campos.discount_type = discountType;
      campos.discount_value = discountType === "gift" ? 0 : Number(discountValue);
    }
    const res = await supabase.from("vouchers").update(campos).eq("id", voucher.id).select().single();
    setSalvando(false);
    if (!conferirSalvo(res) || !res.data) return setErro("Não consegui salvar. Tente de novo.");
    onSalvo(res.data as Voucher);
  }

  const rotulo = "text-[12.5px] font-semibold uppercase tracking-wide text-text-tertiary";
  const campo = "w-full rounded-2xl border border-divider bg-surface-white px-4 py-2.5 text-[15px] outline-none focus:border-on-background";

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center" onClick={onFechar}>
      <div className="flex max-h-[92dvh] overscroll-contain w-full max-w-lg flex-col rounded-t-[28px] bg-surface-white sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <p className="font-[family-name:var(--font-manrope)] text-[18px] font-semibold">Editar voucher</p>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-[14px]">✕</button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-2">
          <div>
            <p className={rotulo}>Título</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${campo} mt-1.5`} />
          </div>
          <div>
            <p className={rotulo}>Descrição</p>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Opcional" className={`${campo} mt-1.5 resize-none text-[14px]`} />
          </div>

          <div>
            <p className={rotulo}>Foto do voucher</p>
            <p className="mb-2 mt-1 text-[12px] text-text-tertiary">Fica do lado do desconto no cartão da sua página.</p>
            <ImageUpload value={imageUrl} businessId={voucher.business_id} lockedRatio="quadrado" promptKind="capa" promptSubject={title} onChange={setImageUrl} />
          </div>

          <div>
            <p className={rotulo}>Cor</p>
            <div className="mt-2 flex flex-col items-center rounded-[22px] bg-surface-soft px-4 py-4">
              <VoucherQuadrado
                v={{
                  title: title.trim() || "Título do voucher",
                  description,
                  color,
                  image_url: imageUrl,
                  badge,
                  discount_type: discountType,
                  discount_value: Number(discountValue) || 0,
                  quantity_total: Number(quantityTotal) || voucher.quantity_total,
                  quantity_claimed: voucher.quantity_claimed,
                  show_discount: mostrarDesconto,
                }}
              />
              <p className="mt-3 text-[12px] text-text-tertiary">Assim ele aparece na sua página. Toque numa cor para trocar.</p>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(Object.keys(VOUCHER_THEMES) as VoucherColor[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  aria-label={VOUCHER_THEMES[key].label}
                  className={`relative h-14 overflow-hidden rounded-2xl text-left ${color === key ? "ring-2 ring-on-background ring-offset-2 ring-offset-surface-white" : ""}`}
                  style={{ background: voucherGradient(key) }}
                >
                  <span className="absolute bottom-1.5 left-2 text-[11px] font-semibold text-white">{VOUCHER_THEMES[key].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={rotulo}>Etiqueta de destaque</p>
            <input value={badge} onChange={(e) => setBadge(e.target.value)} maxLength={24} placeholder="Ex: Mais usado, Cliente VIP" className={`${campo} mt-1.5 text-[14px]`} />
          </div>

          <div>
            <p className={rotulo}>Desconto</p>
            {travado ? (
              <p className="mt-1.5 rounded-2xl bg-surface-soft px-4 py-3 text-[13px] leading-snug text-text-secondary">
                O desconto não muda depois que alguém resgata, porque mudaria o que essa pessoa já tem na mão. Para um desconto diferente, crie outro voucher.
              </p>
            ) : (
              <div className="mt-1.5">
                <SeletorDesconto tipo={discountType} valor={discountValue} onTipo={setDiscountType} onValor={setDiscountValue} />
              </div>
            )}
          </div>

          {discountType !== "gift" && (
            <div className="flex items-center gap-3 rounded-2xl bg-surface-soft px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">Mostrar o desconto no voucher</p>
                <p className="mt-0.5 text-[12px] leading-snug text-text-tertiary">Desligado, o selo com a porcentagem ou o valor não aparece no cartão nem na capa do link.</p>
              </div>
              <button type="button" role="switch" aria-checked={mostrarDesconto} onClick={() => setMostrarDesconto((m) => !m)} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${mostrarDesconto ? "bg-on-background" : "bg-divider"}`}>
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${mostrarDesconto ? "left-7" : "left-1"}`} />
                <span className="sr-only">{mostrarDesconto ? "Ligado" : "Desligado"}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl bg-surface-soft px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium">Só para fãs</p>
              <p className="mt-0.5 text-[12px] leading-snug text-text-tertiary">Quem ainda não é fã da sua marca vê o voucher com cadeado e só pega depois de virar fã.</p>
            </div>
            <button type="button" role="switch" aria-checked={apenasFas} onClick={() => setApenasFas((m) => !m)} className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${apenasFas ? "bg-on-background" : "bg-divider"}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${apenasFas ? "left-7" : "left-1"}`} />
              <span className="sr-only">{apenasFas ? "Ligado" : "Desligado"}</span>
            </button>
          </div>

          <div>
            <p className={rotulo}>Quantos vouchers disponíveis</p>
            <input value={quantityTotal} onChange={(e) => setQuantityTotal(e.target.value)} type="number" min={Math.max(1, voucher.quantity_claimed)} inputMode="numeric" className={`${campo} mt-1.5`} />
            {voucher.quantity_claimed > 0 && <p className="mt-1 text-[12px] text-text-tertiary">Já resgataram {voucher.quantity_claimed}. Pode aumentar, mas não ficar abaixo disso.</p>}
          </div>

          <div>
            <p className={rotulo}>Prazo pra usar depois de resgatar</p>
            <PrazoVoucher horas={expiresHours} onChange={setExpiresHours} />
            <p className="mt-1 text-[12px] text-text-tertiary">Vale para quem resgatar daqui para frente.</p>
          </div>
        </div>

        <div className="border-t border-divider px-5 pb-5 pt-3">
          {erro && <p role="alert" className="mb-2 text-[13px] text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onFechar} className="min-h-[48px] flex-1 rounded-full bg-surface-soft text-[14px] font-medium">Cancelar</button>
            <button type="button" onClick={salvar} disabled={salvando} className="min-h-[48px] flex-1 rounded-full bg-button-primary text-[14px] font-medium text-white disabled:opacity-40">{salvando ? "Salvando…" : "Salvar alterações"}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
