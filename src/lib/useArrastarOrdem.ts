"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Segurar e arrastar para mudar a ordem de uma lista (de itens, pratos...).
 *
 * Uso:
 *   const arrastar = useArrastarOrdem(ids, (novaOrdem) => salvar(novaOrdem), "grupo");
 *   const ordenados = arrastar.ordenar(itens, (i) => i.id);
 *   <li {...arrastar.alvo(id)} {...arrastar.alca(id)} className={arrastar.arrastando === id ? "..." : ""}>
 *
 * - Segura ~0,4 s sem mexer: o item "levanta" (vibra de leve) e passa a seguir o dedo.
 * - Se o dedo se mexer antes disso, é só rolagem normal da tela.
 * - A ordem só é gravada ao soltar (onReordenar é chamado uma vez).
 * - `grupo` impede soltar um item numa lista diferente da dele.
 */
export function useArrastarOrdem(ids: string[], onReordenar: (novaOrdem: string[]) => void, grupo = "g") {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [local, setLocal] = useState<string[] | null>(null);
  const localRef = useRef<string[] | null>(null);
  const ativoRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  const ultimoToque = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const acabouDeArrastar = useRef(0);
  const raf = useRef<number | null>(null);
  const idsRef = useRef(ids);
  const cbRef = useRef(onReordenar);
  useEffect(() => {
    idsRef.current = ids;
    cbRef.current = onReordenar;
  });

  // Enquanto arrasta, a tela não pode rolar com o dedo (iOS só aceita isso com listener não passivo).
  useEffect(() => {
    const bloquear = (e: TouchEvent) => {
      if (ativoRef.current && e.cancelable) e.preventDefault();
    };
    window.addEventListener("touchmove", bloquear, { passive: false });
    return () => window.removeEventListener("touchmove", bloquear);
  }, []);

  const paraArrasto = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    inicio.current = null;
  }, []);

  const rolarPai = useCallback((elemento: Element | null, dy: number) => {
    let el: Element | null = elemento;
    while (el && el !== document.body) {
      const estilo = getComputedStyle(el);
      if (/(auto|scroll)/.test(estilo.overflowY) && el.scrollHeight > el.clientHeight) {
        (el as HTMLElement).scrollTop += dy;
        return;
      }
      el = el.parentElement;
    }
    window.scrollBy(0, dy);
  }, []);

  const terminar = useCallback(() => {
    paraArrasto();
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    const estava = ativoRef.current;
    ativoRef.current = null;
    setArrastando(null);
    if (estava) {
      acabouDeArrastar.current = Date.now();
      const nova = localRef.current;
      if (nova && nova.join("|") !== idsRef.current.join("|")) cbRef.current(nova);
    }
    localRef.current = null;
    setLocal(null);
    window.removeEventListener("pointermove", aoMover);
    window.removeEventListener("pointerup", terminar);
    window.removeEventListener("pointercancel", terminar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aoMover(e: PointerEvent) {
    ultimoToque.current = { x: e.clientX, y: e.clientY };
    const id = ativoRef.current;
    if (!id) {
      // Antes de levantar: se o dedo andou, era rolagem. Cancela.
      const i = inicio.current;
      if (i && Math.hypot(e.clientX - i.x, e.clientY - i.y) > 10) {
        paraArrasto();
        window.removeEventListener("pointermove", aoMover);
        window.removeEventListener("pointerup", terminar);
        window.removeEventListener("pointercancel", terminar);
      }
      return;
    }
    const sob = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-arrastar-id]");
    if (sob && sob.dataset.arrastarGrupo === grupoAtual.current && sob.dataset.arrastarId && sob.dataset.arrastarId !== id) {
      const base = localRef.current ?? idsRef.current;
      const de = base.indexOf(id);
      const para = base.indexOf(sob.dataset.arrastarId);
      if (de >= 0 && para >= 0 && de !== para) {
        const c = [...base];
        c.splice(de, 1);
        c.splice(para, 0, id);
        localRef.current = c;
        setLocal(c);
      }
    }
  }
  const grupoAtual = useRef(grupo);
  const grupoPadrao = useRef(grupo);
  useEffect(() => {
    grupoPadrao.current = grupo;
  });

  // Rola a área quando o dedo chega perto da borda de cima ou de baixo.
  const rolarSePerto = useCallback(() => {
    if (!ativoRef.current) return;
    const { x, y } = ultimoToque.current;
    const h = window.innerHeight;
    const alvo = document.elementFromPoint(x, y);
    if (y < 150) rolarPai(alvo, -10);
    else if (y > h - 110) rolarPai(alvo, 10);
    raf.current = requestAnimationFrame(rolarSePerto);
  }, [rolarPai]);

  const alca = useCallback(
    (id: string, grupoDoItem?: string) => ({
      onPointerDown: (e: ReactPointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        // Em campos de texto, botões de ação e links não começa arrasto.
        if ((e.target as HTMLElement).closest("input, textarea, select, a, [data-sem-arrastar]")) return;
        paraArrasto();
        inicio.current = { x: e.clientX, y: e.clientY };
        ultimoToque.current = { x: e.clientX, y: e.clientY };
        window.addEventListener("pointermove", aoMover);
        window.addEventListener("pointerup", terminar);
        window.addEventListener("pointercancel", terminar);
        timer.current = setTimeout(() => {
          timer.current = null;
          ativoRef.current = id;
          grupoAtual.current = grupoDoItem ?? grupoPadrao.current;
          localRef.current = [...idsRef.current];
          setLocal([...idsRef.current]);
          setArrastando(id);
          try { navigator.vibrate?.(12); } catch { /* sem vibração */ }
          raf.current = requestAnimationFrame(rolarSePerto);
        }, 380);
      },
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
      onClickCapture: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
        // O toque que termina um arrasto não pode abrir o item.
        if (Date.now() - acabouDeArrastar.current < 350) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      style: { WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" } as const,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const alvo = useCallback((id: string, grupoDoItem?: string) => ({ "data-arrastar-id": id, "data-arrastar-grupo": grupoDoItem ?? grupo }), [grupo]);

  function ordenar<T>(itens: T[], getId: (i: T) => string): T[] {
    if (!local) return itens;
    const mapa = new Map(itens.map((i) => [getId(i), i]));
    const out = local.map((id) => mapa.get(id)).filter((i): i is T => i !== undefined);
    return out.length === itens.length ? out : itens;
  }

  return { arrastando, alca, alvo, ordenar };
}
