"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

function impedeRolagem(e: TouchEvent) {
  if (e.cancelable) e.preventDefault();
}

const ESPERA_MS = 350;
const TOLERANCIA_PX = 8;

/**
 * Segurar e arrastar para reordenar, direto na tela (carrossel ou grade).
 * Segura ~0,35 s sem mexer para "pegar"; aí os outros itens abrem espaço
 * enquanto o dedo passa por cima. Ao soltar, grava a ordem nova.
 * Funciona em fila horizontal e em grade (usa o item mais próximo do dedo).
 */
export function useArrastarOrdem(chaves: string[], ativo: boolean, aoSoltar: (novaOrdem: string[]) => void) {
  const [ordemLocal, setOrdemLocal] = useState<{ base: string; lista: string[] } | null>(null);
  const [pegado, setPegado] = useState<string | null>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const ordemRef = useRef<string[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicio = useRef<{ x: number; y: number; id: number } | null>(null);
  const pegadoRef = useRef<string | null>(null);
  const posAnterior = useRef(new Map<string, { x: number; y: number }>());
  const bloqueiaClique = useRef(false);
  const aoSoltarRef = useRef(aoSoltar);
  useEffect(() => { aoSoltarRef.current = aoSoltar; });

  // Se a lista de fora mudar enquanto não se arrasta, vale a de fora.
  const assinatura = chaves.join("|");
  const ordem = ordemLocal && ordemLocal.base === assinatura && ordemLocal.lista.length === chaves.length ? ordemLocal.lista : chaves;


  function limparTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function terminar(confirmar: boolean) {
    limparTimer();
    window.removeEventListener("touchmove", impedeRolagem);
    const final = ordemRef.current;
    const estava = pegadoRef.current;
    pegadoRef.current = null;
    inicio.current = null;
    setPegado(null);
    if (estava) {
      bloqueiaClique.current = true;
      setTimeout(() => { bloqueiaClique.current = false; }, 350);
      if (confirmar && final && final.some((k, i) => k !== chaves[i])) aoSoltarRef.current(final);
    }
    ordemRef.current = null;
    // Mantém a ordem local até a de fora chegar, pra não dar "pulo" na volta.
  }

  useEffect(() => () => { limparTimer(); window.removeEventListener("touchmove", impedeRolagem); }, []);

  // Anima (FLIP) os itens que mudaram de lugar. Mede por offset, então rolar
  // o carrossel não conta como movimento.
  useLayoutEffect(() => {
    const novas = new Map<string, { x: number; y: number }>();
    els.current.forEach((el, k) => novas.set(k, { x: el.offsetLeft, y: el.offsetTop }));
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      novas.forEach((p, k) => {
        const antes = posAnterior.current.get(k);
        const el = els.current.get(k);
        if (!antes || !el || k === pegadoRef.current) return;
        const dx = antes.x - p.x;
        const dy = antes.y - p.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
        }
      });
    }
    posAnterior.current = novas;
  });

  function pegar(chave: string, alvo: HTMLElement, pointerId: number) {
    pegadoRef.current = chave;
    ordemRef.current = [...ordem];
    setOrdemLocal({ base: assinatura, lista: [...ordem] });
    setPegado(chave);
    try { alvo.setPointerCapture(pointerId); } catch { /* sem captura, segue pelo movimento */ }
    window.addEventListener("touchmove", impedeRolagem, { passive: false });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
  }

  function aoMover(x: number, y: number) {
    const atual = pegadoRef.current;
    const lista = ordemRef.current;
    if (!atual || !lista) return;
    // Rolagem automática quando o dedo chega perto da borda do carrossel.
    const el = els.current.get(atual);
    const rolavel = el?.closest<HTMLElement>("[data-rolavel]");
    if (rolavel) {
      const r = rolavel.getBoundingClientRect();
      if (x < r.left + 44) rolavel.scrollLeft -= 10;
      else if (x > r.right - 44) rolavel.scrollLeft += 10;
    }
    let melhor: string | null = null;
    let dist = Infinity;
    for (const k of lista) {
      const e = els.current.get(k);
      if (!e) continue;
      const r = e.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < dist) { dist = d; melhor = k; }
    }
    if (!melhor || melhor === atual) return;
    const de = lista.indexOf(atual);
    const para = lista.indexOf(melhor);
    const nova = [...lista];
    nova.splice(de, 1);
    nova.splice(para, 0, atual);
    ordemRef.current = nova;
    setOrdemLocal({ base: assinatura, lista: nova });
  }

  const ref = useCallback((chave: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(chave, el);
    else els.current.delete(chave);
  }, []);

  /** Props pra espalhar no elemento de cada item. */
  function props(chave: string, pode = true) {
    if (!ativo || !pode) return {};
    return {
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const alvo = e.currentTarget;
        inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        limparTimer();
        timer.current = setTimeout(() => pegar(chave, alvo, e.pointerId), ESPERA_MS);
      },
      onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
        if (pegadoRef.current) { aoMover(e.clientX, e.clientY); return; }
        const i = inicio.current;
        if (i && Math.hypot(e.clientX - i.x, e.clientY - i.y) > TOLERANCIA_PX) limparTimer();
      },
      onPointerUp: () => terminar(true),
      onPointerCancel: () => terminar(false),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onClickCapture: (e: React.MouseEvent) => {
        if (bloqueiaClique.current || pegadoRef.current) { e.preventDefault(); e.stopPropagation(); }
      },
      draggable: false,
      style: { WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", touchAction: "pan-x pan-y" } as React.CSSProperties,
    };
  }

  return { ordem, pegado, ref, props };
}
