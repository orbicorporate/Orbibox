"use client";

import Link from "next/link";

/** Fora da impressão: salvar como PDF (pela impressão do aparelho) e voltar ao painel. */
export function BotoesPdf() {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="min-h-[46px] rounded-full bg-[#111318] px-6 text-[15px] font-medium text-white active:scale-[0.98]">
        Salvar em PDF
      </button>
      <Link href="/admin/pulse" className="flex min-h-[46px] items-center rounded-full border border-black/10 px-6 text-[15px] text-[#5C6066]">
        Voltar
      </Link>
      <p className="basis-full text-[12.5px] leading-snug text-[#5C6066]">Na janela que abrir, escolha “Salvar como PDF” (no celular, “Imprimir” e depois compartilhar o arquivo).</p>
    </div>
  );
}
