"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { aoSalvar } from "./AvisoSalvar";

/**
 * Atalho "Ver como ficou" nas telas onde a pessoa edita algo que aparece na
 * página pública. Ele sabe onde está: dentro de um voucher abre direto aquele
 * voucher na página; nas outras abre a página. Depois de cada salvamento ele
 * ganha destaque por alguns segundos, que é quando a pessoa quer conferir.
 */
export function VerComoFicou({ slug }: { slug: string }) {
  const caminho = usePathname() ?? "";
  const [destaque, setDestaque] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sair = aoSalvar(() => {
      setDestaque(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDestaque(false), 7000);
    });
    return () => {
      sair();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const voucher = caminho.match(/^\/admin\/vouchers\/([0-9a-f-]{36})/)?.[1];
  const rotulo = voucher ? "Ver este voucher na página" : "Ver como ficou";
  const edita = voucher || /^\/admin\/(vouchers|vitrine|cardapio|delivery|gift|rede)(\/|$)/.test(caminho);
  if (!edita) return null;

  return (
    <a
      href={voucher ? `/${slug}?v=${voucher}` : `/${slug}`}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium shadow-[0_1px_6px_rgba(17,19,24,0.1)] ring-1 ring-black/[0.05] backdrop-blur transition-all duration-300 ${destaque ? "bg-on-background text-white" : "bg-surface-white/80 text-text-secondary"}`}
    >
      {rotulo}
      <span aria-hidden>↗</span>
    </a>
  );
}
