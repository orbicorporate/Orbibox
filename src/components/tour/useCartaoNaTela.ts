"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

type Rect = { top: number; left: number; width: number; height: number };

const MARGEM = 12;

/**
 * Posiciona o cartão de um guia sem nunca deixá-lo cortado ou escondido, em
 * qualquer tamanho de celular: mede a altura real do cartão, coloca embaixo
 * do alvo se couber, senão em cima, senão cola na borda visível. Se o texto
 * for maior que a tela, o cartão rola por dentro (botões sempre alcançáveis).
 */
export function useCartaoNaTela(rect: Rect | null, centralizar = false, folga = 16) {
  const [altura, setAltura] = useState(0);
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 800 : window.visualViewport?.height ?? window.innerHeight));
  const elRef = useRef<HTMLDivElement | null>(null);

  const ref = useCallback((el: HTMLDivElement | null) => {
    elRef.current = el;
    if (el) setAltura(el.offsetHeight);
  }, []);

  useLayoutEffect(() => {
    const el = elRef.current;
    const medir = () => {
      setVh(window.visualViewport?.height ?? window.innerHeight);
      if (elRef.current) setAltura(elRef.current.offsetHeight);
    };
    medir();
    const ro = el ? new ResizeObserver(medir) : null;
    if (el) ro?.observe(el);
    window.addEventListener("resize", medir);
    window.visualViewport?.addEventListener("resize", medir);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", medir);
      window.visualViewport?.removeEventListener("resize", medir);
    };
  });

  const maxAltura = `${Math.max(vh - MARGEM * 2, 200)}px`;
  const base: CSSProperties = { left: "50%", maxHeight: maxAltura, overflowY: "auto", overscrollBehavior: "contain" };

  if (!rect || centralizar || altura === 0) {
    return { ref, style: { ...base, top: "50%", transform: "translate(-50%, -50%)" } as CSSProperties };
  }

  const abaixo = rect.top + rect.height + folga;
  const acima = rect.top - folga - altura;
  let top: number;
  if (abaixo + altura <= vh - MARGEM) top = abaixo;
  else if (acima >= MARGEM) top = acima;
  else top = vh - altura - MARGEM;
  top = Math.max(MARGEM, Math.min(top, vh - Math.min(altura, vh - MARGEM * 2) - MARGEM));
  return { ref, style: { ...base, top, transform: "translateX(-50%)" } as CSSProperties };
}
