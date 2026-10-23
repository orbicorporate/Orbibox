"use client";

import { origemPublica } from "@/lib/appUrl";
import { linkWhatsAviso, type GiftParaAviso } from "@/lib/giftAviso";

/** Depois de liberar: o próximo passo é avisar quem comprou, com link e código. */
export function AvisoGiftLiberado({ gift, negocio, aoFechar }: { gift: GiftParaAviso; negocio: string; aoFechar: () => void }) {
  const origin = typeof window !== "undefined" ? origemPublica() : "";
  const href = linkWhatsAviso(gift, negocio, origin);
  const quem = gift.from_name || "quem comprou";
  return (
    <div className="rounded-[22px] bg-surface-white p-4 ring-1 ring-divider" aria-live="polite">
      <p className="text-[15.5px] font-medium leading-snug">Gift liberado. Agora avise {quem}.</p>
      <ol className="mt-2.5 space-y-1.5 text-[13.5px] leading-snug text-text-secondary">
        <li>1. Você manda o link e o código {gift.code} para {quem}.</li>
        <li>2. {quem === "quem comprou" ? "Quem comprou" : quem} envia o link para {gift.to_name || "quem vai ganhar"}.</li>
        <li>3. Na hora de usar, {gift.to_name || "a pessoa"} mostra a tela ao garçom, e você dá baixa no código.</li>
      </ol>
      <div className="mt-3 flex gap-2">
        <a href={href} target="_blank" rel="noreferrer" onClick={() => setTimeout(aoFechar, 400)} className="flex min-h-[42px] flex-1 items-center justify-center rounded-full bg-[#1F9E4C] text-[14px] font-medium text-white transition-transform active:scale-[.98]">
          Enviar link e código no WhatsApp
        </a>
        <button type="button" onClick={aoFechar} className="min-h-[42px] rounded-full bg-surface-soft px-5 text-[14px] text-text-secondary">Depois</button>
      </div>
    </div>
  );
}
