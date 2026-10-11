"use client";

/**
 * Faixa que diz com todas as letras se o voucher está aparecendo na página
 * pública. Antes isso era uma bolinha "Ativo/Pausado" escondida no canto, e a
 * pessoa não entendia por que o voucher não aparecia pros clientes.
 */
export function FaixaStatusVoucher({ ativo, onAlternar, className = "" }: { ativo: boolean; onAlternar: () => void; className?: string }) {
  return ativo ? (
    <div className={`flex items-center gap-3 rounded-[20px] bg-[#DEF3E3] px-4 py-3 ${className}`}>
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#1F9E4C]" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[#14733A]">No ar na sua página</p>
        <p className="text-[12px] leading-snug text-[#14733A]/80">Seus clientes já podem pegar este voucher.</p>
      </div>
      <button type="button" onClick={onAlternar} className="min-h-[40px] shrink-0 rounded-full bg-white px-4 text-[13px] font-semibold text-[#14733A]">Pausar</button>
    </div>
  ) : (
    <div className={`flex items-center gap-3 rounded-[20px] bg-[#FDEEDF] px-4 py-3 ring-1 ring-[#C2650A]/25 ${className}`}>
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#C2650A]" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-[#9A4F06]">Pausado, não aparece na sua página</p>
        <p className="text-[12px] leading-snug text-[#9A4F06]/85">Ninguém consegue pegar até você ativar.</p>
      </div>
      <button type="button" onClick={onAlternar} className="min-h-[40px] shrink-0 rounded-full bg-on-background px-4 text-[13px] font-semibold text-white">Ativar</button>
    </div>
  );
}
