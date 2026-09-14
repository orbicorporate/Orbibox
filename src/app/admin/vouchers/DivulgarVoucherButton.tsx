"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { VoucherPlanoOrbi } from "./VoucherPlanoOrbi";

type VoucherSimples = { id: string; title: string };

/**
 * Atalho pro plano de divulgação a partir da lista de vouchers. O plano em
 * si é por voucher (ele usa o desconto, o estoque e a validade pra escrever
 * os textos), então com mais de um a gente pergunta qual antes de abrir.
 */
export function DivulgarVoucherButton({ vouchers, orbiColors }: { vouchers: VoucherSimples[]; orbiColors?: string[] | null }) {
  const [escolhendo, setEscolhendo] = useState(false);
  const [escolhido, setEscolhido] = useState<VoucherSimples | null>(
    vouchers.length === 1 ? vouchers[0] : null,
  );

  if (vouchers.length === 0) return null;

  return (
    <>
      {/* Com um voucher só, escolhido já vem preenchido e o card do plano
          aparece direto, sem passar pela pergunta. */}
      {escolhido ? (
        <VoucherPlanoOrbi
          key={escolhido.id}
          voucherId={escolhido.id}
          voucherTitulo={escolhido.title}
          orbiColors={orbiColors}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEscolhendo(true)}
          className="orbi-card-light relative mt-4 flex w-full cursor-pointer items-center gap-3.5 overflow-hidden rounded-[24px] p-5 text-left"
        >
          <span className="orbi-gradient relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[19px] text-on-background">✦</span>
          <span className="relative min-w-0 flex-1">
            <span className="block font-[family-name:var(--font-manrope)] text-[17px] font-semibold leading-tight">
              Como divulgar meus vouchers
            </span>
            <span className="mt-1 block text-[13px] leading-snug text-text-secondary">
              A Orbi monta o plano: onde postar, quando, e o texto pronto pra copiar.
            </span>
          </span>
          <span className="relative shrink-0 text-text-tertiary">→</span>
        </button>
      )}

      {escolhendo && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end bg-on-background/50 backdrop-blur-sm"
          onClick={() => setEscolhendo(false)}
        >
          <div
            className="mx-auto max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-t-[28px] bg-background-main px-5 pb-8 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-divider" />
            <p className="font-[family-name:var(--font-manrope)] text-[20px] font-semibold tracking-[-0.01em]">
              Divulgar qual voucher?
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">
              O plano é feito sob medida pra cada um, usando o desconto, o estoque e a validade.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {vouchers.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setEscolhido(v); setEscolhendo(false); }}
                  className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-divider bg-surface-white px-4 py-3.5 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[16px]">🎟️</span>
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{v.title}</span>
                  <span className="shrink-0 text-text-tertiary">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
