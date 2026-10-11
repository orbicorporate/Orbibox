import { voucherGradient, voucherTheme } from "@/lib/voucherThemes";
import { descontoGrande } from "@/lib/voucherDesconto";

type V = {
  title: string;
  description: string | null;
  color: string | null;
  image_url: string | null;
  badge: string | null;
  discount_type: string;
  discount_value: number | null;
  quantity_total: number;
  quantity_claimed: number;
};

/**
 * Cópia fiel do voucher quadrado da galeria de vouchers da página pública,
 * só para olhar (o botão não clica). Mesmas medidas: cada voucher ocupa
 * metade da largura útil da página, uns 190 px.
 */
export function VoucherQuadrado({ v }: { v: V }) {
  const tema = voucherTheme(v.color as never);
  const restam = v.quantity_total - v.quantity_claimed;
  const grande = descontoGrande(v);
  return (
    <div className="relative flex w-[190px] shrink-0 flex-col overflow-hidden rounded-[26px] p-2.5 text-white" style={{ background: voucherGradient(v.color as never), boxShadow: `0 10px 26px ${tema.glow}` }}>
      <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-white/15">
        {v.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.image_url} alt={v.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center">
            <span className="font-[family-name:var(--font-manrope)] text-[34px] font-extrabold leading-none tracking-[-0.02em]">{v.discount_type === "gift" ? "Brinde" : grande}</span>
          </div>
        )}
        {v.image_url && v.discount_type !== "gift" && (
          <span className="absolute right-0 top-0 rounded-bl-[18px] bg-white px-3 py-1.5 text-[15px] font-extrabold leading-none" style={{ color: tema.ctaText }}>{grande}</span>
        )}
        {v.badge?.trim() && (
          <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-white">{v.badge}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug">{v.title}</p>
        {v.description?.trim() && <p className="mt-0.5 line-clamp-1 text-[12px] opacity-80">{v.description}</p>}
        <span className="mt-2 w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[11px]">{restam > 0 ? `${restam} restantes` : "Acabou"}</span>
        <span className="mt-3 inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white py-2.5 text-[13.5px] font-bold" style={{ color: tema.ctaText }}>
          {restam > 0 ? <>Pegar voucher <span aria-hidden>↗</span></> : "Esgotado"}
        </span>
      </div>
    </div>
  );
}
